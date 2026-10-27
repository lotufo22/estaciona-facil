-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "perfil" AS ENUM ('proprietario', 'auxiliar');

-- CreateEnum
CREATE TYPE "categoria" AS ENUM ('carro', 'moto');

-- CreateEnum
CREATE TYPE "tipo_contrato" AS ENUM ('mensal', 'semanal');

-- CreateEnum
CREATE TYPE "status_contrato" AS ENUM ('ativo', 'encerrado');

-- CreateEnum
CREATE TYPE "forma_pagamento" AS ENUM ('dinheiro', 'pix', 'debito', 'credito');

-- CreateEnum
CREATE TYPE "tipo_despesa" AS ENUM ('fixa', 'variavel');

-- CreateEnum
CREATE TYPE "evento_historico" AS ENUM ('criado', 'renovado', 'pagamento', 'encerrado');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tentativas_login" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "ocorrida_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tentativas_login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensalistas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "arquivado_em" TIMESTAMPTZ(3),

    CONSTRAINT "mensalistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" SERIAL NOT NULL,
    "mensalista_id" INTEGER NOT NULL,
    "placa" TEXT NOT NULL,
    "categoria" "categoria" NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vagas" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "categoria" "categoria" NOT NULL,

    CONSTRAINT "vagas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" SERIAL NOT NULL,
    "mensalista_id" INTEGER NOT NULL,
    "veiculo_id" INTEGER NOT NULL,
    "vaga_id" INTEGER,
    "tipo" "tipo_contrato" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "dia_vencimento" SMALLINT NOT NULL,
    "inicio" DATE NOT NULL,
    "vencimento" DATE NOT NULL,
    "status" "status_contrato" NOT NULL DEFAULT 'ativo',
    "encerrado_em" TIMESTAMPTZ(3),

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" SERIAL NOT NULL,
    "contrato_id" INTEGER NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "forma" "forma_pagamento" NOT NULL,
    "pago_em" DATE NOT NULL,
    "mes_referencia" DATE NOT NULL,
    "registrado_por" INTEGER NOT NULL,
    "chave_idempotencia" TEXT NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recorrencias_despesa" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "dia_do_mes" SMALLINT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recorrencias_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "tipo" "tipo_despesa" NOT NULL,
    "data" DATE NOT NULL,
    "registrado_por" INTEGER,
    "recorrencia_id" INTEGER,
    "competencia" DATE,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_contrato" (
    "id" SERIAL NOT NULL,
    "contrato_id" INTEGER NOT NULL,
    "evento" "evento_historico" NOT NULL,
    "em" TIMESTAMPTZ(3) NOT NULL,
    "usuario_id" INTEGER,
    "detalhes" TEXT,

    CONSTRAINT "historico_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_login_key" ON "usuarios"("login");

-- CreateIndex
CREATE INDEX "sessoes_usuario_id_idx" ON "sessoes"("usuario_id");

-- CreateIndex
CREATE INDEX "sessoes_expira_em_idx" ON "sessoes"("expira_em");

-- CreateIndex
CREATE INDEX "tentativas_login_login_ocorrida_em_idx" ON "tentativas_login"("login", "ocorrida_em");

-- CreateIndex
CREATE INDEX "tentativas_login_ip_ocorrida_em_idx" ON "tentativas_login"("ip", "ocorrida_em");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE INDEX "veiculos_mensalista_id_idx" ON "veiculos"("mensalista_id");

-- CreateIndex
CREATE UNIQUE INDEX "vagas_codigo_key" ON "vagas"("codigo");

-- CreateIndex
CREATE INDEX "contratos_mensalista_id_idx" ON "contratos"("mensalista_id");

-- CreateIndex
CREATE INDEX "contratos_status_vencimento_idx" ON "contratos"("status", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_chave_idempotencia_key" ON "pagamentos"("chave_idempotencia");

-- CreateIndex
CREATE INDEX "pagamentos_contrato_id_idx" ON "pagamentos"("contrato_id");

-- CreateIndex
CREATE INDEX "pagamentos_pago_em_idx" ON "pagamentos"("pago_em");

-- CreateIndex
CREATE INDEX "despesas_data_idx" ON "despesas"("data");

-- CreateIndex
CREATE UNIQUE INDEX "despesas_recorrencia_id_competencia_key" ON "despesas"("recorrencia_id", "competencia");

-- CreateIndex
CREATE INDEX "historico_contrato_contrato_id_em_idx" ON "historico_contrato"("contrato_id", "em");

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_mensalista_id_fkey" FOREIGN KEY ("mensalista_id") REFERENCES "mensalistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_mensalista_id_fkey" FOREIGN KEY ("mensalista_id") REFERENCES "mensalistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_vaga_id_fkey" FOREIGN KEY ("vaga_id") REFERENCES "vagas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_recorrencia_id_fkey" FOREIGN KEY ("recorrencia_id") REFERENCES "recorrencias_despesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_contrato" ADD CONSTRAINT "historico_contrato_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_contrato" ADD CONSTRAINT "historico_contrato_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Garantias que o Prisma não expressa (spec, seção 5). Valem mesmo que a API tenha um defeito.
-- Esta parte é escrita à mão: ao criar a próxima migração, copie-a junto (ver apps/api/README).
-- ---------------------------------------------------------------------------

-- No máximo um contrato ativo por veículo (placa) e por vaga. Encerrar o contrato libera os dois.
CREATE UNIQUE INDEX "contratos_um_ativo_por_veiculo" ON "contratos"("veiculo_id") WHERE "status" = 'ativo';
CREATE UNIQUE INDEX "contratos_um_ativo_por_vaga" ON "contratos"("vaga_id") WHERE "status" = 'ativo' AND "vaga_id" IS NOT NULL;

-- Dinheiro sempre positivo; dia do mês entre 1 e 31.
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_valor_positivo" CHECK ("valor" > 0);
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_dia_vencimento_valido" CHECK ("dia_vencimento" BETWEEN 1 AND 31);
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_valor_positivo" CHECK ("valor" > 0);
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_valor_positivo" CHECK ("valor" > 0);
ALTER TABLE "recorrencias_despesa" ADD CONSTRAINT "recorrencias_valor_positivo" CHECK ("valor" > 0);
ALTER TABLE "recorrencias_despesa" ADD CONSTRAINT "recorrencias_dia_do_mes_valido" CHECK ("dia_do_mes" BETWEEN 1 AND 31);

-- Segurança no Supabase: o Supabase expõe as tabelas por uma API pública própria. Como o acesso é só
-- pelo Express (que conecta com o dono das tabelas, e o dono ignora o RLS), o RLS fica ligado em
-- todas as tabelas, SEM nenhuma política, o que bloqueia qualquer acesso direto por essa API.
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tentativas_login" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mensalistas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "veiculos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vagas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contratos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pagamentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recorrencias_despesa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "despesas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "historico_contrato" ENABLE ROW LEVEL SECURITY;
-- Tabela de controle do próprio Prisma (criada antes da primeira migração): também fica exposta.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
