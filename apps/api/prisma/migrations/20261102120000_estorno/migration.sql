-- Estorno de recebimentos e despesas: o lançamento não é apagado, fica marcado (quando, por quem e por quê).
-- Migração aditiva: o código anterior continua funcionando com ela aplicada.
-- RLS: `pagamentos` e `despesas` já o têm habilitado; nenhuma tabela nova.

-- Novo evento do histórico do contrato (a migração não o usa, então roda na mesma transação).
ALTER TYPE "evento_historico" ADD VALUE 'estornado';

ALTER TABLE "pagamentos"
  ADD COLUMN "estornado_em" TIMESTAMPTZ(3),
  ADD COLUMN "estornado_por" INTEGER,
  ADD COLUMN "motivo_estorno" TEXT;

ALTER TABLE "despesas"
  ADD COLUMN "estornado_em" TIMESTAMPTZ(3),
  ADD COLUMN "estornado_por" INTEGER,
  ADD COLUMN "motivo_estorno" TEXT;

ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_estornado_por_fkey" FOREIGN KEY ("estornado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_estornado_por_fkey" FOREIGN KEY ("estornado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- As três colunas do estorno ficam todas nulas (lançamento válido) ou todas preenchidas (estornado).
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_estorno_completo" CHECK (
  ("estornado_em" IS NULL) = ("estornado_por" IS NULL) AND ("estornado_em" IS NULL) = ("motivo_estorno" IS NULL)
);
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_estorno_completo" CHECK (
  ("estornado_em" IS NULL) = ("estornado_por" IS NULL) AND ("estornado_em" IS NULL) = ("motivo_estorno" IS NULL)
);
