-- Turno do contrato: a mesma vaga numerada pode ter um contrato diurno e um noturno.
CREATE TYPE "turno" AS ENUM ('diurno', 'noturno');

-- Os contratos que já existem eram todos diurnos.
ALTER TABLE "contratos" ADD COLUMN "turno" "turno" NOT NULL DEFAULT 'diurno';

-- Um contrato ativo por vaga E turno (antes: só por vaga). Mantém o nome, que a API usa para
-- reconhecer a violação (`traduzirViolacao`). RLS: a tabela `contratos` já o tem habilitado.
DROP INDEX "contratos_um_ativo_por_vaga";
CREATE UNIQUE INDEX "contratos_um_ativo_por_vaga" ON "contratos"("vaga_id", "turno") WHERE "status" = 'ativo' AND "vaga_id" IS NOT NULL;
