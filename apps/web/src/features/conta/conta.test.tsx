import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { bancoMock } from '../../mocks/banco';
import { renderizarApp } from '../../test/renderizarApp';

function titulo(nome: string) {
  return screen.findByRole('heading', { name: nome, level: 1 });
}

describe('Minha conta', () => {
  it('abre pelo nome na barra de cima, para qualquer perfil', async () => {
    renderizarApp('/recebimentos', { perfil: 'auxiliar' });
    await titulo('Recebimentos');
    await userEvent.click(screen.getByRole('link', { name: 'Minha conta (Auxiliar)' }));
    expect(await titulo('Minha conta')).toBeInTheDocument();
  });

  it('troca o nome e a barra de cima já mostra o novo', async () => {
    renderizarApp('/conta', { perfil: 'auxiliar' });
    await titulo('Minha conta');
    const campo = screen.getByLabelText('Nome');
    expect(campo).toHaveValue('Auxiliar');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Maria Souza');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(await screen.findByText('Nome atualizado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Minha conta (Maria Souza)' })).toBeInTheDocument();
  });

  it('nome curto mostra erro sem chamar a API', async () => {
    renderizarApp('/conta', { perfil: 'auxiliar' });
    await titulo('Minha conta');
    const campo = screen.getByLabelText('Nome');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Ma');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(await screen.findByText('Informe o nome completo')).toBeInTheDocument();
    expect(bancoMock.usuarios.find((u) => u.login === 'auxiliar')?.nome).toBe('Auxiliar');
  });

  it('troca a senha e limpa os campos', async () => {
    renderizarApp('/conta', { perfil: 'auxiliar' });
    await titulo('Minha conta');
    await userEvent.type(screen.getByLabelText('Senha atual'), 'teste123');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'minha-senha-nova-7');
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
    expect(await screen.findByText('Senha trocada.')).toBeInTheDocument();
    expect(bancoMock.usuarios.find((u) => u.login === 'auxiliar')?.senha).toBe(
      'minha-senha-nova-7',
    );
    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
    expect(screen.getByLabelText('Nova senha')).toHaveValue('');
  });

  it('senha atual errada mostra o erro sob o campo e nada muda', async () => {
    renderizarApp('/conta', { perfil: 'auxiliar' });
    await titulo('Minha conta');
    await userEvent.type(screen.getByLabelText('Senha atual'), 'errada-errada-1');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'minha-senha-nova-7');
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Senha atual')).toHaveAccessibleDescription(
        'A senha atual não confere',
      ),
    );
    expect(bancoMock.usuarios.find((u) => u.login === 'auxiliar')?.senha).toBe('teste123');
  });

  it('senha nova curta mostra erro sob o campo Nova senha', async () => {
    renderizarApp('/conta', { perfil: 'auxiliar' });
    await titulo('Minha conta');
    await userEvent.type(screen.getByLabelText('Senha atual'), 'teste123');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'curta');
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
    expect(
      await screen.findByText('A senha precisa ter pelo menos 10 caracteres'),
    ).toBeInTheDocument();
  });
});
