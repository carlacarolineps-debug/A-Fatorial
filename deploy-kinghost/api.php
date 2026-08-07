<?php
/**
 * NEXUS GRB - servidor de dados compartilhado
 *
 * Guarda o estado do sistema num arquivo para que TODOS os usuarios vejam os
 * mesmos numeros. Sem banco de dados: roda em qualquer hospedagem com PHP.
 *
 * SEGURANCA (v3): quem protege os dados e o LOGIN DO PROPRIO SISTEMA.
 * A versao anterior dependia da "senha de pasta" (.htaccess) da hospedagem e
 * falhava fechado quando o servidor nao repassava o usuario autenticado ao PHP
 * - resultado: nao salvava e nao sincronizava. Agora o api.php tem login
 * proprio: o usuario entra com o mesmo usuario e senha do sistema, recebe uma
 * chave de sessao e so com ela le ou grava. Nao depende de recurso nenhum do
 * painel da hospedagem. A senha de pasta continua aceita, quando existir, mas
 * deixou de ser obrigatoria.
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

const HIST_MAX     = 40;     // quantas versoes anteriores manter
const LIMITE_MB    = 24;     // tamanho maximo aceito numa gravacao
const SESSAO_DIAS  = 30;     // por quanto tempo o navegador continua conectado
const TENT_MAX     = 8;      // tentativas de senha erradas antes de bloquear
const TENT_JANELA  = 600;    // ... dentro desta janela, em segundos
const SESSAO_MAX   = 200;    // sessoes simultaneas guardadas

// Os dados sao gravados com extensao .php e a primeira linha "<?php exit;".
// Assim, mesmo que o .htaccess falhe ou o servidor seja trocado, quem pedir o
// arquivo direto no navegador recebe uma pagina vazia, nunca os numeros.
const GUARDA = "<?php exit; /* NEXUS GRB - dados do sistema */ ?>\n";

$DIR    = __DIR__ . '/dados';
$ARQ    = $DIR . '/estado.php';
$ANTIGO = $DIR . '/estado.json';        // instalacoes anteriores
$LOCK   = $DIR . '/estado.lock';
$HIST   = $DIR . '/historico';
$ACESSO = $DIR . '/acesso.php';         // usuarios e senhas (guardadas com hash)
$SESSOES = $DIR . '/sessoes.php';       // chaves de sessao ativas
$TENT   = $DIR . '/tentativas.php';     // controle de forca bruta

/* ------------------------------------------------------------------ basicos */

function responde(int $codigo, array $corpo): void {
    http_response_code($codigo);
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** str_starts_with existe so a partir do PHP 8; aqui roda em qualquer versao. */
function comeca(string $txt, string $ini): bool {
    return substr($txt, 0, strlen($ini)) === $ini;
}

function normaliza(string $s): string {
    $s = trim($s);
    return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

/** Prepara a pasta de dados e a fecha para o mundo (o PHP continua lendo). */
function preparaPasta(string $dir, string $hist): void {
    foreach (array($dir, $hist) as $d) {
        if (!is_dir($d) && !@mkdir($d, 0775, true) && !is_dir($d)) {
            responde(500, array('erro' => 'Nao consegui criar a pasta de dados. Confira a permissao de escrita em ' . basename($d) . '.'));
        }
    }
    $ht = $dir . '/.htaccess';
    if (!is_file($ht)) {
        @file_put_contents($ht, "# Os dados so podem ser lidos pelo api.php, nunca pelo navegador\nRequire all denied\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
    }
}

/** Grava sem risco de arquivo pela metade: escreve ao lado e so entao substitui. */
function gravaAtomico(string $arq, string $conteudo): bool {
    $tmp = $arq . '.tmp' . getmypid();
    if (@file_put_contents($tmp, $conteudo, LOCK_EX) === false) return false;
    if (!@rename($tmp, $arq)) { @unlink($tmp); return false; }
    return true;
}

/** Le um arquivo interno (JSON protegido pela linha de guarda). */
function leInterno(string $arq): array {
    if (!is_file($arq)) return array();
    $txt = @file_get_contents($arq);
    if ($txt === false || $txt === '') return array();
    if (comeca($txt, '<?php')) {
        $q = strpos($txt, "\n");
        $txt = $q === false ? '' : substr($txt, $q + 1);
    }
    $j = json_decode($txt, true);
    return is_array($j) ? $j : array();
}

function gravaInterno(string $arq, array $dados): bool {
    $txt = json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($txt === false) return false;
    return gravaAtomico($arq, GUARDA . $txt);
}

function ip(): string {
    $v = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '?';
    return substr($v, 0, 45);
}

function corpoJson(): array {
    $bruto = file_get_contents('php://input');
    if ($bruto === false || $bruto === '') return array();
    $j = json_decode($bruto, true);
    return is_array($j) ? $j : array();
}

/* ------------------------------------------------------------------ acesso */

/** Usuario vindo da senha de pasta do servidor (.htaccess), quando existir. */
function usuarioDaPasta(): string {
    foreach (array('PHP_AUTH_USER', 'REMOTE_USER', 'REDIRECT_REMOTE_USER') as $k) {
        if (!empty($_SERVER[$k])) return substr((string) $_SERVER[$k], 0, 60);
    }
    return '';
}

/**
 * Monta a lista de credenciais a partir dos usuarios do proprio sistema.
 * As senhas nunca sao guardadas em texto: so o hash.
 */
function montaCredenciais(array $usuarios): array {
    $lista = array();
    foreach ($usuarios as $u) {
        if (!is_array($u)) continue;
        $nome  = isset($u['nome']) ? (string) $u['nome'] : '';
        $senha = isset($u['senha']) ? (string) $u['senha'] : '';
        if ($nome === '' || $senha === '') continue;
        $lista[] = array(
            'u'    => normaliza($nome),
            'nome' => substr($nome, 0, 60),
            'h'    => password_hash($senha, PASSWORD_DEFAULT),
        );
    }
    return $lista;
}

function acessoLe(string $arq): array {
    $a = leInterno($arq);
    if (!isset($a['usuarios']) || !is_array($a['usuarios'])) $a['usuarios'] = array();
    return $a;
}

function configurado(string $arq): bool {
    $a = acessoLe($arq);
    return count($a['usuarios']) > 0;
}

/** Confere usuario + senha. Devolve o nome real, ou '' quando nao confere. */
function confereSenha(string $arq, string $usuario, string $senha): string {
    $a = acessoLe($arq);
    $alvo = normaliza($usuario);
    foreach ($a['usuarios'] as $c) {
        if (!isset($c['u']) || $c['u'] !== $alvo) continue;
        if (isset($c['h']) && password_verify($senha, (string) $c['h'])) {
            return isset($c['nome']) ? (string) $c['nome'] : $usuario;
        }
    }
    return '';
}

/* --------------------------------------------------------------- sessoes */

function sessoesLimpa(array $s): array {
    $agora = time();
    $out = array();
    foreach ($s as $chave => $reg) {
        if (is_array($reg) && isset($reg['ate']) && (int) $reg['ate'] > $agora) $out[$chave] = $reg;
    }
    if (count($out) > SESSAO_MAX) {
        uasort($out, function ($a, $b) { return ((int) $b['ate']) <=> ((int) $a['ate']); });
        $out = array_slice($out, 0, SESSAO_MAX, true);
    }
    return $out;
}

function sessaoCria(string $arq, string $nome): string {
    $token = bin2hex(random_bytes(24));
    $s = sessoesLimpa(leInterno($arq));
    $s[hash('sha256', $token)] = array(
        'nome'  => $nome,
        'ate'   => time() + SESSAO_DIAS * 86400,
        'de'    => ip(),
        'desde' => date('c'),
    );
    gravaInterno($arq, $s);
    return $token;
}

function sessaoUsuario(string $arq, string $token): string {
    if ($token === '') return '';
    $s = leInterno($arq);
    $k = hash('sha256', $token);
    if (!isset($s[$k]) || !is_array($s[$k])) return '';
    if ((int) $s[$k]['ate'] <= time()) return '';
    return isset($s[$k]['nome']) ? (string) $s[$k]['nome'] : 'usuario';
}

function sessaoEncerra(string $arq, string $token): void {
    if ($token === '') return;
    $s = leInterno($arq);
    $k = hash('sha256', $token);
    if (isset($s[$k])) { unset($s[$k]); gravaInterno($arq, $s); }
}

function tokenRecebido(): string {
    if (!empty($_SERVER['HTTP_X_NEXUS_TOKEN'])) return substr((string) $_SERVER['HTTP_X_NEXUS_TOKEN'], 0, 120);
    if (!empty($_SERVER['HTTP_AUTHORIZATION']) && comeca((string) $_SERVER['HTTP_AUTHORIZATION'], 'Bearer ')) {
        return substr(substr((string) $_SERVER['HTTP_AUTHORIZATION'], 7), 0, 120);
    }
    return '';
}

/* ---------------------------------------------------- freio de forca bruta */

function tentativasBloqueio(string $arq): int {
    $t = leInterno($arq);
    $chave = ip();
    if (!isset($t[$chave]) || !is_array($t[$chave])) return 0;
    $reg = $t[$chave];
    $desde = isset($reg['desde']) ? (int) $reg['desde'] : 0;
    $n = isset($reg['n']) ? (int) $reg['n'] : 0;
    if (time() - $desde > TENT_JANELA) return 0;
    if ($n < TENT_MAX) return 0;
    return TENT_JANELA - (time() - $desde);
}

function tentativasRegistra(string $arq, bool $acertou): void {
    $t = leInterno($arq);
    $chave = ip();
    if ($acertou) { unset($t[$chave]); }
    else {
        $reg = isset($t[$chave]) && is_array($t[$chave]) ? $t[$chave] : array('n' => 0, 'desde' => time());
        if (time() - (int) $reg['desde'] > TENT_JANELA) $reg = array('n' => 0, 'desde' => time());
        $reg['n'] = ((int) $reg['n']) + 1;
        $t[$chave] = $reg;
    }
    // nao deixa o arquivo crescer para sempre
    if (count($t) > 500) $t = array_slice($t, -200, null, true);
    gravaInterno($arq, $t);
}

/* ------------------------------------------------------------ estado geral */

function estadoVazio(): array {
    return array('versao' => 0, 'atualizadoEm' => null, 'atualizadoPor' => null, 'dados' => new stdClass());
}

function leEstado(string $arq, string $antigo = ''): array {
    $alvo = is_file($arq) ? $arq : ($antigo !== '' && is_file($antigo) ? $antigo : '');
    if ($alvo === '') return estadoVazio();
    $txt = @file_get_contents($alvo);
    if ($txt === false || $txt === '') return estadoVazio();
    if (comeca($txt, '<?php')) {          // remove a linha de guarda
        $q = strpos($txt, "\n");
        $txt = $q === false ? '' : substr($txt, $q + 1);
    }
    $j = json_decode($txt, true);
    if (!is_array($j) || !isset($j['versao'])) return estadoVazio();
    return $j;
}

function rotacionaHistorico(string $hist, string $conteudo, int $versao): void {
    @file_put_contents(sprintf('%s/estado-%s-v%06d.php', $hist, date('Ymd-His'), $versao), GUARDA . $conteudo);
    $arqs = array_merge(glob($hist . '/estado-*.php') ?: array(), glob($hist . '/estado-*.json') ?: array());
    if (count($arqs) > HIST_MAX) {
        sort($arqs);
        foreach (array_slice($arqs, 0, count($arqs) - HIST_MAX) as $velho) @unlink($velho);
    }
}

/**
 * Mantem as credenciais do servidor iguais as do sistema.
 * Os usuarios sao criados e editados dentro do proprio sistema; a cada gravacao
 * o servidor reaproveita essa lista. Assim ninguem precisa cadastrar duas vezes
 * - e trocar a senha no sistema tranca a porta do servidor tambem.
 */
function sincronizaCredenciais(string $arq, array $dados): void {
    if (!isset($dados['nexus_v2_usuarios'])) return;
    $us = json_decode((string) $dados['nexus_v2_usuarios'], true);
    if (!is_array($us)) return;
    $lista = montaCredenciais($us);
    if (!count($lista)) return;                 // nunca deixar o sistema sem porta de entrada
    $a = acessoLe($arq);
    $a['usuarios'] = $lista;
    $a['atualizadoEm'] = date('c');
    gravaInterno($arq, $a);
}

/* =========================================================== atendimento */

preparaPasta($DIR, $HIST);
$acao = isset($_GET['acao']) ? (string) $_GET['acao'] : 'estado';

$token       = tokenRecebido();
$porToken    = sessaoUsuario($SESSOES, $token);
$porPasta    = usuarioDaPasta();
$usuario     = $porToken !== '' ? $porToken : $porPasta;
$autenticado = $usuario !== '';
$temAcesso   = configurado($ACESSO);

/* ---- ping: o sistema usa para saber se ha servidor (se nao houver, roda sozinho) ---- */
if ($acao === 'ping') {
    responde(200, array(
        'ok' => true, 'sistema' => 'NEXUS GRB', 'versaoApi' => 3, 'php' => PHP_VERSION,
        'configurado' => $temAcesso,
        'autenticado' => $autenticado,
        'usuario' => $usuario,
        'senhaDePasta' => $porPasta !== '',
    ));
}

/* ---- configurar: primeira entrada, define quem manda nesta instalacao ---- */
if ($acao === 'configurar') {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') responde(405, array('erro' => 'Use POST.'));
    if ($temAcesso) responde(409, array('erro' => 'ja_configurado', 'mensagem' => 'Esta instalacao ja tem acesso definido. Entre com usuario e senha.'));
    $c = corpoJson();
    $usuarios = isset($c['usuarios']) && is_array($c['usuarios']) ? $c['usuarios'] : array();
    if (!count($usuarios) && isset($c['usuario']) && isset($c['senha'])) {
        $usuarios = array(array('nome' => (string) $c['usuario'], 'senha' => (string) $c['senha']));
    }
    $lista = montaCredenciais($usuarios);
    if (!count($lista)) responde(400, array('erro' => 'Informe pelo menos um usuario com senha.'));
    $ok = gravaInterno($ACESSO, array(
        'usuarios' => $lista,
        'criadoEm' => date('c'),
        'criadoDe' => ip(),
    ));
    if (!$ok) responde(500, array('erro' => 'Nao consegui gravar o acesso. Confira a permissao de escrita da pasta dados.'));
    $nome = isset($c['usuario']) ? (string) $c['usuario'] : $lista[0]['nome'];
    responde(200, array('ok' => true, 'token' => sessaoCria($SESSOES, $nome), 'usuario' => $nome));
}

/* ---- entrar: usuario e senha do proprio sistema ---- */
if ($acao === 'entrar') {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') responde(405, array('erro' => 'Use POST.'));
    if (!$temAcesso) responde(409, array('erro' => 'nao_configurado', 'mensagem' => 'Esta instalacao ainda nao tem acesso definido.'));
    $espera = tentativasBloqueio($TENT);
    if ($espera > 0) {
        responde(429, array('erro' => 'bloqueado', 'segundos' => $espera,
            'mensagem' => 'Senha errada vezes demais. Tente de novo em ' . ceil($espera / 60) . ' minuto(s).'));
    }
    $c = corpoJson();
    $nome = confereSenha($ACESSO, isset($c['usuario']) ? (string) $c['usuario'] : '', isset($c['senha']) ? (string) $c['senha'] : '');
    tentativasRegistra($TENT, $nome !== '');
    if ($nome === '') responde(401, array('erro' => 'invalido', 'mensagem' => 'Usuario ou senha nao conferem com o servidor.'));
    responde(200, array('ok' => true, 'token' => sessaoCria($SESSOES, $nome), 'usuario' => $nome));
}

/* ---- sair ---- */
if ($acao === 'sair') {
    sessaoEncerra($SESSOES, $token);
    responde(200, array('ok' => true));
}

/**
 * TRAVA PRINCIPAL: dados so saem e so entram com sessao valida.
 *
 * Enquanto a instalacao nao tiver acesso definido (instalacao nova, servidor
 * ainda vazio) o sistema responde 'nao_configurado' e o navegador abre a tela
 * de definir o acesso. Nao ha janela em que o estado fique publico.
 */
if (!$autenticado) {
    responde(401, array(
        'erro' => $temAcesso ? 'nao_autenticado' : 'nao_configurado',
        'mensagem' => $temAcesso
            ? 'Entre no sistema para ler ou gravar os dados.'
            : 'Instalacao nova: defina o acesso na primeira entrada.',
    ));
}

/* ---- versao: consulta barata, usada para perceber que alguem gravou ---- */
if ($acao === 'versao') {
    $e = leEstado($ARQ, $ANTIGO);
    responde(200, array('versao' => (int) $e['versao'], 'atualizadoEm' => $e['atualizadoEm'], 'atualizadoPor' => $e['atualizadoPor']));
}

/* ---- estado: o pacote completo ---- */
if ($acao === 'estado') {
    responde(200, leEstado($ARQ, $ANTIGO));
}

/* ---- gravar ---- */
if ($acao === 'gravar') {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        responde(405, array('erro' => 'Use POST para gravar.'));
    }
    $bruto = file_get_contents('php://input');
    if ($bruto === false || $bruto === '') responde(400, array('erro' => 'Nada recebido.'));
    if (strlen($bruto) > LIMITE_MB * 1024 * 1024) {
        responde(413, array('erro' => 'Pacote maior que ' . LIMITE_MB . ' MB.'));
    }
    $req = json_decode($bruto, true);
    if (!is_array($req) || !isset($req['dados']) || !is_array($req['dados'])) {
        responde(400, array('erro' => 'Formato invalido: esperava { baseVersao, dados }.'));
    }

    $fp = @fopen($LOCK, 'c');
    if (!$fp) responde(500, array('erro' => 'Nao consegui abrir a trava de gravacao.'));
    if (!flock($fp, LOCK_EX)) { fclose($fp); responde(503, array('erro' => 'Servidor ocupado, tente de novo.')); }

    try {
        $atual = leEstado($ARQ, $ANTIGO);
        $versaoAtual = (int) $atual['versao'];
        $base = isset($req['baseVersao']) ? (int) $req['baseVersao'] : -1;
        $forcar = !empty($req['forcar']);

        // Outra pessoa gravou depois que este navegador carregou: nao sobrescreve calado.
        if (!$forcar && $base >= 0 && $base !== $versaoAtual) {
            responde(409, array(
                'erro' => 'conflito',
                'versao' => $versaoAtual,
                'atualizadoEm' => $atual['atualizadoEm'],
                'atualizadoPor' => $atual['atualizadoPor'],
                'mensagem' => 'Outra pessoa salvou enquanto voce trabalhava.',
            ));
        }

        $novo = array(
            'versao'        => $versaoAtual + 1,
            'atualizadoEm'  => date('c'),
            'atualizadoPor' => $usuario,
            'dados'         => $req['dados'],
        );
        $txt = json_encode($novo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($txt === false) responde(500, array('erro' => 'Nao consegui converter os dados.'));
        if (!gravaAtomico($ARQ, GUARDA . $txt)) responde(500, array('erro' => 'Falha ao gravar. Confira a permissao da pasta dados.'));
        rotacionaHistorico($HIST, $txt, (int) $novo['versao']);
        sincronizaCredenciais($ACESSO, $req['dados']);

        responde(200, array('ok' => true, 'versao' => $novo['versao'], 'atualizadoEm' => $novo['atualizadoEm'], 'atualizadoPor' => $novo['atualizadoPor']));
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

responde(400, array('erro' => 'Acao desconhecida: ' . $acao));
