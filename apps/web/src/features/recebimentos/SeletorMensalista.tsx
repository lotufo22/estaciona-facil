import { formatarPlaca, type MensalistaItem } from '@estacionafacil/shared';
import { useEffect, useState } from 'react';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { EtiquetaSituacao } from '../../components/ui/EtiquetaSituacao';
import { formatarData } from '../../lib/formatar';
import { useMensalistas } from '../mensalistas/api';

const ESPERA_DA_BUSCA_MS = 300;
const MINIMO_DE_LETRAS = 2;

interface SeletorMensalistaProps {
  escolhido: MensalistaItem | null;
  /** Mensagem sob o campo quando falta escolher (ou o servidor recusou o contrato). */
  erro?: string;
  /** Aviso quando o contrato da URL não foi encontrado. */
  aviso?: string;
  aoEscolher: (mensalista: MensalistaItem) => void;
  aoTrocar: () => void;
}

/** Escolhe o mensalista por nome ou placa; o Auxiliar também usa, então só consulta a lista. */
export function SeletorMensalista({
  escolhido,
  erro,
  aviso,
  aoEscolher,
  aoTrocar,
}: SeletorMensalistaProps) {
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');

  useEffect(() => {
    const espera = setTimeout(() => setBuscaAplicada(busca.trim()), ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [busca]);

  const buscando = !escolhido && buscaAplicada.length >= MINIMO_DE_LETRAS;
  const resultados = useMensalistas({ busca: buscaAplicada }, { habilitado: buscando });

  if (escolhido) {
    return (
      <section
        aria-label="Mensalista escolhido"
        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-borda bg-fundo p-4"
      >
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold">{escolhido.nome}</p>
          <p className="text-base">{formatarPlaca(escolhido.placa)}</p>
          <p className="flex flex-wrap items-center gap-2 text-base text-texto-suave">
            {`Vence em ${formatarData(escolhido.vencimento)}`}
            <EtiquetaSituacao situacao={escolhido.situacao} />
          </p>
        </div>
        <Botao variante="secundario" onClick={aoTrocar}>
          Trocar mensalista
        </Botao>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {aviso && <p className="text-base text-alerta">{aviso}</p>}
      <Campo
        rotulo="Buscar mensalista por nome ou placa"
        type="search"
        autoComplete="off"
        valor={busca}
        erro={erro}
        onChange={(e) => setBusca(e.target.value)}
      />
      {buscando && resultados.data && (
        <ul className="flex flex-col gap-2">
          {resultados.data.itens.length === 0 && (
            <li className="text-base text-texto-suave">Nenhum mensalista encontrado.</li>
          )}
          {resultados.data.itens.map((m) => (
            <li key={m.contratoId}>
              <Botao
                variante="secundario"
                className="w-full justify-between"
                onClick={() => aoEscolher(m)}
              >
                {`${m.nome} · ${formatarPlaca(m.placa)}`}
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
