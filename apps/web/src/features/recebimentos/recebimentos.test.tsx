import { formatarReais } from '@estacionafacil/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { erro } from '../../mocks/handlers';
import { servidor } from '../../mocks/servidor';
import { renderizarApp } from '../../test/renderizarApp';

/** O Testing Library normaliza espaços do texto da tela (inclusive o não separável); o esperado precisa ser igual. */
const reais = (valor: string) => formatarReais(valor).replace(/\s/g, ' ');

// O setup fixa o "hoje" dos dados de exemplo (26/10/2026); o relógio real só entra no teste de regressão.
afterEach(() => {
  vi.useRealTimers();
});

const titulo = () => screen.findByRole('heading', { name: 'Recebimentos', level: 1 });
const confirmar = () => screen.getByRole('button', { name: 'Confirmar recebimento' });

/** Registra as chamadas a POST /pagamentos (e a chave enviada) e deixa o mock padrão responder. */
function observarPagamentos(atraso = 0) {
  const registro = { chaves: [] as (string | null)[], corpos: [] as unknown[] };
  servidor.use(
    http.post('/api/pagamentos', async ({ request }) => {
      registro.chaves.push(request.headers.get('Idempotency-Key'));
      registro.corpos.push(await request.clone().json());
      if (atraso) await delay(atraso);
      return undefined;
    }),
  );
  return registro;
}

async function escolherMensalista(busca: string, nome: string) {
  await userEvent.type(await screen.findByLabelText('Buscar mensalista por nome ou placa'), busca);
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(nome) }));
}

function lancamentosDoDia() {
  const secao = screen.getByRole('heading', { name: 'Lançamentos do dia' }).closest('section');
  if (!secao) throw new Error('Seção "Lançamentos do dia" não encontrada');
  return within(secao);
}

describe('aba Recebimentos', () => {
  it('usa o "hoje" dos dados de exemplo, mesmo que o relógio esteja em outro dia', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-03-15T15:00:00-03:00'));
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await titulo();
    expect(await lancamentosDoDia().findByText('Carlos Mendes')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
    await userEvent.click(confirmar());
    const comprovante = await screen.findByRole('region', { name: 'Comprovante de recebimento' });
    expect(within(comprovante).getByText('26/10/2026')).toBeInTheDocument();
  });

  it('é a tela inicial do Auxiliar e mostra os lançamentos de hoje', async () => {
    renderizarApp('/', { perfil: 'auxiliar' });
    expect(await titulo()).toBeInTheDocument();
    expect(await lancamentosDoDia().findByText('Carlos Mendes')).toBeInTheDocument();
    expect(lancamentosDoDia().queryByText('Tiago Melo')).not.toBeInTheDocument();
    expect(lancamentosDoDia().getByText(`Total do dia: ${reais('255.00')}`)).toBeInTheDocument();
  });

  it('abrir com ?contrato=<id> preenche o mensalista, Pix e o valor da mensalidade', async () => {
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await titulo();
    const escolhido = await screen.findByRole('region', { name: 'Mensalista escolhido' });
    expect(within(escolhido).getByText('Joana Prado')).toBeInTheDocument();
    expect(within(escolhido).getByText('QRS-7T81')).toBeInTheDocument();
    expect(screen.getByLabelText('Forma de pagamento')).toHaveValue('pix');
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
  });

  it('sem ?contrato= o mensalista é escolhido pela busca, e o valor vem do contrato', async () => {
    renderizarApp('/recebimentos', { perfil: 'auxiliar' });
    await titulo();
    await escolherMensalista('qrs7t81', 'Joana Prado');
    expect(await screen.findByRole('region', { name: 'Mensalista escolhido' })).toHaveTextContent(
      'Joana Prado',
    );
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
  });

  it('?contrato= de um contrato que não existe pede para escolher pela busca', async () => {
    renderizarApp('/recebimentos?contrato=999', { perfil: 'proprietario' });
    expect(await screen.findByText('Contrato não encontrado ou já encerrado.')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar mensalista por nome ou placa')).toBeInTheDocument();
  });

  it.each([
    ['0.00', 'O valor deve ser maior que zero'],
    ['255,00', /duas casas decimais/],
  ])('valor "%s" mostra erro no campo Valor sem chamar a API', async (valor, mensagem) => {
    const registro = observarPagamentos();
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await screen.findByRole('region', { name: 'Mensalista escolhido' });
    const campo = screen.getByLabelText('Valor');
    await userEvent.clear(campo);
    await userEvent.type(campo, valor);
    await userEvent.click(confirmar());
    await waitFor(() => expect(campo).toHaveAccessibleDescription(mensagem));
    expect(registro.chaves).toHaveLength(0);
  });

  it('sem escolher o mensalista pede a escolha e não chama a API', async () => {
    const registro = observarPagamentos();
    renderizarApp('/recebimentos', { perfil: 'auxiliar' });
    await titulo();
    await userEvent.type(screen.getByLabelText('Valor'), '255.00');
    await userEvent.click(confirmar());
    expect(await screen.findByText('Escolha o mensalista')).toBeInTheDocument();
    expect(registro.chaves).toHaveLength(0);
  });

  it('confirmar mostra o comprovante completo e atualiza os lançamentos do dia', async () => {
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await screen.findByRole('region', { name: 'Mensalista escolhido' });
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
    await userEvent.click(confirmar());

    const comprovante = await screen.findByRole('region', { name: 'Comprovante de recebimento' });
    expect(within(comprovante).getByText('Nº 101')).toBeInTheDocument();
    expect(within(comprovante).getByText('Joana Prado')).toBeInTheDocument();
    expect(within(comprovante).getByText('QRS-7T81')).toBeInTheDocument();
    expect(within(comprovante).getByText('Pix')).toBeInTheDocument();
    expect(within(comprovante).getByText('26/10/2026')).toBeInTheDocument();
    expect(within(comprovante).getByText(reais('255.00'))).toBeInTheDocument();
    expect(within(comprovante).getByText('28/11/2026')).toBeInTheDocument();

    expect(await lancamentosDoDia().findByText('Joana Prado')).toBeInTheDocument();
    expect(lancamentosDoDia().getByText(`Total do dia: ${reais('510.00')}`)).toBeInTheDocument();
    // O formulário volta ao início, pronto para o próximo recebimento.
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Mensalista escolhido' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('"Imprimir comprovante" chama window.print', async () => {
    const imprimir = vi.fn();
    vi.stubGlobal('print', imprimir);
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
    await userEvent.click(confirmar());
    await userEvent.click(await screen.findByRole('button', { name: 'Imprimir comprovante' }));
    expect(imprimir).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('clicar numa linha dos lançamentos reabre o comprovante daquele pagamento', async () => {
    renderizarApp('/recebimentos', { perfil: 'auxiliar' });
    await titulo();
    await userEvent.click(
      await lancamentosDoDia().findByRole('button', { name: 'Ver comprovante 100' }),
    );
    const comprovante = await screen.findByRole('region', { name: 'Comprovante de recebimento' });
    expect(within(comprovante).getByText('Nº 100')).toBeInTheDocument();
    expect(within(comprovante).getByText('Carlos Mendes')).toBeInTheDocument();
  });

  it('clique duplo em "Confirmar recebimento" envia uma única chamada', async () => {
    const registro = observarPagamentos(150);
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
    await userEvent.dblClick(confirmar());
    expect(
      await screen.findByRole('region', { name: 'Comprovante de recebimento' }),
    ).toBeInTheDocument();
    expect(registro.chaves).toHaveLength(1);
    expect(registro.chaves[0]).toBeTruthy();
  });

  it('o botão fica desabilitado enquanto o envio está em andamento', async () => {
    observarPagamentos(300);
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
    await userEvent.click(confirmar());
    await waitFor(() => expect(confirmar()).toBeDisabled());
    await screen.findByRole('region', { name: 'Comprovante de recebimento' });
  });

  it('reenvio do mesmo formulário depois de falha de rede usa a mesma Idempotency-Key', async () => {
    const chaves: (string | null)[] = [];
    let primeira = true;
    servidor.use(
      http.post('/api/pagamentos', ({ request }) => {
        chaves.push(request.headers.get('Idempotency-Key'));
        if (primeira) {
          primeira = false;
          return HttpResponse.error();
        }
        return undefined;
      }),
    );
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
    await userEvent.click(confirmar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão com o servidor');

    await userEvent.click(confirmar());
    expect(
      await screen.findByRole('region', { name: 'Comprovante de recebimento' }),
    ).toBeInTheDocument();
    expect(chaves).toHaveLength(2);
    expect(chaves[0]).toBeTruthy();
    expect(chaves[1]).toBe(chaves[0]);
  });

  it('mudar o valor depois da falha de rede usa uma chave nova', async () => {
    const chaves: (string | null)[] = [];
    let primeira = true;
    servidor.use(
      http.post('/api/pagamentos', ({ request }) => {
        chaves.push(request.headers.get('Idempotency-Key'));
        if (primeira) {
          primeira = false;
          return HttpResponse.error();
        }
        return undefined;
      }),
    );
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
    await userEvent.click(confirmar());
    await screen.findByRole('alert');

    const valor = screen.getByLabelText('Valor');
    await userEvent.clear(valor);
    await userEvent.type(valor, '200.00');
    await userEvent.click(confirmar());
    await screen.findByRole('region', { name: 'Comprovante de recebimento' });
    expect(chaves).toHaveLength(2);
    expect(chaves[1]).not.toBe(chaves[0]);
  });

  it('um novo recebimento depois do sucesso usa uma chave nova', async () => {
    const registro = observarPagamentos();
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
    await userEvent.click(confirmar());
    await screen.findByRole('region', { name: 'Comprovante de recebimento' });

    await escolherMensalista('rita', 'Rita Souza');
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('120.00'));
    await userEvent.click(confirmar());
    await waitFor(() => expect(registro.chaves).toHaveLength(2));
    expect(registro.chaves[1]).not.toBe(registro.chaves[0]);
  });

  it('contrato encerrado (409) mostra "Este contrato já foi encerrado."', async () => {
    servidor.use(
      http.post('/api/pagamentos', () =>
        erro(409, 'CONTRATO_ENCERRADO', 'Este contrato já foi encerrado.'),
      ),
    );
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
    await userEvent.click(confirmar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Este contrato já foi encerrado.');
    expect(
      screen.queryByRole('region', { name: 'Comprovante de recebimento' }),
    ).not.toBeInTheDocument();
  });

  it('erro de validação do servidor aparece sob o campo Valor', async () => {
    servidor.use(
      http.post('/api/pagamentos', () =>
        erro(422, 'DADOS_INVALIDOS', 'Confira os campos.', { valor: 'Valor não aceito' }),
      ),
    );
    renderizarApp('/recebimentos?contrato=5', { perfil: 'proprietario' });
    await waitFor(() => expect(screen.getByLabelText('Valor')).toHaveValue('255.00'));
    await userEvent.click(confirmar());
    await waitFor(() =>
      expect(screen.getByLabelText('Valor')).toHaveAccessibleDescription('Valor não aceito'),
    );
  });

  it('com erro ao carregar os lançamentos mostra a mensagem e "Tentar de novo"', async () => {
    let falhando = true;
    servidor.use(
      http.get('/api/pagamentos', () =>
        falhando
          ? HttpResponse.json(
              { erro: { codigo: 'ERRO_INTERNO', mensagem: 'Algo deu errado.' } },
              { status: 500 },
            )
          : undefined,
      ),
    );
    renderizarApp('/recebimentos', { perfil: 'auxiliar' });
    await titulo();
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado.');
    falhando = false;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await lancamentosDoDia().findByText('Carlos Mendes')).toBeInTheDocument();
  });
});
