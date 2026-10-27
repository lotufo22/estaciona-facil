import { formatarPlaca, formatarReais, type FormaPagamento } from '@estacionafacil/shared';
import type { ReactNode } from 'react';
import { Botao } from '../../components/ui/Botao';
import { Carregando } from '../../components/ui/Carregando';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { formatarData } from '../../lib/formatar';
import { usePagamento } from './api';

export const NOME_DA_FORMA: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Débito',
  credito: 'Crédito',
};

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-borda py-2">
      <dt className="text-base text-texto-suave">{rotulo}</dt>
      <dd className="text-right text-base font-semibold">{children}</dd>
    </div>
  );
}

interface ComprovanteProps {
  numero: number;
  /** Só existe logo depois do recebimento; reabrir um comprovante antigo não o mostra. */
  novoVencimento?: string;
  aoNovoRecebimento: () => void;
}

/** O que sai na impressão: só esta seção aparece (ver `@media print` em estilos.css). */
export function Comprovante({ numero, novoVencimento, aoNovoRecebimento }: ComprovanteProps) {
  const consulta = usePagamento(numero);

  if (consulta.isError) {
    return (
      <MensagemErro
        mensagem={
          consulta.error instanceof Error
            ? consulta.error.message
            : 'Não foi possível carregar o comprovante.'
        }
        onTentarDeNovo={() => void consulta.refetch()}
      />
    );
  }
  if (!consulta.data) return <Carregando texto="Carregando o comprovante…" />;

  const p = consulta.data;
  return (
    <section
      aria-label="Comprovante de recebimento"
      className="comprovante-imprimivel flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6"
    >
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-primaria">EstacionaFácil</p>
        <h2 className="text-xl font-bold">Comprovante de recebimento</h2>
        <p className="text-base">{`Nº ${p.numero}`}</p>
      </div>
      <dl className="flex flex-col">
        <Linha rotulo="Mensalista">{p.mensalista}</Linha>
        <Linha rotulo="Placa">{formatarPlaca(p.placa)}</Linha>
        <Linha rotulo="Forma de pagamento">{NOME_DA_FORMA[p.forma]}</Linha>
        <Linha rotulo="Data">{formatarData(p.pagoEm)}</Linha>
        <Linha rotulo="Valor">{formatarReais(p.valor)}</Linha>
        {novoVencimento && (
          <Linha rotulo="Próximo vencimento">{formatarData(novoVencimento)}</Linha>
        )}
      </dl>
      <div className="nao-imprimir flex flex-wrap gap-4">
        <Botao onClick={() => window.print()}>Imprimir comprovante</Botao>
        <Botao variante="secundario" onClick={aoNovoRecebimento}>
          Novo recebimento
        </Botao>
      </div>
    </section>
  );
}
