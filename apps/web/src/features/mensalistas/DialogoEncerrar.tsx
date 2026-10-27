import { useEffect, useId } from 'react';
import { Botao } from '../../components/ui/Botao';
import { MensagemErro } from '../../components/ui/MensagemErro';

interface DialogoEncerrarProps {
  nome: string;
  enviando: boolean;
  erro: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Confirmação antes de encerrar: a ação não tem desfazer na tela. */
export function DialogoEncerrar({
  nome,
  enviando,
  erro,
  onConfirmar,
  onCancelar,
}: DialogoEncerrarProps) {
  const idTitulo = useId();

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCancelar();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onCancelar]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg bg-superficie p-6"
      >
        <h2 id={idTitulo} className="text-xl font-bold">
          Encerrar contrato?
        </h2>
        <p className="text-base">
          O contrato de <strong>{nome}</strong> será encerrado e a vaga ficará livre. Os dados e o
          histórico continuam guardados.
        </p>
        {erro && <MensagemErro mensagem={erro} />}
        <div className="flex flex-wrap justify-end gap-4">
          {/* O foco começa em Cancelar: o caminho seguro é o mais fácil de alcançar. */}
          <Botao variante="secundario" autoFocus onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao onClick={onConfirmar} disabled={enviando}>
            Sim, encerrar contrato
          </Botao>
        </div>
      </div>
    </div>
  );
}
