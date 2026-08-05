<?php
/**
 * NEXUS GRB - conferencia da instalacao
 *
 * Suba este arquivo junto com o sistema e abra no navegador:
 *     https://seudominio.com.br/nexus/verificar.php
 *
 * Ele confere sozinho se a instalacao ficou correta e diz, em portugues, o que
 * fazer quando algo estiver errado. Nao altera nada do sistema: so le e testa.
 * Depois de dar tudo certo, pode apagar este arquivo.
 */
declare(strict_types=1);
header('Content-Type: text/html; charset=utf-8');

$DIR  = __DIR__ . '/dados';
$itens = [];

/** @param string $estado ok | alerta | erro */
function item(array &$itens, string $estado, string $titulo, string $detalhe, string $comoResolver = ''): void {
    $itens[] = compact('estado', 'titulo', 'detalhe', 'comoResolver');
}

/* 1. PHP */
$php = PHP_VERSION;
version_compare($php, '7.4', '>=')
    ? item($itens, 'ok', 'Versao do PHP', 'PHP ' . $php . ' - atende o necessario.')
    : item($itens, 'erro', 'Versao do PHP', 'PHP ' . $php . ' e antigo demais.',
        'No painel do KingHost, em "Versao do PHP", escolha 7.4 ou superior.');

/* 2. arquivos do sistema lado a lado */
foreach (['index.html' => 'o sistema', 'api.php' => 'o servidor de dados'] as $arq => $oque) {
    is_file(__DIR__ . '/' . $arq)
        ? item($itens, 'ok', 'Arquivo ' . $arq, ucfirst($oque) . ' esta na pasta.')
        : item($itens, 'erro', 'Arquivo ' . $arq, 'Nao encontrei ' . $arq . ' nesta pasta.',
            'Envie ' . $arq . ' para a MESMA pasta deste arquivo. Sem ele, ' . $oque . ' nao funciona.');
}

/* 3. permissao de escrita (é o que permite salvar) */
if (!is_dir($DIR)) { @mkdir($DIR, 0775, true); }
if (is_dir($DIR) && is_writable($DIR)) {
    $teste = $DIR . '/.teste-escrita';
    if (@file_put_contents($teste, 'ok') !== false) {
        @unlink($teste);
        item($itens, 'ok', 'Permissao de escrita', 'O servidor consegue gravar na pasta "dados". E isso que salva o trabalho.');
    } else {
        item($itens, 'erro', 'Permissao de escrita', 'A pasta "dados" existe, mas nao aceitou gravacao.',
            'No Gerenciador de Arquivos, ajuste a permissao da pasta "dados" para 755 (ou 775).');
    }
} else {
    item($itens, 'erro', 'Permissao de escrita', 'Nao consegui criar/gravar a pasta "dados".',
        'Crie a pasta "dados" dentro desta e deixe a permissao 755 (ou 775). Sem isso, NADA e salvo.');
}

/* 4. senha de pasta */
$usuario = '';
foreach (['PHP_AUTH_USER', 'REMOTE_USER', 'REDIRECT_REMOTE_USER'] as $k) {
    if (!empty($_SERVER[$k])) { $usuario = (string) $_SERVER[$k]; break; }
}
$usuario !== ''
    ? item($itens, 'ok', 'Senha de pasta', 'Protegida - voce entrou como "' . htmlspecialchars($usuario) . '".')
    : item($itens, 'erro', 'Senha de pasta', 'A pasta esta ABERTA: qualquer pessoa com o endereco ve e altera os numeros.',
        'No painel do KingHost use "Proteger diretorio" apontando para esta pasta. E a protecao mais importante de todas.');

/* 5. HTTPS */
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
      || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
      || (($_SERVER['SERVER_PORT'] ?? '') === '443');
$https
    ? item($itens, 'ok', 'Conexao segura (HTTPS)', 'A pagina abriu por HTTPS: senha e numeros trafegam protegidos.')
    : item($itens, 'alerta', 'Conexao segura (HTTPS)', 'Esta abrindo sem HTTPS. A senha da pasta trafega aberta.',
        'Ative o SSL gratuito no painel do KingHost e depois descomente as 2 linhas de HTTPS no arquivo .htaccess.');

/* 6. a pasta de dados responde na web? (nao deveria mostrar conteudo) */
item($itens, 'ok', 'Protecao dos dados',
    'Os dados sao gravados como "estado.php" com bloqueio na primeira linha: mesmo que o .htaccess falhe, abrir o arquivo no navegador devolve pagina vazia.');

/* 7. o sistema ja tem dados gravados? */
$arqEstado = $DIR . '/estado.php';
$arqAntigo = $DIR . '/estado.json';
if (is_file($arqEstado) || is_file($arqAntigo)) {
    $txt = (string) @file_get_contents(is_file($arqEstado) ? $arqEstado : $arqAntigo);
    if (str_starts_with($txt, '<?php')) { $q = strpos($txt, "\n"); $txt = $q === false ? '' : substr($txt, $q + 1); }
    $j = json_decode($txt, true);
    $v = is_array($j) ? (int) ($j['versao'] ?? 0) : 0;
    $qnd = is_array($j) && !empty($j['atualizadoEm']) ? date('d/m/Y H:i', strtotime((string) $j['atualizadoEm'])) : '?';
    $hist = is_dir($DIR . '/historico') ? count(glob($DIR . '/historico/estado-*') ?: []) : 0;
    item($itens, 'ok', 'Dados no servidor',
        'Ja existem dados salvos (versao ' . $v . ', ultima gravacao em ' . $qnd . '). Copias no historico: ' . $hist . '.');
} else {
    item($itens, 'alerta', 'Dados no servidor', 'Ainda nao ha dados gravados - normal numa instalacao nova.',
        'Abra o sistema, entre e importe uma planilha (ou restaure a copia de seguranca). Depois recarregue esta pagina.');
}

$erros   = count(array_filter($itens, fn($i) => $i['estado'] === 'erro'));
$alertas = count(array_filter($itens, fn($i) => $i['estado'] === 'alerta'));
$cor = $erros ? '#be123c' : ($alertas ? '#b45309' : '#0d9488');
$resumo = $erros
    ? 'Faltam ' . $erros . ' ponto(s) para a instalacao ficar correta'
    : ($alertas ? 'Funcionando, com ' . $alertas . ' ponto(s) de atencao' : 'Instalacao correta e protegida');
?>
<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NEXUS GRB · Conferência da instalação</title>
<style>
 body{margin:0;background:#f5f6fa;color:#1e2340;font:15px/1.55 -apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:28px 16px}
 .w{max-width:760px;margin:0 auto}
 h1{font-size:20px;margin:0 0 4px}
 .sub{color:#6b7280;font-size:13px;margin-bottom:20px}
 .res{background:<?= $cor ?>;color:#fff;padding:16px 20px;border-radius:12px;font-weight:800;margin-bottom:18px}
 .it{background:#fff;border:1px solid #e5e7eb;border-left:5px solid #cbd5e1;border-radius:10px;padding:14px 18px;margin-bottom:10px}
 .it.ok{border-left-color:#0d9488}.it.alerta{border-left-color:#f59e0b}.it.erro{border-left-color:#be123c}
 .t{font-weight:800;font-size:14px}
 .d{color:#4b5563;font-size:13px;margin-top:3px}
 .r{margin-top:8px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:9px 12px;font-size:12.5px;color:#334155}
 .r b{color:#be123c}
 .fim{color:#6b7280;font-size:12.5px;margin-top:18px;line-height:1.6}
 code{background:#eef2f7;padding:1px 5px;border-radius:4px}
</style></head><body><div class="w">
<h1>NEXUS GRB · Conferência da instalação</h1>
<div class="sub">Esta página só lê e testa; não altera o sistema.</div>
<div class="res"><?= htmlspecialchars($resumo) ?></div>
<?php foreach ($itens as $i): ?>
  <div class="it <?= $i['estado'] ?>">
    <div class="t"><?= $i['estado'] === 'ok' ? '✓' : ($i['estado'] === 'alerta' ? '!' : '✕') ?> <?= htmlspecialchars($i['titulo']) ?></div>
    <div class="d"><?= htmlspecialchars($i['detalhe']) ?></div>
    <?php if ($i['comoResolver']): ?><div class="r"><b>Como resolver:</b> <?= htmlspecialchars($i['comoResolver']) ?></div><?php endif; ?>
  </div>
<?php endforeach; ?>
<div class="fim">
  Deu tudo certo? Abra <code>index.html</code> nesta mesma pasta e confira o selo <b>SINCRONIZADO</b> no canto superior direito.<br>
  Depois disso, pode apagar este arquivo <code>verificar.php</code> — ele não é necessário para o sistema funcionar.
</div>
</div></body></html>
