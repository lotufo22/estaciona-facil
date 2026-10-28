import { hojeEmSaoPaulo } from '@estacionafacil/shared';
import { criarPrisma, type PrismaClient } from '../../apps/api/src/prisma';
import { gerarDespesasRecorrentes } from '../../apps/api/src/servicos/recorrencias';

/**
 * Função agendada (às 03:00 UTC, meia-noite em Brasília; veja `netlify.toml`): lança a despesa fixa
 * do mês para quem já chegou ao dia. É idempotente: rodar de novo no mesmo dia não duplica nada, e
 * rodar depois do dia recupera um dia em que a função não rodou.
 *
 * O ponto de entrada (`functions/gerar-despesas.mts`) só tem `export default`, pelo mesmo motivo da `api`.
 */

/** Gera as despesas fixas do dia de `agora` (em São Paulo) e devolve quantos lançamentos criou. */
export async function gerarDespesasDoDia(
  prisma: PrismaClient,
  agora: Date = new Date(),
): Promise<number> {
  return gerarDespesasRecorrentes(prisma, hojeEmSaoPaulo(agora));
}

/** Conecta, gera e fecha a conexão. Devolve quantos lançamentos criou. */
export async function executar(): Promise<number> {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL não está definida nas variáveis do site.');
  const prisma = criarPrisma(url, { maximoDeConexoes: 1 });
  try {
    return await gerarDespesasDoDia(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

export async function executarEResponder() {
  const criadas = await executar();
  console.log(`Despesas fixas lançadas: ${criadas}`);
  return new Response(JSON.stringify({ criadas }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
