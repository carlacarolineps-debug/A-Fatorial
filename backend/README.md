# Ponte do WhatsApp para o Kanban operacional

Servidorzinho que recebe o aviso do kanban e entrega no WhatsApp pela **API
oficial da Meta (WhatsApp Cloud API)**.

Você só precisa dele para o modo **⚡ Automático**. O modo **🔗 Link direto**
(padrão do sistema) funciona sem servidor nenhum: ele abre a conversa com o
texto já escrito e você só aperta enviar.

```
index.html (kanban)  ──POST──▶  este servidor  ──▶  Graph API da Meta  ──▶  WhatsApp
```

O token do WhatsApp fica **aqui, no servidor**. Ele nunca vai para o navegador.
Se fosse para o navegador, qualquer pessoa que abrisse o código da página
conseguiria ler e usar seu token.

## Passo a passo

**1. Conta na Meta**

1. Crie uma conta no [Meta Business](https://business.facebook.com).
2. Em *Apps* → **Criar app** → tipo **Business** → adicione o produto **WhatsApp**.
3. Em *WhatsApp → Configuração da API* você encontra:
   - **Identificação do número de telefone** (`PHONE_ID`)
   - o **token** (gere um token permanente em *Usuários do sistema*, o token de
     teste expira em 24h)

**2. Template de mensagem**

Em *WhatsApp → Modelos de mensagem* → **Criar modelo**:

- Nome: `nova_demanda`
- Categoria: **Utility** (utilitário)
- Idioma: **Português (BR)**
- Corpo:

```
Olá {{1}}! Você recebeu uma nova demanda: {{2}}.
Prioridade: {{3}}. Prazo: {{4}}. Etapa: {{5}}.
```

A aprovação costuma sair em minutos. Os cinco parâmetros são preenchidos pelo
servidor nesta ordem: nome, título da tarefa, prioridade, prazo e etapa.

> Template é exigência da Meta para **você iniciar** a conversa. Depois que a
> pessoa responde, abre uma janela de 24h em que dá para mandar mensagem livre.
> É o `MENSAGEM_MODO=texto`, que envia o texto completo com emoji e quebras
> de linha, do jeitinho que aparece na tela do kanban.

**3. Subir o servidor**

```bash
cd backend
cp .env.example .env      # preencha WHATSAPP_TOKEN, PHONE_ID e APP_TOKEN
npm install
npm start
```

Funciona em Railway, Render, Fly.io, VPS ou qualquer lugar que rode Node 18+.
Só precisa ser **https** e ficar acessível pelo endereço onde o sistema está.

**4. Ligar no sistema**

No sistema: **Kanban operacional → Integração com WhatsApp**

1. Escolha **⚡ Automático (API oficial)**
2. Endpoint: `https://seu-servidor.com/api/whatsapp`
3. Chave de acesso: o mesmo valor que você pôs em `APP_TOKEN`
4. Clique em **📲 Enviar mensagem de teste**

Deu certo: a linha aparece como enviada no histórico de avisos. Deu errado: o
histórico mostra o motivo (número sem cadastro, endpoint fora do ar, template
não aprovado...).

## O que o servidor expõe

| Rota | Para que serve |
|------|----------------|
| `POST /api/whatsapp` | Recebe o aviso do kanban e envia pelo WhatsApp |
| `GET /health` | Diz se está no ar e se o token está configurado |

Corpo que o kanban envia:

```json
{
  "to": "5511999999999",
  "nome": "Enzo",
  "evento": "criada",
  "template": "nova_demanda",
  "mensagem": "texto completo já montado, com emojis",
  "tarefa": {
    "titulo": "Gravar 4 reels da campanha",
    "etapa": "A fazer",
    "prioridade": "Urgente",
    "area": "Conteúdo",
    "onda": "Onda 1",
    "inicio": "2026-07-28",
    "termino": "2026-08-05",
    "notas": "Roteiros aprovados."
  }
}
```

## Cuidados

- **Nunca** suba o arquivo `.env` para o GitHub (o `.gitignore` já bloqueia).
- Preencha `ORIGENS` com o endereço do seu sistema, para ninguém mais conseguir
  usar sua ponte para disparar mensagem.
- Só a API oficial é usada aqui. Bibliotecas que automatizam o WhatsApp comum
  (as que leem QR Code) violam os termos de uso e podem derrubar seu número.
- A Meta cobra por conversa iniciada pela empresa. Mensagens do tipo *Utility*
  são baratas e há uma cota gratuita mensal, confira a tabela atual no painel
  da sua conta.
