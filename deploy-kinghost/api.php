<?php
/**
 * NEXUS GRB - servidor de dados compartilhado
 *
 * Guarda o estado do sistema num arquivo JSON para que TODOS os usuarios vejam
 * os mesmos numeros. Sem banco de dados: roda em qualquer hospedagem com PHP.
 *
 * Regras que sustentam a integridade dos dados:
 *  - flock() em todo acesso: duas pessoas gravando ao mesmo tempo nao se atropelam;
 *  - escrita atomica (arquivo temporario + rename): uma queda no meio da gravacao
 *    nao deixa o estado pela metade;
 *  - versao incremental: quem gravar em cima de uma versao velha recebe 409 e o
 *    sistema avisa, em vez de apagar em silencio o trabalho do outro;
 *  - historico rotativo: as ultimas gravacoes ficam guardadas para recuperacao.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

const HIST_MAX   = 40;                  // quantas versoes anteriores manter
const LIMITE_MB  = 24;                  // tamanho maximo aceito numa gravacao

// Os dados sao gravados com extensao .php e a primeira linha "<?php exit;".
// Assim, mesmo que o .htaccess falhe ou o servidor seja trocado, quem pedir o
// arquivo direto no navegador recebe uma pagina vazia, nunca os numeros.
const GUARDA = "<?php exit; /* NEXUS GRB - dados do sistema */ ?>\n";

$DIR  = __DIR__ . '/dados';
$ARQ  = $DIR . '/estado.php';
$ANTIGO = $DIR . '/estado.json';        // instalacoes anteriores
$LOCK = $DIR . '/estado.lock';
$HIST = $DIR . '/historico';

function responde(int $codigo, array $corpo): never {
    http_response_code($codigo);
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Quem esta gravando, segundo a senha de pasta do servidor (.htaccess). */
function quem(): string {
    foreach (['PHP_AUTH_USER', 'REMOTE_USER', 'REDIRECT_REMOTE_USER'] as $k) {
        if (!empty($_SERVER[$k])) return mb_substr((string) $_SERVER[$k], 0, 60);
    }
    return 'sem identificacao';
}

/** Prepara a pasta de dados e a fecha para o mundo (o PHP continua lendo). */
function preparaPasta(string $dir, string $hist): void {
    foreach ([$dir, $hist] as $d) {
        if (!is_dir($d) && !@mkdir($d, 0775, true) && !is_dir($d)) {
            responde(500, ['erro' => 'Nao consegui criar a pasta de dados. Confira a permissao de escrita em ' . basename($d) . '.']);
        }
    }
    $ht = $dir . '/.htaccess';
    if (!is_file($ht)) {
        @file_put_contents($ht, "# Os dados so podem ser lidos pelo api.php, nunca pelo navegador\nRequire all denied\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
    }
}

function estadoVazio(): array {
    return ['versao' => 0, 'atualizadoEm' => null, 'atualizadoPor' => null, 'dados' => new stdClass()];
}

function leEstado(string $arq, string $antigo = ''): array {
    $alvo = is_file($arq) ? $arq : ($antigo !== '' && is_file($antigo) ? $antigo : '');
    if ($alvo === '') return estadoVazio();
    $txt = @file_get_contents($alvo);
    if ($txt === false || $txt === '') return estadoVazio();
    if (str_starts_with($txt, '<?php')) {          // remove a linha de guarda
        $q = strpos($txt, "\n");
        $txt = $q === false ? '' : substr($txt, $q + 1);
    }
    $j = json_decode($txt, true);
    if (!is_array($j) || !isset($j['versao'])) return estadoVazio();
    return $j;
}

/** Grava sem risco de arquivo pela metade: escreve ao lado e so entao substitui. */
function gravaAtomico(string $arq, string $conteudo): bool {
    $tmp = $arq . '.tmp' . getmypid();
    if (@file_put_contents($tmp, $conteudo, LOCK_EX) === false) return false;
    if (!@rename($tmp, $arq)) { @unlink($tmp); return false; }
    return true;
}

function rotacionaHistorico(string $hist, string $conteudo, int $versao): void {
    @file_put_contents(sprintf('%s/estado-%s-v%06d.php', $hist, date('Ymd-His'), $versao), GUARDA . $conteudo);
    $arqs = array_merge(glob($hist . '/estado-*.php') ?: [], glob($hist . '/estado-*.json') ?: []);
    if (count($arqs) > HIST_MAX) {
        sort($arqs);
        foreach (array_slice($arqs, 0, count($arqs) - HIST_MAX) as $velho) @unlink($velho);
    }
}

preparaPasta($DIR, $HIST);
$acao = isset($_GET['acao']) ? (string) $_GET['acao'] : 'estado';

/* ---- ping: o sistema usa para saber se ha servidor (se nao houver, roda sozinho) ---- */
if ($acao === 'ping') {
    responde(200, ['ok' => true, 'sistema' => 'NEXUS GRB', 'php' => PHP_VERSION, 'usuario' => quem()]);
}

/* ---- versao: consulta barata, usada para perceber que alguem gravou ---- */
if ($acao === 'versao') {
    $e = leEstado($ARQ, $ANTIGO);
    responde(200, ['versao' => (int) $e['versao'], 'atualizadoEm' => $e['atualizadoEm'], 'atualizadoPor' => $e['atualizadoPor']]);
}

/* ---- estado: o pacote completo ---- */
if ($acao === 'estado') {
    $e = leEstado($ARQ, $ANTIGO);
    responde(200, $e);
}

/* ---- gravar ---- */
if ($acao === 'gravar') {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        responde(405, ['erro' => 'Use POST para gravar.']);
    }
    // Gravacao so pode partir da propria pagina do sistema. Sem esta checagem, um site
    // qualquer aberto no navegador de quem tem acesso poderia mandar gravar por baixo.
    $origem = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origem !== '') {
        $host = $_SERVER['HTTP_HOST'] ?? '';
        $ok = false;
        foreach (['https://' . $host, 'http://' . $host] as $permitido) {
            if (strcasecmp($origem, $permitido) === 0) { $ok = true; break; }
        }
        if (!$ok) responde(403, ['erro' => 'Gravacao permitida apenas a partir do proprio sistema.']);
    }
    $bruto = file_get_contents('php://input');
    if ($bruto === false || $bruto === '') responde(400, ['erro' => 'Nada recebido.']);
    if (strlen($bruto) > LIMITE_MB * 1024 * 1024) {
        responde(413, ['erro' => 'Pacote maior que ' . LIMITE_MB . ' MB.']);
    }
    $req = json_decode($bruto, true);
    if (!is_array($req) || !isset($req['dados']) || !is_array($req['dados'])) {
        responde(400, ['erro' => 'Formato invalido: esperava { baseVersao, dados }.']);
    }

    $fp = @fopen($LOCK, 'c');
    if (!$fp) responde(500, ['erro' => 'Nao consegui abrir a trava de gravacao.']);
    if (!flock($fp, LOCK_EX)) { fclose($fp); responde(503, ['erro' => 'Servidor ocupado, tente de novo.']); }

    try {
        $atual = leEstado($ARQ, $ANTIGO);
        $versaoAtual = (int) $atual['versao'];
        $base = isset($req['baseVersao']) ? (int) $req['baseVersao'] : -1;
        $forcar = !empty($req['forcar']);

        // Outra pessoa gravou depois que este navegador carregou: nao sobrescreve calado.
        if (!$forcar && $base >= 0 && $base !== $versaoAtual) {
            responde(409, [
                'erro' => 'conflito',
                'versao' => $versaoAtual,
                'atualizadoEm' => $atual['atualizadoEm'],
                'atualizadoPor' => $atual['atualizadoPor'],
                'mensagem' => 'Outra pessoa salvou enquanto voce trabalhava.',
            ]);
        }

        $novo = [
            'versao'        => $versaoAtual + 1,
            'atualizadoEm'  => date('c'),
            'atualizadoPor' => quem(),
            'dados'         => $req['dados'],
        ];
        $txt = json_encode($novo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($txt === false) responde(500, ['erro' => 'Nao consegui converter os dados.']);
        if (!gravaAtomico($ARQ, GUARDA . $txt)) responde(500, ['erro' => 'Falha ao gravar. Confira a permissao da pasta dados.']);
        rotacionaHistorico($HIST, $txt, (int) $novo['versao']);

        responde(200, ['ok' => true, 'versao' => $novo['versao'], 'atualizadoEm' => $novo['atualizadoEm'], 'atualizadoPor' => $novo['atualizadoPor']]);
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

responde(400, ['erro' => 'Acao desconhecida: ' . $acao]);
