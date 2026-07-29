-- CreateEnum
CREATE TYPE "StatusCliente" AS ENUM ('Ativo', 'Inativo');

-- CreateEnum
CREATE TYPE "FonteCliente" AS ENUM ('LinkedIn', 'Site');

-- CreateEnum
CREATE TYPE "CanalLead" AS ENUM ('Instagram', 'WhatsApp', 'Indicação', 'Linkedln', 'Site', 'Parceiros', 'Outros');

-- CreateEnum
CREATE TYPE "FonteLeadLegado" AS ENUM ('Website', 'Instagram', 'Indicação', 'LinkedIn');

-- CreateEnum
CREATE TYPE "EtapaLead" AS ENUM ('Descoberta', 'Diagnóstico', 'Apresentação', 'Proposta', 'Follow-up', 'Fechamento');

-- CreateEnum
CREATE TYPE "StatusLead" AS ENUM ('Lead', 'Qualificação', 'Negociação', 'Proposta', 'Fechamento Ganho', 'Fechamento Perdido');

-- CreateEnum
CREATE TYPE "StatusProjeto" AS ENUM ('Não iniciado', 'Onboarding', 'Pesquisa', 'Em andamento', 'Off boarding', 'Feito');

-- CreateEnum
CREATE TYPE "TipoProjeto" AS ENUM ('Website', 'Branding', 'Marketing', 'Outros');

-- CreateEnum
CREATE TYPE "StatusTarefa" AS ENUM ('A fazer', 'Em andamento', 'Completa');

-- CreateEnum
CREATE TYPE "PrioridadeTarefa" AS ENUM ('Baixa', 'Média', 'Alta');

-- CreateEnum
CREATE TYPE "TagTarefa" AS ENUM ('Financeiro', 'Projetos', 'Vendas', 'Marketing', 'Outros');

-- CreateEnum
CREATE TYPE "OrigemTarefa" AS ENUM ('Tarefas', 'Tarefas (widget)');

-- CreateEnum
CREATE TYPE "TipoFatura" AS ENUM ('Preço fixo', 'Preço por hora');

-- CreateEnum
CREATE TYPE "StatusFatura" AS ENUM ('Rascunho', 'Emitida', 'Paga', 'Vencida');

-- CreateEnum
CREATE TYPE "StatusPlanner" AS ENUM ('Não planejado', 'Planejado', 'Em andamento', 'Concluído');

-- CreateEnum
CREATE TYPE "PeriodoPlanner" AS ENUM ('Dia', 'Semana', 'Mês');

-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM ('Rascunho', 'Enviada', 'Aceita', 'Recusada', 'Expirada');

-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('Rascunho', 'Em revisão', 'Assinado', 'Encerrado', 'Cancelado');

-- CreateEnum
CREATE TYPE "StatusMeta" AS ENUM ('Não iniciada', 'Em andamento', 'Alcançada', 'Não alcançada');

-- CreateEnum
CREATE TYPE "StatusPostagem" AS ENUM ('Ideia', 'Produção', 'Agendado', 'Publicado');

-- CreateEnum
CREATE TYPE "PlataformaPostagem" AS ENUM ('Instagram', 'LinkedIn', 'Facebook', 'TikTok', 'YouTube', 'Blog');

-- CreateEnum
CREATE TYPE "StatusReuniao" AS ENUM ('Agendada', 'Realizada', 'Cancelada');

-- CreateEnum
CREATE TYPE "TipoReuniao" AS ENUM ('Kickoff', 'Acompanhamento', 'Apresentação', 'Encerramento', 'Interna');

-- CreateEnum
CREATE TYPE "StatusPortfolio" AS ENUM ('Rascunho', 'Publicado', 'Arquivado');

-- CreateEnum
CREATE TYPE "StatusEtapaSetup" AS ENUM ('Não iniciada', 'Em andamento', 'Feita');

-- CreateEnum
CREATE TYPE "FrequenciaHabito" AS ENUM ('Diário', 'Semanal');

-- CreateEnum
CREATE TYPE "RecorrenciaFinanceira" AS ENUM ('Único', 'Mensal', 'Anual');

-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('Admin', 'Gestor', 'Colaborador', 'Cliente');

-- CreateEnum
CREATE TYPE "TipoEntidade" AS ENUM ('Cliente', 'Projeto', 'Tarefa', 'Lead', 'Proposta', 'Contrato', 'Fatura', 'Postagem', 'Projeto de portfólio', 'Reunião', 'Meta', 'Planner');

-- CreateEnum
CREATE TYPE "TipoArquivo" AS ENUM ('Capa', 'PDF', 'Mídia', 'Outro');

-- CreateEnum
CREATE TYPE "FaseMigracao" AS ENUM ('1 - independentes', '2 - dependentes', '3 - relações');

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nomeEmpresa" TEXT NOT NULL,
    "contatoPessoal" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "cnpj" TEXT,
    "cpf" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "status" "StatusCliente" NOT NULL DEFAULT 'Ativo',
    "fonte" "FonteCliente",
    "ultimoProjeto" DATE,
    "capaUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "contatoPessoal" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "cnpj" TEXT,
    "endereco" TEXT,
    "etapa" "EtapaLead",
    "status" "StatusLead" NOT NULL DEFAULT 'Lead',
    "canal" "CanalLead",
    "fonteLegado" "FonteLeadLegado",
    "valorEstimado" DECIMAL(12,2),
    "dataContato" DATE,
    "dataInicio" DATE,
    "dataFechamento" DATE,
    "fechado" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_stats" (
    "id" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "valor" DECIMAL(12,2),
    "referencia" DATE,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT,

    CONSTRAINT "lead_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propostas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "status" "StatusProposta" NOT NULL DEFAULT 'Rascunho',
    "valor" DECIMAL(12,2),
    "enviadaEm" DATE,
    "respondidaEm" DATE,
    "validaAte" DATE,
    "observacoes" TEXT,
    "capaUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT,
    "leadId" TEXT,

    CONSTRAINT "propostas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "status" "StatusContrato" NOT NULL DEFAULT 'Rascunho',
    "valor" DECIMAL(12,2),
    "assinadoEm" DATE,
    "inicioVigencia" DATE,
    "fimVigencia" DATE,
    "link" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT,
    "propostaId" TEXT,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "StatusProjeto" NOT NULL DEFAULT 'Não iniciado',
    "tipos" "TipoProjeto"[],
    "valor" DECIMAL(12,2),
    "inicio" DATE,
    "termino" DATE,
    "link" TEXT,
    "texto" TEXT,
    "capaUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT,
    "propostaId" TEXT,
    "contratoId" TEXT,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "notas" TEXT,
    "status" "StatusTarefa" NOT NULL DEFAULT 'A fazer',
    "prioridade" "PrioridadeTarefa",
    "tag" "TagTarefa",
    "prazo" DATE,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "concluidaEm" TIMESTAMP(3),
    "origem" "OrigemTarefa" NOT NULL DEFAULT 'Tarefas',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "projetoId" TEXT,
    "leadId" TEXT,
    "postagemId" TEXT,
    "responsavelId" TEXT,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reunioes" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoReuniao",
    "status" "StatusReuniao" NOT NULL DEFAULT 'Agendada',
    "inicio" TIMESTAMP(3),
    "fim" TIMESTAMP(3),
    "local" TEXT,
    "pauta" TEXT,
    "notas" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "projetoId" TEXT,

    CONSTRAINT "reunioes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "nota" INTEGER,
    "comentario" TEXT,
    "recebidoEm" DATE,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "projetoId" TEXT,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturas" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "TipoFatura" NOT NULL DEFAULT 'Preço fixo',
    "status" "StatusFatura" NOT NULL DEFAULT 'Emitida',
    "precoFixo" DECIMAL(12,2),
    "emitidaEm" DATE,
    "dataEntrega" DATE,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "pagoEm" DATE,
    "pdfUrl" TEXT,
    "capaUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "projetoId" TEXT,

    CONSTRAINT "faturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planilhas_horas" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" DATE,
    "horas" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "valorHora" DECIMAL(12,2),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "faturaId" TEXT,

    CONSTRAINT "planilhas_horas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_receita" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_receita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_despesa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receitas" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" DATE NOT NULL,
    "recebido" BOOLEAN NOT NULL DEFAULT false,
    "recorrencia" "RecorrenciaFinanceira" NOT NULL DEFAULT 'Único',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "categoriaId" TEXT,
    "mesId" TEXT,
    "projetoId" TEXT,
    "faturaId" TEXT,

    CONSTRAINT "receitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" DATE NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "recorrencia" "RecorrenciaFinanceira" NOT NULL DEFAULT 'Único',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "categoriaId" TEXT,
    "mesId" TEXT,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meses_financeiros" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "metaLucro" DECIMAL(12,2),
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "capaUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "metaAnualId" TEXT,

    CONSTRAINT "meses_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas_anuais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "metaLucro" DECIMAL(12,2),
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "texto" TEXT,
    "capaUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_anuais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusMeta" NOT NULL DEFAULT 'Não iniciada',
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "prazo" DATE,
    "concluidaEm" DATE,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planner_entradas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "periodo" "PeriodoPlanner" NOT NULL,
    "status" "StatusPlanner" NOT NULL DEFAULT 'Não planejado',
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "notas" TEXT,
    "capaUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "paiId" TEXT,

    CONSTRAINT "planner_entradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habitos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "frequencia" "FrequenciaHabito" NOT NULL DEFAULT 'Diário',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "cor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_habito" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "data" DATE NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "plannerSemanaId" TEXT,

    CONSTRAINT "registros_habito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcacoes_habito" (
    "id" TEXT NOT NULL,
    "feito" BOOLEAN NOT NULL DEFAULT false,
    "anotacao" TEXT,
    "habitoId" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,

    CONSTRAINT "marcacoes_habito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postagens" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "pauta" TEXT,
    "legenda" TEXT,
    "status" "StatusPostagem" NOT NULL DEFAULT 'Ideia',
    "plataformas" "PlataformaPostagem"[],
    "agendadaPara" DATE,
    "publicadaEm" DATE,
    "link" TEXT,
    "capaUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos_portfolio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "resumo" TEXT,
    "status" "StatusPortfolio" NOT NULL DEFAULT 'Rascunho',
    "publicadoEm" DATE,
    "link" TEXT,
    "capaUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_setup" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusEtapaSetup" NOT NULL DEFAULT 'Não iniciada',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "concluidaEm" DATE,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etapas_setup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arquivos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" "TipoArquivo" NOT NULL DEFAULT 'Outro',
    "mimeType" TEXT,
    "tamanhoBytes" INTEGER,
    "tipoEntidade" "TipoEntidade" NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arquivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'Colaborador',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "notionUserId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notion_id_map" (
    "id" TEXT NOT NULL,
    "notionId" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "dataSourceId" TEXT,
    "fase" "FaseMigracao" NOT NULL,
    "importadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notion_id_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "clientes_status_idx" ON "clientes"("status");

-- CreateIndex
CREATE INDEX "clientes_nomeEmpresa_idx" ON "clientes"("nomeEmpresa");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_etapa_idx" ON "leads"("etapa");

-- CreateIndex
CREATE INDEX "leads_dataFechamento_idx" ON "leads"("dataFechamento");

-- CreateIndex
CREATE INDEX "propostas_status_idx" ON "propostas"("status");

-- CreateIndex
CREATE INDEX "contratos_status_idx" ON "contratos"("status");

-- CreateIndex
CREATE INDEX "projetos_status_idx" ON "projetos"("status");

-- CreateIndex
CREATE INDEX "projetos_clienteId_idx" ON "projetos"("clienteId");

-- CreateIndex
CREATE INDEX "tarefas_status_idx" ON "tarefas"("status");

-- CreateIndex
CREATE INDEX "tarefas_prazo_idx" ON "tarefas"("prazo");

-- CreateIndex
CREATE INDEX "tarefas_projetoId_idx" ON "tarefas"("projetoId");

-- CreateIndex
CREATE INDEX "reunioes_inicio_idx" ON "reunioes"("inicio");

-- CreateIndex
CREATE INDEX "faturas_pago_idx" ON "faturas"("pago");

-- CreateIndex
CREATE INDEX "faturas_dataEntrega_idx" ON "faturas"("dataEntrega");

-- CreateIndex
CREATE INDEX "planilhas_horas_data_idx" ON "planilhas_horas"("data");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_receita_nome_key" ON "categorias_receita"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_despesa_nome_key" ON "categorias_despesa"("nome");

-- CreateIndex
CREATE INDEX "receitas_data_idx" ON "receitas"("data");

-- CreateIndex
CREATE INDEX "despesas_data_idx" ON "despesas"("data");

-- CreateIndex
CREATE UNIQUE INDEX "meses_financeiros_ano_mes_key" ON "meses_financeiros"("ano", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "metas_anuais_ano_key" ON "metas_anuais"("ano");

-- CreateIndex
CREATE INDEX "metas_status_idx" ON "metas"("status");

-- CreateIndex
CREATE INDEX "metas_prazo_idx" ON "metas"("prazo");

-- CreateIndex
CREATE INDEX "planner_entradas_periodo_status_idx" ON "planner_entradas"("periodo", "status");

-- CreateIndex
CREATE UNIQUE INDEX "planner_entradas_periodo_inicio_key" ON "planner_entradas"("periodo", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "registros_habito_data_key" ON "registros_habito"("data");

-- CreateIndex
CREATE INDEX "registros_habito_data_idx" ON "registros_habito"("data");

-- CreateIndex
CREATE UNIQUE INDEX "marcacoes_habito_registroId_habitoId_key" ON "marcacoes_habito"("registroId", "habitoId");

-- CreateIndex
CREATE INDEX "postagens_status_idx" ON "postagens"("status");

-- CreateIndex
CREATE INDEX "postagens_agendadaPara_idx" ON "postagens"("agendadaPara");

-- CreateIndex
CREATE INDEX "projetos_portfolio_status_idx" ON "projetos_portfolio"("status");

-- CreateIndex
CREATE INDEX "arquivos_tipoEntidade_entidadeId_idx" ON "arquivos"("tipoEntidade", "entidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_notionUserId_key" ON "usuarios"("notionUserId");

-- CreateIndex
CREATE UNIQUE INDEX "notion_id_map_notionId_key" ON "notion_id_map"("notionId");

-- CreateIndex
CREATE INDEX "notion_id_map_entidade_registroId_idx" ON "notion_id_map"("entidade", "registroId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_stats" ADD CONSTRAINT "lead_stats_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "propostas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_postagemId_fkey" FOREIGN KEY ("postagemId") REFERENCES "postagens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunioes" ADD CONSTRAINT "reunioes_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planilhas_horas" ADD CONSTRAINT "planilhas_horas_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "faturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_receita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_mesId_fkey" FOREIGN KEY ("mesId") REFERENCES "meses_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "faturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_despesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_mesId_fkey" FOREIGN KEY ("mesId") REFERENCES "meses_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meses_financeiros" ADD CONSTRAINT "meses_financeiros_metaAnualId_fkey" FOREIGN KEY ("metaAnualId") REFERENCES "metas_anuais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planner_entradas" ADD CONSTRAINT "planner_entradas_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "planner_entradas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_habito" ADD CONSTRAINT "registros_habito_plannerSemanaId_fkey" FOREIGN KEY ("plannerSemanaId") REFERENCES "planner_entradas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcacoes_habito" ADD CONSTRAINT "marcacoes_habito_habitoId_fkey" FOREIGN KEY ("habitoId") REFERENCES "habitos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcacoes_habito" ADD CONSTRAINT "marcacoes_habito_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "registros_habito"("id") ON DELETE CASCADE ON UPDATE CASCADE;
