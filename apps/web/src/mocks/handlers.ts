import {
  deCentavos,
  loginSchema,
  paraCentavos,
  type CodigoErro,
  type MensalistaItem,
  type PainelResposta,
  type ResumoSituacao,
  type Situacao,
  type VencimentosResposta,
} from '@estacionafacil/shared';
import { http, HttpResponse } from 'msw';
import { bancoMock, listarMensalistas } from './banco';

export function erro(
  status: number,
  codigo: CodigoErro,
  mensagem: string,
  campos?: Record<string, string>,
) {
  return HttpResponse.json({ erro: { codigo, mensagem, campos } }, { status });
}

export const naoAutenticado = () => erro(401, 'NAO_AUTENTICADO', 'Entre para continuar.');
export const semPermissao = () =>
  erro(403, 'SEM_PERMISSAO', 'Você não tem permissão para acessar esta página.');

/** Resposta de erro quando falta login ou perfil; null quando o acesso é permitido. */
export function exigir(perfil?: 'proprietario') {
  if (!bancoMock.sessao) return naoAutenticado();
  if (perfil && bancoMock.sessao.perfil !== perfil) return semPermissao();
  return null;
}

function resumir(itens: MensalistaItem[]): ResumoSituacao {
  const centavos = itens.reduce((soma, i) => soma + paraCentavos(i.valor), 0);
  return { quantidade: itens.length, total: deCentavos(centavos) };
}

function montarVencimentos(): VencimentosResposta {
  const itens = listarMensalistas().sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const por = (situacao: Situacao) => resumir(itens.filter((i) => i.situacao === situacao));
  return {
    totais: { vencido: por('vencido'), a_vencer: por('a_vencer'), em_dia: por('em_dia') },
    itens,
  };
}

function montarPainel(): PainelResposta {
  const itens = listarMensalistas();
  const por = (situacao: Situacao) => itens.filter((i) => i.situacao === situacao);
  const atual = bancoMock.serieMensal.at(-1);
  const anterior = bancoMock.serieMensal.at(-2);
  if (!atual) throw new Error('Mock sem série mensal');
  const resultadoDe = (m: { receitas: string; despesas: string }) =>
    paraCentavos(m.receitas) - paraCentavos(m.despesas);
  const resultado = resultadoDe(atual);
  const anteriorCentavos = anterior ? resultadoDe(anterior) : 0;
  return {
    mensalistasAtivos: itens.length,
    novosNoMes: 2,
    vencidos: resumir(por('vencido')),
    aVencer: resumir(por('a_vencer')),
    resultadoDoMes: {
      receitas: atual.receitas,
      despesas: atual.despesas,
      resultado: deCentavos(resultado),
      variacao:
        anteriorCentavos === 0
          ? null
          : Math.round(((resultado - anteriorCentavos) / Math.abs(anteriorCentavos)) * 100),
    },
    serieMensal: bancoMock.serieMensal,
    situacao: {
      emDia: por('em_dia').length,
      aVencer: por('a_vencer').length,
      vencido: por('vencido').length,
    },
    ultimosRecebimentos: bancoMock.recebimentos.slice(0, 5),
  };
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const entrada = loginSchema.safeParse(await request.json());
    if (!entrada.success) {
      const campos = Object.fromEntries(
        entrada.error.issues.map((i) => [String(i.path[0]), i.message]),
      );
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', campos);
    }
    const usuario = bancoMock.usuarios.find(
      (u) => u.login === entrada.data.login && u.senha === entrada.data.senha,
    );
    if (!usuario) return erro(401, 'CREDENCIAIS_INVALIDAS', 'Usuário ou senha incorretos.');
    bancoMock.sessao = { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil };
    return HttpResponse.json(bancoMock.sessao);
  }),

  http.post('/api/auth/logout', () => {
    bancoMock.sessao = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/auth/me', () =>
    bancoMock.sessao ? HttpResponse.json(bancoMock.sessao) : naoAutenticado(),
  ),

  http.get(
    '/api/vencimentos',
    () => exigir('proprietario') ?? HttpResponse.json(montarVencimentos()),
  ),
  http.get('/api/painel', () => exigir('proprietario') ?? HttpResponse.json(montarPainel())),
];
