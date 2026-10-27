import { formatarReais } from '@estacionafacil/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bancoMock } from '../../mocks/banco';
import { servidor } from '../../mocks/servidor';
import { renderizarApp } from '../../test/renderizarApp';

/** O Testing Library normaliza espaços do texto da tela (inclusive o não separável); o esperado precisa ser igual. */
const reais = (valor: string) => formatarReais(valor).replace(/\s/g, ' ');

// O setup fixa o "hoje" dos dados de exemplo (26/10/2026); o relógio real só entra no teste de regressão.
afterEach(() => {
  vi.useRealTimers();
});

const titulo = () => screen.findByRole('heading', { name: 'Despesas', level: 1 });
const lancar = () => screen.getByRole('button', { name: 'Lançar despesa' });

function secao(nome: string) {
  const s = screen.getByRole('heading', { name: nome }).closest('section');
  if (!s) throw new Error(`Seção "${nome}" não encontrada`);
  return within(s);
}

function linhasDaLista() {
  return secao('Despesas do mês')
    .getAllByRole('row')
    .slice(1)
    .map((l) =>
      within(l)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    );
}

/** Registra os corpos enviados a POST /despesas e deixa o mock padrão responder. */
function observarLancamentos() {
  const corpos: Record<string, unknown>[] = [];
  servidor.use(
    http.post('/api/despesas', async ({ request }) => {
      corpos.push((await request.clone().json()) as Record<string, unknown>);
      return undefined;
    }),
  );
  return corpos;
}

async function preencher(descricao: string, valor: string) {
  await userEvent.type(screen.getByLabelText('Descrição'), descricao);
  await userEvent.type(screen.getByLabelText('Valor'), valor);
}

describe('aba Despesas', () => {
  it('usa o "hoje" dos dados de exemplo, mesmo que o relógio esteja em outro mês', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-03-15T15:00:00-03:00'));
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    expect(await secao('Despesas do mês').findByText('Aluguel')).toBeInTheDocument();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-10-26');
  });

  it('lista as despesas do mês com tipo e valor, e mostra o total', async () => {
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    await secao('Despesas do mês').findByText('Aluguel');

    const linhas = linhasDaLista();
    expect(linhas).toHaveLength(5);
    expect(linhas).toContainEqual(['10/10/2026', 'Luz', 'Fixa', formatarReais('1150.00')]);
    expect(linhas).toContainEqual([
      '18/10/2026',
      'Manutenção do portão',
      'Variável',
      formatarReais('600.00'),
    ]);
    expect(
      secao('Despesas do mês').getByText(`Total do mês: ${reais('7980.00')}`),
    ).toBeInTheDocument();
  });

  it('só traz as despesas do mês de hoje', async () => {
    bancoMock.despesas.push({
      id: 99,
      descricao: 'Despesa de setembro',
      valor: '100.00',
      tipo: 'variavel',
      data: '2026-09-30',
      registradoPor: 'Proprietário',
      recorrenciaId: null,
    });
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    await secao('Despesas do mês').findByText('Aluguel');
    expect(screen.queryByText('Despesa de setembro')).not.toBeInTheDocument();
    expect(
      secao('Despesas do mês').getByText(`Total do mês: ${reais('7980.00')}`),
    ).toBeInTheDocument();
  });

  it('"Fixa" mostra o campo "Dia do mês" e "Variável" o esconde', async () => {
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    expect(screen.queryByLabelText('Dia do mês')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Fixa');
    expect(screen.getByLabelText('Dia do mês')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Variável');
    expect(screen.queryByLabelText('Dia do mês')).not.toBeInTheDocument();
  });

  it('enviar fixa sem o dia mostra o erro no campo e não chama a API', async () => {
    const corpos = observarLancamentos();
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Fixa');
    await preencher('Internet', '180.00');
    await userEvent.click(lancar());
    await waitFor(() =>
      expect(screen.getByLabelText('Dia do mês')).toHaveAccessibleDescription(
        'Informe o dia do mês em que a despesa se repete',
      ),
    );
    expect(corpos).toHaveLength(0);
  });

  it('descrição vazia e valor "255,00" mostram erro nos campos sem chamar a API', async () => {
    const corpos = observarLancamentos();
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    await userEvent.type(screen.getByLabelText('Valor'), '255,00');
    await userEvent.click(lancar());
    expect(await screen.findByText('Descreva a despesa')).toBeInTheDocument();
    expect(screen.getByLabelText('Valor')).toHaveAccessibleDescription(/duas casas decimais/);
    expect(corpos).toHaveLength(0);
  });

  it('lançar uma despesa variável a coloca na lista e atualiza o total', async () => {
    const corpos = observarLancamentos();
    renderizarApp('/despesas', { perfil: 'auxiliar' });
    await titulo();
    await preencher('Troca de lâmpadas', '120.00');
    await userEvent.click(lancar());

    expect(await screen.findByText('Despesa lançada.')).toBeInTheDocument();
    expect(await secao('Despesas do mês').findByText('Troca de lâmpadas')).toBeInTheDocument();
    expect(
      secao('Despesas do mês').getByText(`Total do mês: ${reais('8100.00')}`),
    ).toBeInTheDocument();
    expect(corpos[0]).toEqual({
      descricao: 'Troca de lâmpadas',
      valor: '120.00',
      tipo: 'variavel',
      data: '2026-10-26',
    });
    // O formulário volta vazio, pronto para a próxima.
    expect(screen.getByLabelText('Descrição')).toHaveValue('');
  });

  it('lançar uma despesa fixa também cria a despesa fixa recorrente', async () => {
    const corpos = observarLancamentos();
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Fixa');
    await preencher('Internet', '180.00');
    await userEvent.type(screen.getByLabelText('Dia do mês'), '15');
    await userEvent.click(lancar());

    expect(await secao('Despesas fixas').findByText('Internet')).toBeInTheDocument();
    expect(secao('Despesas fixas').getByText('Todo dia 15')).toBeInTheDocument();
    expect(await secao('Despesas do mês').findByText('Internet')).toBeInTheDocument();
    expect(corpos[0]).toMatchObject({ tipo: 'fixa', diaDoMes: 15 });
  });

  it('trocar para "Variável" depois de preencher o dia não envia o dia', async () => {
    const corpos = observarLancamentos();
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Fixa');
    await userEvent.type(screen.getByLabelText('Dia do mês'), '15');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Variável');
    await preencher('Conserto', '90.00');
    await userEvent.click(lancar());
    await screen.findByText('Despesa lançada.');
    expect(corpos[0]).not.toHaveProperty('diaDoMes');
  });

  it('o servidor recusando um campo mostra o erro sob ele', async () => {
    servidor.use(
      http.post('/api/despesas', () =>
        HttpResponse.json(
          {
            erro: {
              codigo: 'DADOS_INVALIDOS',
              mensagem: 'Confira os campos.',
              campos: { descricao: 'Descrição já usada' },
            },
          },
          { status: 422 },
        ),
      ),
    );
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    await preencher('Aluguel', '5500.00');
    await userEvent.click(lancar());
    await waitFor(() =>
      expect(screen.getByLabelText('Descrição')).toHaveAccessibleDescription('Descrição já usada'),
    );
  });

  it('o Auxiliar vê as despesas fixas, mas sem o botão de pausar', async () => {
    renderizarApp('/despesas', { perfil: 'auxiliar' });
    await titulo();
    expect(await secao('Despesas fixas').findByText('Aluguel')).toBeInTheDocument();
    expect(secao('Despesas fixas').getAllByText('Ativa')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Pausar|Retomar/ })).not.toBeInTheDocument();
  });

  it('o Proprietário pausa uma despesa fixa e a linha passa a "Pausada"', async () => {
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    await userEvent.click(await screen.findByRole('button', { name: 'Pausar Aluguel' }));

    const linha = (await secao('Despesas fixas').findByText('Pausada')).closest('tr');
    if (!linha) throw new Error('Linha não encontrada');
    expect(within(linha).getByText('Aluguel')).toBeInTheDocument();
    expect(within(linha).getByRole('button', { name: 'Retomar Aluguel' })).toBeInTheDocument();
    expect(secao('Despesas fixas').getAllByText('Ativa')).toHaveLength(2);

    await userEvent.click(within(linha).getByRole('button', { name: 'Retomar Aluguel' }));
    await waitFor(() => expect(secao('Despesas fixas').getAllByText('Ativa')).toHaveLength(3));
    expect(secao('Despesas fixas').queryByText('Pausada')).not.toBeInTheDocument();
  });

  it('sem despesas no mês mostra o estado vazio', async () => {
    bancoMock.despesas = [];
    renderizarApp('/despesas', { perfil: 'proprietario' });
    expect(await screen.findByText('Nenhuma despesa neste mês.')).toBeInTheDocument();
  });

  it('exibe Carregando enquanto a lista chega', async () => {
    renderizarApp('/despesas', { perfil: 'proprietario' });
    expect(await screen.findAllByRole('status')).not.toHaveLength(0);
    await titulo();
    expect(await secao('Despesas do mês').findByText('Aluguel')).toBeInTheDocument();
  });

  it('com erro ao carregar a lista mostra a mensagem e "Tentar de novo" refaz a chamada', async () => {
    let falhando = true;
    servidor.use(
      http.get('/api/despesas', () =>
        falhando
          ? HttpResponse.json(
              { erro: { codigo: 'ERRO_INTERNO', mensagem: 'Algo deu errado.' } },
              { status: 500 },
            )
          : undefined,
      ),
    );
    renderizarApp('/despesas', { perfil: 'proprietario' });
    await titulo();
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado.');
    falhando = false;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await secao('Despesas do mês').findByText('Aluguel')).toBeInTheDocument();
  });
});
