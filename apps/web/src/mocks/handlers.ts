import {
  adicionarDias,
  deCentavos,
  despesaCriarSchema,
  filtrosCaixaSchema,
  loginSchema,
  mensalistaAtualizarSchema,
  mensalistaCriarSchema,
  normalizarPlaca,
  pagamentoCriarSchema,
  paraCentavos,
  proximoVencimento,
  contaAtualizarSchema,
  recorrenciaAtualizarSchema,
  renovacaoSchema,
  trocarSenhaSchema,
  usuarioAtualizarSchema,
  usuarioCriarSchema,
  type UsuarioItem,
  type CaixaResposta,
  type CodigoErro,
  type FiltrosCaixa,
  type FormaPagamento,
  type MensalistaItem,
  type DespesaItem,
  type DespesasResposta,
  type PagamentoItem,
  type PagamentosResposta,
  type PainelResposta,
  type ResumoSituacao,
  type Situacao,
  type VencimentosResposta,
} from '@estacionafacil/shared';
import { http, HttpResponse } from 'msw';
import {
  bancoMock,
  listarMensalistas,
  montarDetalhe,
  proximoIdHistorico,
  type MensalistaMock,
} from './banco';

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

/**
 * `categoria` e `tipo` valem para totais e tabela; `situacao` só filtra a tabela,
 * para os totais seguirem mostrando as três situações.
 */
function montarVencimentos(url: URL): VencimentosResposta {
  const parametro = (nome: string) => url.searchParams.get(nome) ?? '';
  const tipos = new Map(bancoMock.mensalistas.map((m) => [m.id, m.tipo]));
  const base = listarMensalistas()
    .filter((m) => !parametro('categoria') || m.categoria === parametro('categoria'))
    .filter((m) => !parametro('tipo') || tipos.get(m.id) === parametro('tipo'))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const por = (situacao: Situacao) => resumir(base.filter((i) => i.situacao === situacao));
  return {
    totais: { vencido: por('vencido'), a_vencer: por('a_vencer'), em_dia: por('em_dia') },
    itens: base.filter((i) => !parametro('situacao') || i.situacao === parametro('situacao')),
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

const POR_PAGINA = 10;

/** Como as receitas se dividem por forma de pagamento no mock, em %. O resto vai para o Pix. */
const PROPORCAO_POR_FORMA: [FormaPagamento, number][] = [
  ['pix', 45],
  ['dinheiro', 25],
  ['debito', 15],
  ['credito', 15],
];

/** Meses (AAAA-MM) de `de` até `ate`, inclusive. */
function mesesDoPeriodo(de: string, ate: string): string[] {
  const meses: string[] = [];
  let ano = Number(de.slice(0, 4));
  let mes = Number(de.slice(5, 7));
  const ultimo = ate.slice(0, 7);
  for (let i = 0; i < 120; i += 1) {
    const chave = `${ano}-${String(mes).padStart(2, '0')}`;
    if (chave > ultimo) break;
    meses.push(chave);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return meses;
}

/**
 * Fluxo de caixa por mês inteiro. Tipo e categoria só afetam as receitas (em proporção ao valor
 * dos contratos ativos que atendem ao filtro); as despesas não pertencem a contrato nem veículo,
 * então com filtro o resultado fica `null`.
 */
function montarCaixa(filtros: FiltrosCaixa): CaixaResposta {
  const ativos = listarMensalistas();
  const tipos = new Map(bancoMock.mensalistas.map((m) => [m.id, m.tipo]));
  const somar = (itens: typeof ativos) => itens.reduce((s, i) => s + paraCentavos(i.valor), 0);
  const doFiltro = ativos.filter(
    (i) =>
      (!filtros.tipo || tipos.get(i.id) === filtros.tipo) &&
      (!filtros.categoria || i.categoria === filtros.categoria),
  );
  const filtrado = Boolean(filtros.tipo || filtros.categoria);
  const parte = filtrado ? somar(doFiltro) : 1;
  const todo = filtrado ? somar(ativos) : 1;
  const receitasDoFiltro = (valor: string) =>
    todo === 0 ? 0 : Math.round((paraCentavos(valor) * parte) / todo);

  const serieMensal = mesesDoPeriodo(filtros.de, filtros.ate).map((chave) => {
    const mes = bancoMock.serieMensal.find((m) => m.mes.startsWith(chave));
    return {
      mes: `${chave}-01`,
      receitas: deCentavos(receitasDoFiltro(mes?.receitas ?? '0.00')),
      despesas: mes?.despesas ?? '0.00',
    };
  });
  const receitas = serieMensal.reduce((s, m) => s + paraCentavos(m.receitas), 0);
  const despesas = serieMensal.reduce((s, m) => s + paraCentavos(m.despesas), 0);

  const porForma = PROPORCAO_POR_FORMA.map(([forma, percentual]) => ({
    forma,
    centavos: Math.floor((receitas * percentual) / 100),
  }));
  const resto = receitas - porForma.reduce((s, f) => s + f.centavos, 0);

  return {
    de: filtros.de,
    ate: filtros.ate,
    receitas: deCentavos(receitas),
    despesas: deCentavos(despesas),
    resultado: filtrado ? null : deCentavos(receitas - despesas),
    filtrado,
    serieMensal,
    porForma: porForma.map((f, i) => ({
      forma: f.forma,
      total: deCentavos(f.centavos + (i === 0 ? resto : 0)),
    })),
  };
}

/** Campos com erro de validação, no formato `campos` da API. */
function camposDoZod(erroZod: { issues: { path: PropertyKey[]; message: string }[] }) {
  return Object.fromEntries(erroZod.issues.map((i) => [String(i.path[0]), i.message]));
}

const naoEncontrado = (mensagem = 'Mensalista não encontrado.') =>
  erro(404, 'NAO_ENCONTRADO', mensagem);
const contratoEncerrado = () => erro(409, 'CONTRATO_ENCERRADO', 'Este contrato já foi encerrado.');

/** Conflito de placa ou vaga com outro contrato ativo; null quando está livre. */
function conflito(placa: string | undefined, vaga: string | null | undefined, ignorarId?: number) {
  const outros = bancoMock.mensalistas.filter((m) => m.status === 'ativo' && m.id !== ignorarId);
  if (placa && outros.some((m) => m.placa === placa)) {
    return erro(409, 'PLACA_JA_CADASTRADA', 'Esta placa já tem contrato ativo.', {
      placa: 'Esta placa já tem contrato ativo',
    });
  }
  if (vaga && outros.some((m) => m.vaga?.toLowerCase() === vaga.toLowerCase())) {
    return erro(409, 'VAGA_OCUPADA', 'Esta vaga já está ocupada.', {
      vaga: 'Esta vaga já está ocupada',
    });
  }
  return null;
}

function buscarMensalistas(url: URL) {
  const parametro = (nome: string) => url.searchParams.get(nome) ?? '';
  const busca = parametro('busca').trim().toLowerCase();
  const placaBuscada = normalizarPlaca(busca);
  const pagina = Math.max(1, Number(parametro('pagina')) || 1);
  const tipos = new Map(bancoMock.mensalistas.map((m) => [m.id, m.tipo]));

  const filtrados = listarMensalistas()
    .filter((m) => !parametro('contrato') || m.contratoId === Number(parametro('contrato')))
    .filter(
      (m) =>
        !busca ||
        m.nome.toLowerCase().includes(busca) ||
        (placaBuscada.length >= 3 && m.placa.includes(placaBuscada)),
    )
    .filter((m) => !parametro('situacao') || m.situacao === parametro('situacao'))
    .filter((m) => !parametro('categoria') || m.categoria === parametro('categoria'))
    .filter((m) => !parametro('tipo') || tipos.get(m.id) === parametro('tipo'))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return {
    itens: filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    total: filtrados.length,
    pagina,
    porPagina: POR_PAGINA,
  };
}

function acharPorContrato(id: string): MensalistaMock | undefined {
  return bancoMock.mensalistas.find((m) => m.contratoId === Number(id));
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const entrada = loginSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    const usuario = bancoMock.usuarios.find(
      (u) => u.ativo && u.login === entrada.data.login && u.senha === entrada.data.senha,
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

  http.get('/api/usuarios', () => {
    const bloqueio = exigir('proprietario');
    if (bloqueio) return bloqueio;
    const itens = bancoMock.usuarios
      .map(({ id, nome, login, perfil, ativo }): UsuarioItem => ({
        id,
        nome,
        login,
        perfil,
        ativo,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    return HttpResponse.json({ itens });
  }),

  http.post('/api/usuarios', async ({ request }) => {
    const bloqueio = exigir('proprietario');
    if (bloqueio) return bloqueio;
    const entrada = usuarioCriarSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    if (bancoMock.usuarios.some((u) => u.login === entrada.data.login)) {
      return erro(409, 'LOGIN_EM_USO', 'Este login já está em uso.', {
        login: 'Este login já está em uso',
      });
    }
    const novo = {
      id: Math.max(0, ...bancoMock.usuarios.map((u) => u.id)) + 1,
      nome: entrada.data.nome,
      login: entrada.data.login,
      senha: entrada.data.senha,
      perfil: 'auxiliar' as const,
      ativo: true,
    };
    bancoMock.usuarios.push(novo);
    const { id, nome, login, perfil, ativo } = novo;
    return HttpResponse.json({ id, nome, login, perfil, ativo }, { status: 201 });
  }),

  http.patch('/api/usuarios/:id', async ({ params, request }) => {
    const bloqueio = exigir('proprietario');
    if (bloqueio) return bloqueio;
    const alvo = bancoMock.usuarios.find((u) => u.id === Number(params.id));
    if (!alvo) return naoEncontrado('Usuário não encontrado.');
    if (alvo.perfil !== 'auxiliar') {
      return erro(
        403,
        'SEM_PERMISSAO',
        'O proprietário altera os próprios dados em "Minha conta".',
      );
    }
    const entrada = usuarioAtualizarSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    if (entrada.data.nome !== undefined) alvo.nome = entrada.data.nome;
    if (entrada.data.ativo !== undefined) alvo.ativo = entrada.data.ativo;
    if (entrada.data.senha !== undefined) alvo.senha = entrada.data.senha;
    const { id, nome, login, perfil, ativo } = alvo;
    return HttpResponse.json({ id, nome, login, perfil, ativo });
  }),

  http.patch('/api/conta', async ({ request }) => {
    const bloqueio = exigir();
    if (bloqueio) return bloqueio;
    const entrada = contaAtualizarSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    const eu = bancoMock.usuarios.find((u) => u.id === bancoMock.sessao?.id);
    if (!eu || !bancoMock.sessao) return naoAutenticado();
    eu.nome = entrada.data.nome;
    bancoMock.sessao = { id: eu.id, nome: eu.nome, perfil: eu.perfil };
    return HttpResponse.json(bancoMock.sessao);
  }),

  http.post('/api/conta/senha', async ({ request }) => {
    const bloqueio = exigir();
    if (bloqueio) return bloqueio;
    const entrada = trocarSenhaSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    const eu = bancoMock.usuarios.find((u) => u.id === bancoMock.sessao?.id);
    if (!eu) return naoAutenticado();
    if (eu.senha !== entrada.data.senhaAtual) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', {
        senhaAtual: 'A senha atual não confere',
      });
    }
    eu.senha = entrada.data.novaSenha;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(
    '/api/vencimentos',
    ({ request }) =>
      exigir('proprietario') ?? HttpResponse.json(montarVencimentos(new URL(request.url))),
  ),
  http.get('/api/painel', () => exigir('proprietario') ?? HttpResponse.json(montarPainel())),

  http.get(
    '/api/mensalistas',
    ({ request }) => exigir() ?? HttpResponse.json(buscarMensalistas(new URL(request.url))),
  ),

  http.post('/api/mensalistas', async ({ request }) => {
    const bloqueio = exigir('proprietario');
    if (bloqueio) return bloqueio;
    const entrada = mensalistaCriarSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    const dados = entrada.data;
    const recusado = conflito(dados.placa, dados.vaga);
    if (recusado) return recusado;

    const id = Math.max(0, ...bancoMock.mensalistas.map((m) => m.id)) + 1;
    bancoMock.mensalistas.push({
      id,
      contratoId: id,
      nome: dados.nome,
      telefone: dados.telefone,
      placa: dados.placa,
      categoria: dados.categoria,
      vaga: dados.vaga ?? null,
      vencimento:
        dados.tipo === 'semanal'
          ? adicionarDias(dados.inicio, 7)
          : proximoVencimento(dados.inicio, 'mensal', dados.diaVencimento),
      valor: dados.valor,
      tipo: dados.tipo,
      diaVencimento: dados.diaVencimento,
      inicio: dados.inicio,
      status: 'ativo',
      encerradoEm: null,
      historico: [
        {
          id: proximoIdHistorico(),
          evento: 'criado',
          em: bancoMock.hoje,
          detalhes: null,
          usuario: bancoMock.sessao?.nome ?? null,
        },
      ],
    });
    return HttpResponse.json({ mensalistaId: id, contratoId: id }, { status: 201 });
  }),

  http.get('/api/mensalistas/:id', ({ params }) => {
    const bloqueio = exigir();
    if (bloqueio) return bloqueio;
    const m = bancoMock.mensalistas.find((x) => x.id === Number(params.id));
    return m ? HttpResponse.json(montarDetalhe(m)) : naoEncontrado();
  }),

  http.patch('/api/mensalistas/:id', async ({ params, request }) => {
    const bloqueio = exigir('proprietario');
    if (bloqueio) return bloqueio;
    const m = bancoMock.mensalistas.find((x) => x.id === Number(params.id));
    if (!m) return naoEncontrado();
    const entrada = mensalistaAtualizarSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    if (m.status === 'encerrado') return contratoEncerrado();
    const dados = entrada.data;
    const recusado = conflito(dados.placa, dados.vaga, m.id);
    if (recusado) return recusado;
    if (dados.telefone !== undefined) m.telefone = dados.telefone;
    if (dados.placa !== undefined) m.placa = dados.placa;
    if (dados.vaga !== undefined) m.vaga = dados.vaga;
    if (dados.valor !== undefined) m.valor = dados.valor;
    return HttpResponse.json(montarDetalhe(m));
  }),

  http.post('/api/contratos/:id/renovacao', async ({ params, request }) => {
    const bloqueio = exigir('proprietario');
    if (bloqueio) return bloqueio;
    const m = acharPorContrato(String(params.id));
    if (!m) return naoEncontrado();
    const entrada = renovacaoSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    if (m.status === 'encerrado') return contratoEncerrado();
    for (let i = 0; i < entrada.data.meses; i += 1) {
      m.vencimento = proximoVencimento(m.vencimento, 'mensal', m.diaVencimento);
    }
    m.historico.unshift({
      id: proximoIdHistorico(),
      evento: 'renovado',
      em: bancoMock.hoje,
      detalhes: entrada.data.motivo,
      usuario: bancoMock.sessao?.nome ?? null,
    });
    return HttpResponse.json(montarDetalhe(m));
  }),

  http.post('/api/contratos/:id/encerramento', ({ params }) => {
    const bloqueio = exigir('proprietario');
    if (bloqueio) return bloqueio;
    const m = acharPorContrato(String(params.id));
    if (!m) return naoEncontrado();
    if (m.status === 'encerrado') return contratoEncerrado();
    m.status = 'encerrado';
    m.encerradoEm = bancoMock.hoje;
    m.historico.unshift({
      id: proximoIdHistorico(),
      evento: 'encerrado',
      em: bancoMock.hoje,
      detalhes: null,
      usuario: bancoMock.sessao?.nome ?? null,
    });
    return HttpResponse.json(montarDetalhe(m));
  }),

  http.post('/api/pagamentos', async ({ request }) => {
    const bloqueio = exigir();
    if (bloqueio) return bloqueio;
    const chave = request.headers.get('Idempotency-Key');
    if (!chave) {
      return erro(400, 'CHAVE_IDEMPOTENCIA_AUSENTE', 'Não foi possível identificar o envio.');
    }
    // Repetir a chave devolve o mesmo resultado, sem registrar de novo.
    const anterior = bancoMock.pagamentosPorChave.get(chave);
    if (anterior) return HttpResponse.json(anterior, { status: 201 });

    const entrada = pagamentoCriarSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    const { contratoId, valor, forma, pagoEm } = entrada.data;
    const m = acharPorContrato(String(contratoId));
    if (!m) return naoEncontrado('Contrato não encontrado.');
    if (m.status === 'encerrado') return contratoEncerrado();

    const id = Math.max(0, ...bancoMock.recebimentos.map((r) => r.id)) + 1;
    const pagamento: PagamentoItem = {
      id,
      numero: id,
      mensalista: m.nome,
      placa: m.placa,
      valor,
      forma,
      pagoEm,
    };
    bancoMock.recebimentos.unshift(pagamento);
    m.vencimento = proximoVencimento(m.vencimento, m.tipo, m.diaVencimento);
    m.historico.unshift({
      id: proximoIdHistorico(),
      evento: 'pagamento',
      em: pagoEm,
      detalhes: `Comprovante nº ${id}`,
      usuario: bancoMock.sessao?.nome ?? null,
    });
    const resposta = { pagamento, novoVencimento: m.vencimento };
    bancoMock.pagamentosPorChave.set(chave, resposta);
    return HttpResponse.json(resposta, { status: 201 });
  }),

  http.get('/api/pagamentos', ({ request }) => {
    const bloqueio = exigir();
    if (bloqueio) return bloqueio;
    const parametros = new URL(request.url).searchParams;
    const de = parametros.get('de');
    const ate = parametros.get('ate');
    const itens = bancoMock.recebimentos.filter(
      (r) => (!de || r.pagoEm >= de) && (!ate || r.pagoEm <= ate),
    );
    const resposta: PagamentosResposta = {
      itens,
      total: deCentavos(itens.reduce((soma, r) => soma + paraCentavos(r.valor), 0)),
    };
    return HttpResponse.json(resposta);
  }),

  http.get('/api/pagamentos/:id', ({ params }) => {
    const bloqueio = exigir();
    if (bloqueio) return bloqueio;
    const pagamento = bancoMock.recebimentos.find((r) => r.id === Number(params.id));
    return pagamento ? HttpResponse.json(pagamento) : naoEncontrado('Comprovante não encontrado.');
  }),

  http.get('/api/despesas', ({ request }) => {
    const bloqueio = exigir();
    if (bloqueio) return bloqueio;
    const parametros = new URL(request.url).searchParams;
    const de = parametros.get('de');
    const ate = parametros.get('ate');
    const tipo = parametros.get('tipo');
    const itens = bancoMock.despesas
      .filter((d) => (!de || d.data >= de) && (!ate || d.data <= ate) && (!tipo || d.tipo === tipo))
      .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
    const resposta: DespesasResposta = {
      itens,
      total: deCentavos(itens.reduce((soma, d) => soma + paraCentavos(d.valor), 0)),
    };
    return HttpResponse.json(resposta);
  }),

  http.post('/api/despesas', async ({ request }) => {
    const bloqueio = exigir();
    if (bloqueio) return bloqueio;
    const entrada = despesaCriarSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    const { descricao, valor, tipo, data, diaDoMes } = entrada.data;

    // A despesa fixa nasce com a recorrência que a repete nos meses seguintes.
    let recorrenciaId: number | null = null;
    if (tipo === 'fixa' && diaDoMes !== undefined) {
      recorrenciaId = Math.max(0, ...bancoMock.recorrencias.map((r) => r.id)) + 1;
      bancoMock.recorrencias.push({ id: recorrenciaId, descricao, valor, diaDoMes, ativa: true });
    }
    const despesa: DespesaItem = {
      id: Math.max(0, ...bancoMock.despesas.map((d) => d.id)) + 1,
      descricao,
      valor,
      tipo,
      data,
      registradoPor: bancoMock.sessao?.nome ?? null,
      recorrenciaId,
    };
    bancoMock.despesas.push(despesa);
    return HttpResponse.json({ despesaId: despesa.id, recorrenciaId }, { status: 201 });
  }),

  http.get(
    '/api/recorrencias',
    () => exigir() ?? HttpResponse.json({ itens: bancoMock.recorrencias }),
  ),

  http.patch('/api/recorrencias/:id', async ({ params, request }) => {
    const bloqueio = exigir('proprietario');
    if (bloqueio) return bloqueio;
    const recorrencia = bancoMock.recorrencias.find((r) => r.id === Number(params.id));
    if (!recorrencia) return naoEncontrado('Despesa fixa não encontrada.');
    const entrada = recorrenciaAtualizarSchema.safeParse(await request.json());
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', camposDoZod(entrada.error));
    }
    recorrencia.ativa = entrada.data.ativa;
    return HttpResponse.json(recorrencia);
  }),

  http.get('/api/caixa', ({ request }) => {
    const bloqueio = exigir('proprietario');
    if (bloqueio) return bloqueio;
    const parametros = new URL(request.url).searchParams;
    const entrada = filtrosCaixaSchema.safeParse(
      Object.fromEntries(
        ['de', 'ate', 'tipo', 'categoria']
          .map((nome) => [nome, parametros.get(nome)] as const)
          .filter(([, valor]) => valor),
      ),
    );
    if (!entrada.success) {
      return erro(422, 'DADOS_INVALIDOS', 'Confira o período.', camposDoZod(entrada.error));
    }
    return HttpResponse.json(montarCaixa(entrada.data));
  }),
];
