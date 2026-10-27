import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderizarApp } from '../../test/renderizarApp';

async function preencherEEnviar(login: string, senha: string) {
  if (login) await userEvent.type(screen.getByLabelText('Usuário'), login);
  if (senha) await userEvent.type(screen.getByLabelText('Senha'), senha);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('tela Entrar', () => {
  it('mostra usuário, senha e o botão Entrar', async () => {
    renderizarApp('/entrar');
    expect(await screen.findByRole('heading', { name: 'Entrar', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('Usuário')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('com os campos vazios mostra os erros sob cada campo, sem chamar a API', async () => {
    renderizarApp('/entrar');
    await screen.findByRole('heading', { name: 'Entrar' });
    await preencherEEnviar('', '');
    expect(await screen.findByText('Informe o usuário')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
  });

  it('senha errada mostra "Usuário ou senha incorretos." e continua na tela', async () => {
    renderizarApp('/entrar');
    await screen.findByRole('heading', { name: 'Entrar' });
    await preencherEEnviar('dono', 'errada');
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha incorretos.');
    expect(screen.getByRole('heading', { name: 'Entrar', level: 1 })).toBeInTheDocument();
  });

  it('o Proprietário entra e cai no Painel', async () => {
    renderizarApp('/entrar');
    await screen.findByRole('heading', { name: 'Entrar' });
    await preencherEEnviar('dono', 'teste123');
    expect(await screen.findByRole('heading', { name: 'Painel', level: 1 })).toBeInTheDocument();
  });

  it('o Auxiliar entra e cai em Recebimentos', async () => {
    renderizarApp('/entrar');
    await screen.findByRole('heading', { name: 'Entrar' });
    await preencherEEnviar('auxiliar', 'teste123');
    expect(
      await screen.findByRole('heading', { name: 'Recebimentos', level: 1 }),
    ).toBeInTheDocument();
  });

  it('com ?expirou=1 mostra o aviso de sessão expirada', async () => {
    renderizarApp('/entrar?expirou=1');
    expect(await screen.findByText('Sua sessão expirou. Entre de novo.')).toBeInTheDocument();
  });

  it('quem já está logado e abre /entrar vai para a página inicial', async () => {
    renderizarApp('/entrar', { perfil: 'proprietario' });
    expect(await screen.findByRole('heading', { name: 'Painel', level: 1 })).toBeInTheDocument();
  });

  it('Sair encerra a sessão e volta para Entrar', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    await screen.findByRole('heading', { name: 'Painel' });
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByRole('heading', { name: 'Entrar', level: 1 })).toBeInTheDocument();
  });
});
