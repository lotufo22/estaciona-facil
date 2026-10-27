import { formatarReais } from '@estacionafacil/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { bancoMock } from '../../mocks/banco';
import { servidor } from '../../mocks/servidor';
import { renderizarApp } from '../../test/renderizarApp';

/** O Testing Library normaliza o espaço não separável do texto da tela; o esperado precisa ser igual. */
const reais = (valor: string) => formatarReais(valor).replace(/\u00a0/g, ' ');

const titulo = () => screen.findByRole('heading', { name: 'Vencimentos', level: 1 });

function totais(nome: string) {
  const bloco = within(screen.getByRole('region', { name: 'Totais' }))
    .getByText(nome)
    .closest('div');
  if (!bloco) throw new Error(`Total "${nome}" não encontrado`);
  return within(bloco);
}

function nomesDaTabela(): string[] {
  const linhas = within(screen.getByRole('table')).getAllByRole('row').slice(1);
  return linhas.map((l) => within(l).getAllByRole('cell')[0]?.textContent ?? '');
}

const chip = (nome: string) => screen.getByRole('button', { name: nome });

describe('aba Vencimentos', () => {
  it('mostra os 3 totais e a tabela ordenada por vencimento', async () => {
    renderizarApp('/vencimentos', { perfil: 'proprietario' });
    await titulo();
    await screen.findByText('Carlos Mendes');

    expect(totais('Vencidos').getByText('4 contratos')).toBeInTheDocument();
    expect(totais('Vencidos').getByText(reais('885.00'))).toBeInTheDocument();
    expect(totais('A vencer').getByText('6 contratos')).toBeInTheDocument();
    expect(totais('A vencer').getByText(reais('1395.00'))).toBeInTheDocument();
    expect(totais('Em dia').getByText('6 contratos')).toBeInTheDocument();
    expect(totais('Em dia').getByText(reais('1260.00'))).toBeInTheDocument();

    const nomes = nomesDaTabela();
    expect(nomes).toHaveLength(16);
    expect(nomes.slice(0, 4)).toEqual([
      'Sérgio Alves',
      'Carlos Mendes',
      'Rita Souza',
      'Beatriz Campos',
    ]);
  });

  it('cada linha mostra a situação em texto', async () => {
    renderizarApp('/vencimentos', { perfil: 'proprietario' });
    const linha = (await screen.findByText('Carlos Mendes')).closest('tr');
    if (!linha) throw new Error('Linha não encontrada');
    expect(within(linha).getByText('10/10/2026')).toBeInTheDocument();
    expect(within(linha).getByText('Em atraso')).toBeInTheDocument();
  });

  it('o filtro "Em atraso" deixa só os contratos vencidos', async () => {
    renderizarApp('/vencimentos', { perfil: 'proprietario' });
    await screen.findByText('Joana Prado');
    expect(chip('Todos')).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(chip('Em atraso'));
    await waitFor(() => expect(screen.queryByText('Joana Prado')).not.toBeInTheDocument());
    expect(nomesDaTabela()).toEqual([
      'Sérgio Alves',
      'Carlos Mendes',
      'Rita Souza',
      'Beatriz Campos',
    ]);
    expect(chip('Em atraso')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Todos')).toHaveAttribute('aria-pressed', 'false');
    // Os totais continuam mostrando as três situações, qualquer que seja o filtro.
    expect(totais('A vencer').getByText('6 contratos')).toBeInTheDocument();
  });

  it('o filtro "A vencer" mostra só os que vencem em até 7 dias', async () => {
    renderizarApp('/vencimentos', { perfil: 'proprietario' });
    await screen.findByText('Joana Prado');
    await userEvent.click(chip('A vencer'));
    await waitFor(() => expect(screen.queryByText('Carlos Mendes')).not.toBeInTheDocument());
    expect(nomesDaTabela()).toHaveLength(6);
    expect(screen.getByText('Joana Prado')).toBeInTheDocument();
  });

  it('o filtro de categoria atualiza a tabela e os totais', async () => {
    renderizarApp('/vencimentos', { perfil: 'proprietario' });
    await screen.findByText('Carlos Mendes');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'Moto');
    await waitFor(() => expect(screen.queryByText('Carlos Mendes')).not.toBeInTheDocument());
    expect(nomesDaTabela().sort()).toEqual(
      ['Eduarda Freitas', 'Otávio Brito', 'Rita Souza', 'Tiago Melo'].sort(),
    );
    expect(totais('Vencidos').getByText('1 contrato')).toBeInTheDocument();
    expect(totais('Vencidos').getByText(reais('120.00'))).toBeInTheDocument();
  });

  it('abrir a URL com ?situacao=vencido já vem filtrado', async () => {
    renderizarApp('/vencimentos?situacao=vencido', { perfil: 'proprietario' });
    await titulo();
    await screen.findByText('Carlos Mendes');
    expect(chip('Em atraso')).toHaveAttribute('aria-pressed', 'true');
    expect(nomesDaTabela()).toHaveLength(4);
  });

  it('o sino da barra leva a esta aba filtrada por vencidos', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    await userEvent.click(await screen.findByRole('link', { name: '4 contratos vencidos' }));
    await titulo();
    await screen.findByText('Carlos Mendes');
    expect(chip('Em atraso')).toHaveAttribute('aria-pressed', 'true');
    expect(nomesDaTabela()).toHaveLength(4);
  });

  it('"Registrar pagamento" leva a Recebimentos com o contrato escolhido', async () => {
    renderizarApp('/vencimentos', { perfil: 'proprietario' });
    await screen.findByText('Carlos Mendes');
    const link = screen.getByRole('link', { name: 'Registrar pagamento de Carlos Mendes' });
    expect(link).toHaveTextContent('Registrar pagamento');
    expect(link).toHaveAttribute('href', '/recebimentos?contrato=1');
    expect(screen.getAllByRole('link', { name: /^Registrar pagamento de / })).toHaveLength(16);

    await userEvent.click(link);
    expect(
      await screen.findByRole('heading', { name: 'Recebimentos', level: 1 }),
    ).toBeInTheDocument();
  });

  it('sem contratos mostra o estado vazio', async () => {
    bancoMock.mensalistas = [];
    renderizarApp('/vencimentos', { perfil: 'proprietario' });
    expect(await screen.findByText('Nenhum contrato encontrado.')).toBeInTheDocument();
  });

  it('exibe Carregando enquanto os dados chegam', async () => {
    renderizarApp('/vencimentos', { perfil: 'proprietario' });
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(await screen.findByText('Carlos Mendes')).toBeInTheDocument();
  });

  it('com erro do servidor mostra a mensagem e "Tentar de novo" refaz a chamada', async () => {
    // O sino da barra também consulta /vencimentos, por isso o erro vale até o clique.
    let falhando = true;
    servidor.use(
      http.get('/api/vencimentos', () =>
        falhando
          ? HttpResponse.json(
              { erro: { codigo: 'ERRO_INTERNO', mensagem: 'Algo deu errado.' } },
              { status: 500 },
            )
          : undefined,
      ),
    );
    renderizarApp('/vencimentos', { perfil: 'proprietario' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado.');
    falhando = false;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Carlos Mendes')).toBeInTheDocument();
  });

  it('o Auxiliar não abre Vencimentos: volta para Recebimentos', async () => {
    renderizarApp('/vencimentos', { perfil: 'auxiliar' });
    expect(
      await screen.findByRole('heading', { name: 'Recebimentos', level: 1 }),
    ).toBeInTheDocument();
  });
});
