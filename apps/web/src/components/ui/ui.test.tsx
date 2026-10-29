import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Aba } from './Aba';
import { Botao } from './Botao';
import { Campo } from './Campo';
import { CartaoKpi } from './CartaoKpi';
import { Carregando } from './Carregando';
import { EstadoVazio } from './EstadoVazio';
import { EtiquetaSituacao } from './EtiquetaSituacao';
import { MensagemErro } from './MensagemErro';
import { Tabela } from './Tabela';

describe('EtiquetaSituacao', () => {
  it.each([
    ['vencido', 'Em atraso'],
    ['a_vencer', 'A vencer'],
    ['em_dia', 'Em dia'],
  ] as const)('mostra o texto da situação %s (nunca só a cor)', (situacao, texto) => {
    render(<EtiquetaSituacao situacao={situacao} />);
    expect(screen.getByText(texto)).toBeInTheDocument();
  });
});

describe('Campo', () => {
  it('associa o rótulo ao campo', () => {
    render(<Campo rotulo="Nome completo" name="nome" valor="" onChange={() => {}} />);
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
  });

  it('com erro: mensagem com role alert, aria-invalid e descrição acessível', () => {
    render(
      <Campo
        rotulo="Placa"
        name="placa"
        valor="QRS-7T81"
        onChange={() => {}}
        erro="Esta placa já tem contrato ativo"
      />,
    );
    const campo = screen.getByLabelText('Placa');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Esta placa já tem contrato ativo');
    expect(campo).toHaveAccessibleDescription('Esta placa já tem contrato ativo');
  });

  it('sem erro: mostra a ajuda e não marca como inválido', () => {
    render(
      <Campo
        rotulo="Vaga (opcional)"
        name="vaga"
        valor=""
        onChange={() => {}}
        ajuda="Deixe em branco se não tiver vaga fixa."
      />,
    );
    const campo = screen.getByLabelText('Vaga (opcional)');
    expect(campo).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(campo).toHaveAccessibleDescription('Deixe em branco se não tiver vaga fixa.');
  });

  it('avisa a digitação pelo onChange', async () => {
    const onChange = vi.fn();
    render(<Campo rotulo="Nome" name="nome" valor="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Nome'), 'A');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('Botao', () => {
  it('tem altura mínima de 48px (min-h-12)', () => {
    render(<Botao>Salvar</Botao>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass('min-h-12');
  });

  it('é type="button" por padrão, para não enviar formulário sem querer', () => {
    render(<Botao>Salvar</Botao>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'button');
  });

  it('chama o clique e respeita o disabled', async () => {
    const aoClicar = vi.fn();
    const { rerender } = render(<Botao onClick={aoClicar}>Salvar</Botao>);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(aoClicar).toHaveBeenCalledTimes(1);

    rerender(
      <Botao onClick={aoClicar} disabled>
        Salvar
      </Botao>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('a variante secundária é distinta da primária', () => {
    render(
      <>
        <Botao variante="primario">Um</Botao>
        <Botao variante="secundario">Dois</Botao>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Um' }).className).not.toBe(
      screen.getByRole('button', { name: 'Dois' }).className,
    );
  });
});

describe('CartaoKpi', () => {
  it('mostra título, valor, selo de variação e rodapé', () => {
    render(
      <CartaoKpi
        tom="atencao"
        titulo="Contratos vencidos"
        valor="4"
        variacao="+1"
        rodape="R$ 885,00 em aberto"
      />,
    );
    expect(screen.getByText('Contratos vencidos')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('R$ 885,00 em aberto')).toBeInTheDocument();
  });

  it('vira um link para a tela indicada, com a seta, quando recebe "para"', () => {
    render(
      <MemoryRouter>
        <CartaoKpi
          tom="atencao"
          titulo="Contratos vencidos"
          valor="4"
          rodape="em aberto"
          para="/vencimentos?situacao=vencido"
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Contratos vencidos/ });
    expect(link).toHaveAttribute('href', '/vencimentos?situacao=vencido');
  });

  it('sem "para" não é link e não mostra a seta', () => {
    const { container } = render(
      <CartaoKpi tom="primario" titulo="Mensalistas ativos" valor="52" rodape="no total" />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    // só o ícone do cabeçalho; a seta de "leva a outra tela" não aparece
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('funciona sem selo de variação', () => {
    render(<CartaoKpi tom="primario" titulo="Mensalistas ativos" valor="52" rodape="no total" />);
    expect(screen.getByText('52')).toBeInTheDocument();
  });
});

describe('Aba', () => {
  it('marca a aba ativa com aria-current e leva à rota', () => {
    render(
      <MemoryRouter>
        <Aba para="/painel" rotulo="Painel" icone="painel" ativa />
        <Aba para="/mensalistas" rotulo="Mensalistas" icone="mensalistas" ativa={false} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute('href', '/painel');
    expect(screen.getByRole('link', { name: 'Mensalistas' })).not.toHaveAttribute('aria-current');
  });
});

describe('Tabela', () => {
  it('usa cabeçalhos semânticos e legenda para leitores de tela', () => {
    render(
      <Tabela legenda="Lista de mensalistas" cabecalhos={['Mensalista', 'Vencimento']}>
        <tr>
          <td>Joana Prado</td>
          <td>28/10/2026</td>
        </tr>
      </Tabela>,
    );
    expect(screen.getByRole('table', { name: 'Lista de mensalistas' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Vencimento' })).toHaveAttribute(
      'scope',
      'col',
    );
    expect(screen.getByRole('cell', { name: 'Joana Prado' })).toBeInTheDocument();
  });
});

describe('estados da tela', () => {
  it('Carregando avisa com role status', () => {
    render(<Carregando />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('EstadoVazio mostra título, orientação e ação', () => {
    render(
      <EstadoVazio
        titulo="Nenhum mensalista ainda"
        orientacao="Cadastre o primeiro."
        acao={<Botao>Novo mensalista</Botao>}
      />,
    );
    expect(screen.getByText('Nenhum mensalista ainda')).toBeInTheDocument();
    expect(screen.getByText('Cadastre o primeiro.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo mensalista' })).toBeInTheDocument();
  });

  it('MensagemErro anuncia o erro e oferece "Tentar de novo"', async () => {
    const tentar = vi.fn();
    render(<MensagemErro mensagem="Não foi possível carregar." onTentarDeNovo={tentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(tentar).toHaveBeenCalledTimes(1);
  });

  it('MensagemErro sem retentativa não mostra o botão', () => {
    render(<MensagemErro mensagem="Sem permissão." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
