import { formatarReais } from '@estacionafacil/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { servidor } from '../../mocks/servidor';
import { renderizarApp } from '../../test/renderizarApp';

/** O Testing Library normaliza o espaço não separável do texto da tela; o esperado precisa ser igual. */
const reais = (valor: string) => formatarReais(valor).replace(/\u00a0/g, ' ');

function kpi(titulo: string) {
  const cartao = screen.getByText(titulo).closest('article');
  if (!cartao) throw new Error(`Cartão "${titulo}" não encontrado`);
  return within(cartao);
}

describe('aba Painel', () => {
  it('mostra os 4 KPIs com os valores do mock', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    expect(await screen.findByText('Mensalistas ativos')).toBeInTheDocument();

    expect(kpi('Mensalistas ativos').getByText('16')).toBeInTheDocument();
    expect(kpi('Contratos vencidos').getByText('4')).toBeInTheDocument();
    expect(kpi('Contratos vencidos').getByText(`${reais('885.00')} em aberto`)).toBeInTheDocument();
    expect(kpi('A vencer em 7 dias').getByText('6')).toBeInTheDocument();
    expect(kpi('Resultado do mês').getByText(reais('3360.00'))).toBeInTheDocument();
  });

  it('mostra a situação dos contratos com texto', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    const secao = (await screen.findByRole('heading', { name: 'Situação dos contratos' })).closest(
      'section',
    );
    if (!secao) throw new Error('Seção não encontrada');
    expect(within(secao).getByText('Em dia')).toBeInTheDocument();
    expect(within(secao).getByText('A vencer')).toBeInTheDocument();
    expect(within(secao).getByText('Em atraso')).toBeInTheDocument();
  });

  it('mostra "Últimos recebimentos" com 5 linhas', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    const secao = (await screen.findByRole('heading', { name: 'Últimos recebimentos' })).closest(
      'section',
    );
    if (!secao) throw new Error('Seção não encontrada');
    const linhas = within(secao).getAllByRole('row').slice(1);
    expect(linhas).toHaveLength(5);
    expect(within(secao).getByText('Carlos Mendes')).toBeInTheDocument();
  });

  it('mostra o gráfico de receitas e despesas', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    expect(
      await screen.findByRole('img', { name: /receitas e despesas por mês/i }),
    ).toBeInTheDocument();
  });

  it('exibe Carregando enquanto os dados chegam', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(await screen.findByText('Mensalistas ativos')).toBeInTheDocument();
  });

  it('com erro 500 mostra a mensagem e "Tentar de novo" refaz a chamada', async () => {
    let chamadas = 0;
    servidor.use(
      http.get('/api/painel', () => {
        chamadas += 1;
        return chamadas === 1
          ? HttpResponse.json(
              { erro: { codigo: 'ERRO_INTERNO', mensagem: 'Algo deu errado.' } },
              { status: 500 },
            )
          : undefined;
      }),
    );
    renderizarApp('/painel', { perfil: 'proprietario' });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Algo deu errado.');

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Mensalistas ativos')).toBeInTheDocument();
    expect(chamadas).toBe(2);
  });
});
