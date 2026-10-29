import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { bancoMock } from '../../mocks/banco';
import { renderizarApp } from '../../test/renderizarApp';

function titulo(nome: string) {
  return screen.findByRole('heading', { name: nome, level: 1 });
}

describe('aba Usuários', () => {
  it('o Proprietário vê a aba e a lista com o login de cada um', async () => {
    renderizarApp('/painel', { perfil: 'proprietario' });
    await titulo('Painel');
    await userEvent.click(screen.getByRole('link', { name: 'Usuários' }));
    await titulo('Usuários');
    const tabela = await screen.findByRole('table', { name: 'Usuários cadastrados' });
    expect(within(tabela).getByText('dono')).toBeInTheDocument();
    expect(within(tabela).getByText('auxiliar')).toBeInTheDocument();
  });

  it('o Auxiliar não tem a aba e é levado de volta ao digitar o endereço', async () => {
    renderizarApp('/usuarios', { perfil: 'auxiliar' });
    await titulo('Recebimentos');
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument();
  });

  it('cadastra um auxiliar e ele aparece na lista', async () => {
    renderizarApp('/usuarios', { perfil: 'proprietario' });
    await titulo('Usuários');
    await userEvent.type(screen.getByLabelText('Nome completo'), 'Carlos Souza');
    await userEvent.type(screen.getByLabelText('Login'), 'carlos');
    await userEvent.type(screen.getByLabelText('Senha inicial'), 'senha-do-carlos-1');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar auxiliar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Carlos Souza cadastrado');
    const tabela = await screen.findByRole('table', { name: 'Usuários cadastrados' });
    expect(await within(tabela).findByText('Carlos Souza')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveValue('');
  });

  it('login já usado mostra o erro sob o campo Login', async () => {
    renderizarApp('/usuarios', { perfil: 'proprietario' });
    await titulo('Usuários');
    await userEvent.type(screen.getByLabelText('Nome completo'), 'Outro Auxiliar');
    await userEvent.type(screen.getByLabelText('Login'), 'auxiliar');
    await userEvent.type(screen.getByLabelText('Senha inicial'), 'senha-do-carlos-1');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar auxiliar' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Login')).toHaveAccessibleDescription(
        'Este login já está em uso',
      ),
    );
  });

  it('senha curta e login inválido mostram erro sem chamar a API', async () => {
    renderizarApp('/usuarios', { perfil: 'proprietario' });
    await titulo('Usuários');
    const antes = bancoMock.usuarios.length;
    await userEvent.type(screen.getByLabelText('Nome completo'), 'Carlos Souza');
    await userEvent.type(screen.getByLabelText('Login'), 'a b');
    await userEvent.type(screen.getByLabelText('Senha inicial'), 'curta');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar auxiliar' }));
    expect(await screen.findByText(/Use de 3 a 30 letras minúsculas/)).toBeInTheDocument();
    expect(screen.getByText('A senha precisa ter pelo menos 10 caracteres')).toBeInTheDocument();
    expect(bancoMock.usuarios).toHaveLength(antes);
  });

  it('desativa e reativa um auxiliar', async () => {
    renderizarApp('/usuarios', { perfil: 'proprietario' });
    await titulo('Usuários');
    await userEvent.click(await screen.findByRole('button', { name: 'Desativar Auxiliar' }));
    const tabela = screen.getByRole('table', { name: 'Usuários cadastrados' });
    expect(await within(tabela).findByText('Desativado')).toBeInTheDocument();
    expect(bancoMock.usuarios.find((u) => u.login === 'auxiliar')?.ativo).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Reativar Auxiliar' }));
    await waitFor(() =>
      expect(bancoMock.usuarios.find((u) => u.login === 'auxiliar')?.ativo).toBe(true),
    );
  });

  it('redefine a senha de um auxiliar', async () => {
    renderizarApp('/usuarios', { perfil: 'proprietario' });
    await titulo('Usuários');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Redefinir a senha de Auxiliar' }),
    );
    await userEvent.type(screen.getByLabelText('Nova senha de Auxiliar'), 'senha-nova-do-aux-1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }));
    await waitFor(() =>
      expect(bancoMock.usuarios.find((u) => u.login === 'auxiliar')?.senha).toBe(
        'senha-nova-do-aux-1',
      ),
    );
    expect(screen.queryByLabelText('Nova senha de Auxiliar')).not.toBeInTheDocument();
  });

  it('senha curta na redefinição mostra o erro da API', async () => {
    renderizarApp('/usuarios', { perfil: 'proprietario' });
    await titulo('Usuários');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Redefinir a senha de Auxiliar' }),
    );
    await userEvent.type(screen.getByLabelText('Nova senha de Auxiliar'), 'curta');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }));
    expect(
      await screen.findByText('A senha precisa ter pelo menos 10 caracteres'),
    ).toBeInTheDocument();
  });
});
