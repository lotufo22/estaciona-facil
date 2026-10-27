import { formatarReais } from '@estacionafacil/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { servidor } from '../../mocks/servidor';
import { renderizarApp } from '../../test/renderizarApp';

/** O Testing Library normaliza espaços do texto da tela (inclusive o não separável); o esperado precisa ser igual. */
const reais = (valor: string) => formatarReais(valor).replace(/\s/g, ' ');

const AVISO =
  'O resultado só é calculado sem filtro de contrato ou categoria, porque as despesas não pertencem a um deles.';

// O setup fixa o "hoje" dos dados de exemplo (26/10/2026); o relógio real só entra no teste de regressão.
afterEach(() => {
  vi.useRealTimers();
});

const titulo = () => screen.findByRole('heading', { name: 'Fluxo de caixa', level: 1 });

function kpi(nome: string) {
  const cartao = screen.getByText(nome).closest('article');
  if (!cartao) throw new Error(`Cartão "${nome}" não encontrado`);
  return within(cartao);
}

async function abrir() {
  renderizarApp('/fluxo-de-caixa', { perfil: 'proprietario' });
  await titulo();
  await screen.findByText('Receitas do período');
}

function mudarData(rotulo: string, valor: string) {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
}

/** Conta as chamadas a GET /caixa e deixa o mock padrão responder. */
function contarConsultas() {
  const contagem = { total: 0 };
  servidor.use(
    http.get('/api/caixa', () => {
      contagem.total += 1;
      return undefined;
    }),
  );
  return contagem;
}

describe('aba Fluxo de caixa', () => {
  it('usa o "hoje" dos dados de exemplo, mesmo que o relógio esteja em outro mês', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-03-15T15:00:00-03:00'));
    await abrir();
    expect(screen.getByLabelText('De')).toHaveValue('2026-10-01');
    expect(screen.getByLabelText('Até')).toHaveValue('2026-10-31');
    expect(kpi('Receitas do período').getByText(reais('11340.00'))).toBeInTheDocument();
  });

  it('sem filtro mostra receitas, despesas e resultado do mês', async () => {
    await abrir();
    expect(kpi('Receitas do período').getByText(reais('11340.00'))).toBeInTheDocument();
    expect(kpi('Despesas do período').getByText(reais('7980.00'))).toBeInTheDocument();
    expect(kpi('Resultado do período').getByText(reais('3360.00'))).toBeInTheDocument();
    expect(screen.getByLabelText('De')).toHaveValue('2026-10-01');
    expect(screen.getByLabelText('Até')).toHaveValue('2026-10-31');
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('o resultado negativo aparece com sinal', async () => {
    servidor.use(
      http.get('/api/caixa', () =>
        HttpResponse.json({
          de: '2026-10-01',
          ate: '2026-10-31',
          receitas: '630.00',
          despesas: '5930.00',
          resultado: '-5300.00',
          filtrado: false,
          serieMensal: [{ mes: '2026-10-01', receitas: '630.00', despesas: '5930.00' }],
          porForma: [{ forma: 'pix', total: '630.00' }],
        }),
      ),
    );
    await abrir();
    expect(kpi('Resultado do período').getByText(reais('-5300.00'))).toBeInTheDocument();
  });

  it('escolher "Moto" oculta o resultado e explica o motivo', async () => {
    await abrir();
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'Moto');

    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    expect(screen.queryByText('Resultado do período')).not.toBeInTheDocument();
    // As receitas passam a considerar só as motos; as despesas continuam as do período.
    expect(kpi('Receitas do período').queryByText(reais('11340.00'))).not.toBeInTheDocument();
    expect(kpi('Despesas do período').getByText(reais('7980.00'))).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'Todas');
    expect(await screen.findByText('Resultado do período')).toBeInTheDocument();
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('o filtro de tipo de contrato também oculta o resultado', async () => {
    await abrir();
    await userEvent.selectOptions(screen.getByLabelText('Tipo de contrato'), 'Semanal');
    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    expect(screen.queryByText('Resultado do período')).not.toBeInTheDocument();
    // Nenhum contrato semanal no mock: sem receitas e sem divisão por forma.
    await waitFor(() =>
      expect(kpi('Receitas do período').getByText(reais('0.00'))).toBeInTheDocument(),
    );
    expect(await screen.findByText('Sem recebimentos no período.')).toBeInTheDocument();
  });

  it('um período maior soma todos os meses', async () => {
    await abrir();
    mudarData('De', '2026-05-01');
    await waitFor(() =>
      expect(kpi('Receitas do período').getByText(reais('62740.00'))).toBeInTheDocument(),
    );
    expect(kpi('Despesas do período').getByText(reais('45330.00'))).toBeInTheDocument();
    expect(kpi('Resultado do período').getByText(reais('17410.00'))).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /receitas e despesas por mês/i })).toHaveAccessibleName(
      /mai\/26/,
    );
  });

  it('"Até" anterior a "De" mostra erro no campo e não consulta a API', async () => {
    await abrir();
    const consultas = contarConsultas();
    mudarData('Até', '2026-09-01');
    await waitFor(() =>
      expect(screen.getByLabelText('Até')).toHaveAccessibleDescription(
        'A data final não pode ser anterior à data inicial',
      ),
    );
    expect(consultas.total).toBe(0);

    mudarData('Até', '2026-10-31');
    await waitFor(() => expect(screen.getByLabelText('Até')).not.toHaveAccessibleDescription());
  });

  it('data apagada mostra erro no campo', async () => {
    await abrir();
    mudarData('De', '');
    await waitFor(() =>
      expect(screen.getByLabelText('De')).toHaveAccessibleDescription(
        'Data inválida. Use o formato AAAA-MM-DD',
      ),
    );
  });

  it('mostra o gráfico mensal e a divisão por forma de pagamento', async () => {
    await abrir();
    expect(
      screen.getByRole('img', { name: /gráfico de receitas e despesas por mês/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /divisão das receitas por forma de pagamento/i }),
    ).toBeInTheDocument();

    const formas = screen.getByRole('list', { name: 'Receitas por forma de pagamento' });
    const itens = within(formas).getAllByRole('listitem');
    expect(itens).toHaveLength(4);
    expect(itens[0]).toHaveTextContent('Pix');
    expect(itens[0]).toHaveTextContent(reais('5103.00'));
    expect(itens[0]).toHaveTextContent('45%');
  });

  it('exibe Carregando enquanto os dados chegam', async () => {
    renderizarApp('/fluxo-de-caixa', { perfil: 'proprietario' });
    expect(await screen.findByRole('status')).toBeInTheDocument();
    await screen.findByText('Receitas do período');
  });

  it('com erro do servidor mostra a mensagem e "Tentar de novo" refaz a chamada', async () => {
    let falhando = true;
    servidor.use(
      http.get('/api/caixa', () =>
        falhando
          ? HttpResponse.json(
              { erro: { codigo: 'ERRO_INTERNO', mensagem: 'Algo deu errado.' } },
              { status: 500 },
            )
          : undefined,
      ),
    );
    renderizarApp('/fluxo-de-caixa', { perfil: 'proprietario' });
    await titulo();
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado.');
    falhando = false;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Receitas do período')).toBeInTheDocument();
  });

  it('o Auxiliar não abre o Fluxo de caixa: volta para Recebimentos', async () => {
    renderizarApp('/fluxo-de-caixa', { perfil: 'auxiliar' });
    expect(
      await screen.findByRole('heading', { name: 'Recebimentos', level: 1 }),
    ).toBeInTheDocument();
  });
});
