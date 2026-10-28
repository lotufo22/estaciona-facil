import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Tabela } from '../components/ui/Tabela';
import { renderizarApp } from '../test/renderizarApp';
import { abasDoCelular } from './abas';

/** Faz o `matchMedia` do navegador responder como se a tela fosse (ou não) de celular. */
function simularCelular(ativo: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (consulta: string) => ({
      matches: ativo,
      media: consulta,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
});

const titulo = (nome: string) => screen.findByRole('heading', { name: nome, level: 1 });

describe('abasDoCelular', () => {
  it('o Proprietário vê 3 abas fixas e o resto em "Mais"', () => {
    const { principais, mais } = abasDoCelular('proprietario');
    expect(principais.map((a) => a.rotulo)).toEqual(['Painel', 'Mensalistas', 'Recebimentos']);
    expect(mais.map((a) => a.rotulo)).toEqual(['Vencimentos', 'Despesas', 'Fluxo de caixa']);
  });

  it('o Auxiliar vê as 3 abas dele, sem "Mais"', () => {
    const { principais, mais } = abasDoCelular('auxiliar');
    expect(principais.map((a) => a.rotulo)).toEqual(['Mensalistas', 'Recebimentos', 'Despesas']);
    expect(mais).toEqual([]);
  });
});

describe('casca no celular — Proprietário', () => {
  it('as abas ficam na barra de baixo e há um botão "Mais"', async () => {
    simularCelular(true);
    renderizarApp('/painel', { perfil: 'proprietario' });
    await titulo('Painel');

    const abas = screen.getByRole('navigation', { name: 'Abas principais' });
    expect(
      within(abas)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Painel', 'Mensalistas', 'Recebimentos']);
    expect(within(abas).getByRole('link', { name: 'Painel' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(abas).getByRole('button', { name: 'Mais' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('o "Mais" abre a lista das outras abas, leva a uma delas e fecha', async () => {
    simularCelular(true);
    renderizarApp('/painel', { perfil: 'proprietario' });
    await titulo('Painel');

    await userEvent.click(screen.getByRole('button', { name: 'Mais' }));
    const menu = screen.getByRole('list', { name: 'Mais abas' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Vencimentos', 'Despesas', 'Fluxo de caixa']);

    await userEvent.click(within(menu).getByRole('link', { name: 'Vencimentos' }));
    expect(await titulo('Vencimentos')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Mais abas' })).not.toBeInTheDocument();
    // O botão continua disponível para trocar de aba de novo.
    expect(screen.getByRole('button', { name: 'Mais' })).toBeInTheDocument();
  });

  it('a tecla Esc fecha o menu', async () => {
    simularCelular(true);
    renderizarApp('/painel', { perfil: 'proprietario' });
    await titulo('Painel');

    await userEvent.click(screen.getByRole('button', { name: 'Mais' }));
    expect(screen.getByRole('list', { name: 'Mais abas' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('list', { name: 'Mais abas' })).not.toBeInTheDocument();
  });

  it('o cabeçalho continua com a busca, o sino e o botão Sair', async () => {
    simularCelular(true);
    renderizarApp('/painel', { perfil: 'proprietario' });
    await titulo('Painel');

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /contratos vencidos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });
});

describe('casca no celular — Auxiliar', () => {
  it('mostra as 3 abas dele e nenhum botão "Mais"', async () => {
    simularCelular(true);
    renderizarApp('/recebimentos', { perfil: 'auxiliar' });
    await titulo('Recebimentos');

    const abas = screen.getByRole('navigation', { name: 'Abas principais' });
    expect(
      within(abas)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Mensalistas', 'Recebimentos', 'Despesas']);
    expect(within(abas).queryByRole('button', { name: 'Mais' })).not.toBeInTheDocument();
  });
});

describe('casca no computador', () => {
  it('as abas ficam na barra de cima e não existe o botão "Mais"', async () => {
    simularCelular(false);
    renderizarApp('/painel', { perfil: 'proprietario' });
    await titulo('Painel');

    const abas = screen.getByRole('navigation', { name: 'Abas principais' });
    expect(within(abas).getAllByRole('link')).toHaveLength(6);
    expect(screen.queryByRole('button', { name: 'Mais' })).not.toBeInTheDocument();
  });
});

describe('Tabela em cartões no celular', () => {
  it('gera por CSS o rótulo de cada coluna, para cada linha virar um cartão', () => {
    const { container } = render(
      <Tabela legenda="Teste" cabecalhos={['Mensalista', 'Placa', 'Valor', 'Ação']}>
        <tr>
          <td>Ana</td>
          <td>ABC-1D23</td>
          <td>R$ 255,00</td>
          <td>
            <button type="button">Registrar</button>
          </td>
        </tr>
      </Tabela>,
    );
    const css = container.querySelector('style')?.textContent ?? '';
    expect(css).toContain('@media (max-width:639px)');
    // A primeira coluna (nome) e a de botão ficam sem rótulo; as demais ganham o nome da coluna.
    expect(css).toContain('td:nth-child(2)::before{content:"Placa"}');
    expect(css).toContain('td:nth-child(3)::before{content:"Valor"}');
    expect(css).not.toContain('content:"Mensalista"');
    expect(css).not.toContain('content:"Ação"');
    // A tabela continua semântica para quem a lê no computador ou com leitor de tela.
    expect(screen.getByRole('table', { name: 'Teste' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Placa' })).toBeInTheDocument();
  });

  it('um título de coluna com aspas não quebra o CSS', () => {
    const { container } = render(
      <Tabela legenda="Aspas" cabecalhos={['Nome', 'Valor "bruto"']}>
        <tr>
          <td>x</td>
          <td>y</td>
        </tr>
      </Tabela>,
    );
    expect(container.querySelector('style')?.textContent).toContain('content:"Valor \\"bruto\\""');
  });
});
