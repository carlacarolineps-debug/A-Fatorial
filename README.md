# A! Fatorial — Sistema de Gestão (Arquitetura de Lucro)

Aplicação de página única (um arquivo `index.html`, sem build, JavaScript puro).
Abra o arquivo no navegador para usar.

## Acessos (tela de login)

| Perfil | Entra vendo | Pode acessar (padrão) |
|--------|-------------|------------------------|
| **Admin / Gestão** | Gestão à vista | Todas as telas |
| **Colaborador** | Portal do colaborador | Portal do colaborador, **Esteira comercial** e **Propostas e rastreio** |
| **Cliente** | Portal do cliente | Portal do cliente |

Todos os perfis usam **o mesmo visual** (tema escuro "gamer" neon) e a **mesma
moldura** (menu lateral + topo) — cada um enxerga apenas os itens que tem permissão.

## Novidades desta versão

1. **Mesmo visual para todos os acessos** — o tema escuro/neon do portal do
   colaborador passou a valer para o ecossistema inteiro (admin, colaborador e
   cliente), com a barra lateral sempre visível.
2. **Esteira comercial e Propostas no portal do colaborador** — cada colaborador
   acessa essas telas dentro da própria plataforma.
3. **Permissões configuráveis** — em **Equipe e acessos**, o admin marca quais
   telas cada perfil enxerga e define se o colaborador vê *todos* os negócios da
   empresa ou *apenas os seus*. As escolhas valem na hora e ficam salvas no
   navegador (chave `af_permissoes`). O acesso do admin à própria tela de
   permissões fica protegido.
4. **Gamificação reforçada**
   - **Cliente**: painel de nível, barra de XP e 7 conquistas que destravam
     conforme o projeto avança (proposta, contrato, kickoff, entrega, pagamento,
     avaliação e conclusão).
   - **Colaborador**: indicador da "próxima conquista a desbloquear" no cartão do
     jogador, somado à gamificação já existente (XP, níveis, badges, missões, saga).

5. **CNAE / base da Nota Fiscal no catálogo** — cada serviço recebe uma sugestão
   automática de CNAE, escolhida apenas entre os 6 CNAEs registrados no CNPJ da
   empresa (30.361.388/0001-17). O campo "Tipo de serviço (base da NF)" do funil
   também passou a exibir o CNAE de cada opção.
6. **Gestão de usuários (Equipe e acessos → Equipe e responsáveis)** — login,
   senha, foto de perfil, apelido e status por usuário; ativar/desativar; alterar
   senha; criar novo usuário. Usuários inativos não conseguem entrar. Cada
   colaborador também personaliza foto e apelido no próprio portal ("Meu perfil").
   Login agora valida senha e status (com senha padrão de demonstração).

## CNAEs registrados (base para Nota Fiscal)

| CNAE | Atividade |
|------|-----------|
| 74.90-1-04 | Intermediação e agenciamento de serviços e negócios (principal) |
| 70.20-4-00 | Consultoria em gestão empresarial |
| 82.11-3-00 | Serviços combinados de escritório e apoio administrativo |
| 78.10-8-00 | Seleção e agenciamento de mão de obra |
| 43.99-1-01 | Administração de obras |
| 43.30-4-99 | Outras obras de acabamento da construção |

## Onde mexer no código

- **Permissões / papéis**: `PERMISSOES_DEFAULT`, `PERMISSOES`, `salvarPermissoes`,
  `renderPermissoes`, `permToggle`, `permEscopo` (marcadores `=== BACKEND ===`
  indicam o que deve ser revalidado no servidor em produção).
- **Tema escuro global**: bloco CSS `TEMA GAMER GLOBAL` + classe `body.theme-gamer`.
- **Gamificação do cliente**: `renderPortalGame` e `PT_BADGES_DEF`.
- **Filtro de dados do colaborador**: `comercialVisivel` + `COL_ESCOPO_COMERCIAL`.
- **CNAE / base da NF**: `CNAES_EMPRESA`, `sugerirCnae`, `cnaeOptions`.
- **Usuários / acessos**: `ADMIN_USER`, `normalizaUsuarios`, `salvarUsuarios`,
  `renderUsuarios`, `usuarioSalvar`, `colaboradorNovo` (persistência em
  `localStorage` chave `af_usuarios`; em produção, isso vai para o backend).
