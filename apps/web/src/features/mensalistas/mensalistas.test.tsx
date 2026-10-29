import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { bancoMock } from '../../mocks/banco';
import { servidor } from '../../mocks/servidor';
import { renderizarApp } from '../../test/renderizarApp';

/** Conta as chamadas a uma rota e deixa o mock padrão responder. */
function contarChamadas(metodo: 'post' | 'patch', caminho: string) {
  const contagem = { total: 0 };
  servidor.use(
    http[metodo](caminho, () => {
      contagem.total += 1;
      return undefined;
    }),
  );
  return contagem;
}

function titulo(nome: string) {
  return screen.findByRole('heading', { name: nome, level: 1 });
}

function linhasDaTabela() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

async function preencherCadastro(dados: Partial<Record<string, string>> = {}) {
  const valores = {
    Nome: 'Maria Teste',
    Telefone: '(12) 99999-0000',
    Placa: 'ZZZ-9Z99',
    Vaga: '40',
    Valor: '300.00',
    'Dia do vencimento': '10',
    ...dados,
  };
  for (const [rotulo, texto] of Object.entries(valores)) {
    const campo = screen.getByLabelText(rotulo);
    await userEvent.clear(campo);
    if (texto) await userEvent.type(campo, texto);
  }
  await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'carro');
  await userEvent.selectOptions(screen.getByLabelText('Tipo de contrato'), 'mensal');
}

describe('lista de Mensalistas', () => {
  it('mostra os mensalistas com placa, vaga, vencimento, valor e situação em texto', async () => {
    renderizarApp('/mensalistas', { perfil: 'proprietario' });
    expect(await titulo('Mensalistas')).toBeInTheDocument();
    expect(await screen.findByText('Carlos Mendes')).toBeInTheDocument();
    const linha = screen.getByText('Carlos Mendes').closest('tr');
    if (!linha) throw new Error('Linha não encontrada');
    expect(within(linha).getByText('FGH-4J56')).toBeInTheDocument();
    expect(within(linha).getByText('10/10/2026')).toBeInTheDocument();
    expect(within(linha).getByText('Em atraso')).toBeInTheDocument();
  });

  it.each(['qrs7t81', 'QRS-7T81', 'joana'])(
    'a busca por "%s" encontra Joana Prado',
    async (busca) => {
      renderizarApp('/mensalistas', { perfil: 'proprietario' });
      await screen.findByText('Carlos Mendes');
      await userEvent.type(screen.getByLabelText('Buscar por nome ou placa'), busca);
      await waitFor(() => expect(screen.queryByText('Carlos Mendes')).not.toBeInTheDocument());
      expect(screen.getByText('Joana Prado')).toBeInTheDocument();
      expect(linhasDaTabela()).toHaveLength(1);
    },
  );

  it('o filtro de situação mostra só os vencidos', async () => {
    renderizarApp('/mensalistas', { perfil: 'proprietario' });
    await screen.findByText('Joana Prado');
    await userEvent.selectOptions(screen.getByLabelText('Situação'), 'Em atraso');
    await waitFor(() => expect(screen.queryByText('Joana Prado')).not.toBeInTheDocument());
    expect(linhasDaTabela().map((l) => within(l).getAllByRole('cell')[0]?.textContent)).toEqual(
      expect.arrayContaining(['Carlos Mendes', 'Rita Souza', 'Sérgio Alves', 'Beatriz Campos']),
    );
    expect(linhasDaTabela()).toHaveLength(4);
  });

  it('o filtro de categoria mostra só as motos', async () => {
    renderizarApp('/mensalistas', { perfil: 'proprietario' });
    await screen.findByText('Carlos Mendes');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'Moto');
    await waitFor(() => expect(screen.queryByText('Carlos Mendes')).not.toBeInTheDocument());
    expect(screen.getByText('Rita Souza')).toBeInTheDocument();
  });

  it('divide em páginas de 10', async () => {
    renderizarApp('/mensalistas', { perfil: 'proprietario' });
    await screen.findByText('Carlos Mendes');
    expect(linhasDaTabela()).toHaveLength(10);
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument();
    // Folga maior que o padrão (1 s): com a máquina ocupada, a segunda página demora a chegar.
    await waitFor(() => expect(linhasDaTabela()).toHaveLength(6), { timeout: 5000 });
  });

  it('sem mensalistas mostra o estado vazio com o botão de cadastrar', async () => {
    bancoMock.mensalistas = [];
    renderizarApp('/mensalistas', { perfil: 'proprietario' });
    expect(
      await screen.findByText('Nenhum mensalista ainda. Cadastre o primeiro.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Novo mensalista' }).length).toBeGreaterThan(0);
  });

  it('busca sem resultado diz que nada foi encontrado', async () => {
    renderizarApp('/mensalistas', { perfil: 'proprietario' });
    await screen.findByText('Carlos Mendes');
    await userEvent.type(screen.getByLabelText('Buscar por nome ou placa'), 'xyzxyz');
    expect(
      await screen.findByText('Nenhum mensalista encontrado com esses filtros.'),
    ).toBeInTheDocument();
  });

  it('com erro do servidor mostra a mensagem e "Tentar de novo" refaz a chamada', async () => {
    let chamadas = 0;
    servidor.use(
      http.get('/api/mensalistas', () => {
        chamadas += 1;
        return chamadas === 1
          ? HttpResponse.json(
              { erro: { codigo: 'ERRO_INTERNO', mensagem: 'Algo deu errado.' } },
              { status: 500 },
            )
          : undefined;
      }),
    );
    renderizarApp('/mensalistas', { perfil: 'proprietario' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Carlos Mendes')).toBeInTheDocument();
  });

  it('o Auxiliar vê a lista sem o botão de cadastrar', async () => {
    renderizarApp('/mensalistas', { perfil: 'auxiliar' });
    expect(await screen.findByText('Carlos Mendes')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Novo mensalista' })).not.toBeInTheDocument();
  });

  it('o Auxiliar não abre o cadastro: volta para Recebimentos', async () => {
    renderizarApp('/mensalistas/novo', { perfil: 'auxiliar' });
    expect(await titulo('Recebimentos')).toBeInTheDocument();
  });
});

describe('cadastro de mensalista', () => {
  it('cadastro válido leva ao detalhe do novo mensalista', async () => {
    renderizarApp('/mensalistas/novo', { perfil: 'proprietario' });
    await titulo('Novo mensalista');
    await preencherCadastro();
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar mensalista' }));
    expect(await titulo('Maria Teste')).toBeInTheDocument();
    expect(screen.getByText('ZZZ-9Z99')).toBeInTheDocument();
    expect(screen.getByText('(12) 99999-0000')).toBeInTheDocument();
  });

  it('placa de contrato ativo mostra o erro sob o campo Placa', async () => {
    renderizarApp('/mensalistas/novo', { perfil: 'proprietario' });
    await titulo('Novo mensalista');
    await preencherCadastro({ Placa: 'fgh-4j56' });
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar mensalista' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Placa')).toHaveAccessibleDescription(
        'Esta placa já tem contrato ativo',
      ),
    );
    expect(screen.getByRole('heading', { name: 'Novo mensalista', level: 1 })).toBeInTheDocument();
  });

  it('vaga ocupada mostra o erro sob o campo Vaga', async () => {
    renderizarApp('/mensalistas/novo', { perfil: 'proprietario' });
    await titulo('Novo mensalista');
    await preencherCadastro({ Vaga: '07' });
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar mensalista' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Vaga')).toHaveAccessibleDescription(
        'Esta vaga já está ocupada',
      ),
    );
  });

  it('valor "abc" mostra erro no campo Valor sem chamar a API', async () => {
    const chamadas = contarChamadas('post', '/api/mensalistas');
    renderizarApp('/mensalistas/novo', { perfil: 'proprietario' });
    await titulo('Novo mensalista');
    await preencherCadastro({ Valor: 'abc' });
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar mensalista' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Valor')).toHaveAccessibleDescription(
        /Informe o valor em reais/,
      ),
    );
    expect(chamadas.total).toBe(0);
  });

  it('campos obrigatórios vazios mostram erro em português sem chamar a API', async () => {
    const chamadas = contarChamadas('post', '/api/mensalistas');
    renderizarApp('/mensalistas/novo', { perfil: 'proprietario' });
    await titulo('Novo mensalista');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar mensalista' }));
    expect(await screen.findByText('Informe o nome completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Dia do vencimento')).toHaveAccessibleDescription(
      'O dia do vencimento deve ser de 1 a 31',
    );
    expect(chamadas.total).toBe(0);
  });
});

describe('detalhe do mensalista', () => {
  it('mostra dados, contrato, situação e histórico', async () => {
    renderizarApp('/mensalistas/1', { perfil: 'proprietario' });
    expect(await titulo('Carlos Mendes')).toBeInTheDocument();
    expect(screen.getByText('FGH-4J56')).toBeInTheDocument();
    expect(screen.getByText('Em atraso')).toBeInTheDocument();
    expect(screen.getByText('Contrato criado')).toBeInTheDocument();
  });

  it('mensalista inexistente mostra "não encontrado"', async () => {
    renderizarApp('/mensalistas/999', { perfil: 'proprietario' });
    expect(await screen.findByText('Mensalista não encontrado')).toBeInTheDocument();
  });

  it('o Auxiliar consulta o detalhe sem editar, renovar nem encerrar', async () => {
    renderizarApp('/mensalistas/1', { perfil: 'auxiliar' });
    expect(await titulo('Carlos Mendes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar dados' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renovar contrato' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar contrato' })).not.toBeInTheDocument();
  });

  it('renovar estende o vencimento e registra no histórico', async () => {
    renderizarApp('/mensalistas/1', { perfil: 'proprietario' });
    await titulo('Carlos Mendes');
    await userEvent.click(screen.getByRole('button', { name: 'Renovar contrato' }));
    await userEvent.type(screen.getByLabelText('Motivo'), 'Acordo com o cliente');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar renovação' }));
    expect(await screen.findByText('Em dia')).toBeInTheDocument();
    expect(screen.getByText('10/11/2026')).toBeInTheDocument();
    expect(screen.getByText('Contrato renovado')).toBeInTheDocument();
    expect(screen.getByText('Acordo com o cliente')).toBeInTheDocument();
  });

  it('renovar sem motivo mostra erro no campo e não chama a API', async () => {
    const chamadas = contarChamadas('post', '/api/contratos/:id/renovacao');
    renderizarApp('/mensalistas/1', { perfil: 'proprietario' });
    await titulo('Carlos Mendes');
    await userEvent.click(screen.getByRole('button', { name: 'Renovar contrato' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar renovação' }));
    expect(await screen.findByText('Explique o motivo da renovação')).toBeInTheDocument();
    expect(chamadas.total).toBe(0);
  });

  it('editar dados atualiza o telefone', async () => {
    renderizarApp('/mensalistas/1', { perfil: 'proprietario' });
    await titulo('Carlos Mendes');
    await userEvent.click(screen.getByRole('button', { name: 'Editar dados' }));
    const telefone = screen.getByLabelText('Telefone');
    await userEvent.clear(telefone);
    await userEvent.type(telefone, '12988887777');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('(12) 98888-7777')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument();
  });

  it('editar dados de quem não tem vaga abre o formulário e salva sem mexer na vaga', async () => {
    const mensalista = bancoMock.mensalistas.find((m) => m.id === 1);
    if (!mensalista) throw new Error('mensalista 1 não existe no mock');
    mensalista.vaga = null;

    renderizarApp('/mensalistas/1', { perfil: 'proprietario' });
    await titulo('Carlos Mendes');
    await userEvent.click(screen.getByRole('button', { name: 'Editar dados' }));
    expect(await screen.findByLabelText('Vaga')).toHaveValue('');

    const valor = screen.getByLabelText('Valor');
    await userEvent.clear(valor);
    await userEvent.type(valor, '450');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument(),
    );
    expect(mensalista.valor).toBe('450.00');
    expect(mensalista.vaga).toBeNull();
  });

  it('editar a placa para uma já ativa mostra o erro sob o campo Placa', async () => {
    renderizarApp('/mensalistas/1', { perfil: 'proprietario' });
    await titulo('Carlos Mendes');
    await userEvent.click(screen.getByRole('button', { name: 'Editar dados' }));
    const placa = screen.getByLabelText('Placa');
    await userEvent.clear(placa);
    await userEvent.type(placa, 'KLM-2N90');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Placa')).toHaveAccessibleDescription(
        'Esta placa já tem contrato ativo',
      ),
    );
  });
});

describe('encerrar contrato', () => {
  it('pede confirmação e só chama a API depois de confirmar', async () => {
    const chamadas = contarChamadas('post', '/api/contratos/:id/encerramento');
    renderizarApp('/mensalistas/1', { perfil: 'proprietario' });
    await titulo('Carlos Mendes');

    await userEvent.click(screen.getByRole('button', { name: 'Encerrar contrato' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Encerrar contrato?' });
    expect(chamadas.total).toBe(0);

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(chamadas.total).toBe(0);

    await userEvent.click(screen.getByRole('button', { name: 'Encerrar contrato' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Sim, encerrar contrato',
      }),
    );
    expect(await screen.findByText(/Contrato encerrado em/)).toBeInTheDocument();
    expect(chamadas.total).toBe(1);
    expect(screen.queryByRole('button', { name: 'Encerrar contrato' })).not.toBeInTheDocument();
  });

  it('o mensalista encerrado sai da lista', async () => {
    renderizarApp('/mensalistas/1', { perfil: 'proprietario' });
    await titulo('Carlos Mendes');
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar contrato' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Sim, encerrar contrato',
      }),
    );
    await screen.findByText(/Contrato encerrado em/);
    await userEvent.click(screen.getByRole('link', { name: 'Voltar à lista' }));
    await titulo('Mensalistas');
    await screen.findByText('Joana Prado');
    expect(screen.queryByText('Carlos Mendes')).not.toBeInTheDocument();
  });
});
