import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { apiFetch } from '../lib/api';
import { bancoMock } from '../mocks/banco';
import { renderizarApp } from '../test/renderizarApp';
import { abasDoPerfil, paginaInicial } from './abas';

const ABAS_DO_PROPRIETARIO = [
  'Painel',
  'Mensalistas',
  'Vencimentos',
  'Recebimentos',
  'Despesas',
  'Fluxo de caixa',
];

function titulo(nome: string) {
  return screen.findByRole('heading', { name: nome, level: 1 });
}

describe('abasDoPerfil e paginaInicial', () => {
  it('o Proprietário tem as 6 abas, nesta ordem', () => {
    expect(abasDoPerfil('proprietario').map((a) => a.rotulo)).toEqual(ABAS_DO_PROPRIETARIO);
  });

  it('o Auxiliar tem só Mensalistas, Recebimentos e Despesas', () => {
    expect(abasDoPerfil('auxiliar').map((a) => a.rotulo)).toEqual([
      'Mensalistas',
      'Recebimentos',
      'Despesas',
    ]);
  });

  it('cada perfil abre na sua página inicial', () => {
    expect(paginaInicial('proprietario')).toBe('/painel');
    expect(paginaInicial('auxiliar')).toBe('/recebimentos');
  });
});

describe('casca do app — Proprietário', () => {
  it('abre em /painel, mostra as 6 abas e marca a ativa', async () => {
    renderizarApp('/', { perfil: 'proprietario' });
    expect(await titulo('Painel')).toBeInTheDocument();

    const abas = screen.getByRole('navigation', { name: 'Abas principais' });
    expect(
      within(abas)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(ABAS_DO_PROPRIETARIO);
    expect(within(abas).getByRole('link', { name: 'Painel' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('navega entre as abas', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    await titulo('Painel');
    await userEvent.click(screen.getByRole('link', { name: 'Despesas' }));
    expect(await titulo('Despesas')).toBeInTheDocument();
  });

  it('o sino mostra a contagem de contratos vencidos', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    expect(await screen.findByRole('link', { name: '4 contratos vencidos' })).toHaveAttribute(
      'href',
      '/vencimentos?situacao=vencido',
    );
  });

  it('mostra o usuário, o botão Sair e o rodapé', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    await titulo('Painel');
    expect(screen.getByText('Proprietário')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      '© 2026 EstacionaFácil · Projeto Integrador IV · Universidade de Taubaté',
    );
  });

  it('a busca leva à lista de mensalistas com o texto digitado', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    await titulo('Painel');
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar mensalista ou placa' }),
      'qrs{enter}',
    );
    expect(await titulo('Mensalistas')).toBeInTheDocument();
  });
});

describe('casca do app — Auxiliar', () => {
  it('abre em /recebimentos e vê só 3 abas', async () => {
    renderizarApp('/', { perfil: 'auxiliar' });
    expect(await titulo('Recebimentos')).toBeInTheDocument();

    const abas = screen.getByRole('navigation', { name: 'Abas principais' });
    expect(
      within(abas)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Mensalistas', 'Recebimentos', 'Despesas']);
  });

  it.each(['/painel', '/vencimentos', '/fluxo-de-caixa', '/mensalistas/novo'])(
    'acessar %s (aba de Proprietário) devolve ao Recebimentos',
    async (rota) => {
      renderizarApp(rota, { perfil: 'auxiliar' });
      expect(await titulo('Recebimentos')).toBeInTheDocument();
    },
  );

  it('não vê o sino de vencidos (não tem permissão para essa contagem)', async () => {
    renderizarApp('/recebimentos', { perfil: 'auxiliar' });
    await titulo('Recebimentos');
    expect(screen.queryByRole('link', { name: /vencidos/ })).not.toBeInTheDocument();
  });

  it('pode abrir Mensalistas e Despesas', async () => {
    renderizarApp('/mensalistas', { perfil: 'auxiliar' });
    expect(await titulo('Mensalistas')).toBeInTheDocument();
  });
});

describe('sem sessão', () => {
  it.each(['/', '/painel', '/mensalistas', '/recebimentos'])('%s vai para Entrar', async (rota) => {
    renderizarApp(rota);
    expect(await screen.findByRole('heading', { name: 'Entrar', level: 1 })).toBeInTheDocument();
  });

  it('rota inexistente volta à página inicial do perfil', async () => {
    renderizarApp('/nao-existe', { perfil: 'proprietario' });
    expect(await titulo('Painel')).toBeInTheDocument();
  });

  it('sessão que expira no meio do uso leva ao login com o aviso', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    await titulo('Painel');
    bancoMock.sessao = null;
    await act(async () => {
      await apiFetch('/vencimentos').catch(() => undefined);
    });
    expect(await screen.findByText('Sua sessão expirou. Entre de novo.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrar', level: 1 })).toBeInTheDocument();
  });
});
