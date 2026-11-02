import { estornoSchema } from '@estacionafacil/shared';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Botao } from './ui/Botao';
import { Campo } from './ui/Campo';
import { MensagemErro } from './ui/MensagemErro';

interface DialogoEstornoProps {
  titulo: string;
  /** O que o estorno faz, em linguagem simples (aparece antes do campo Motivo). */
  aviso: string;
  /** Falhar (lançar erro) mantém o diálogo aberto e mostra a mensagem; o pai fecha ao ter sucesso. */
  aoConfirmar: (motivo: string) => Promise<void>;
  aoFechar: () => void;
}

/** Confirmação do estorno: pede o motivo, que fica registrado junto com quem estornou e quando. */
export function DialogoEstorno({ titulo, aviso, aoConfirmar, aoFechar }: DialogoEstornoProps) {
  const idTitulo = useId();
  const [motivo, setMotivo] = useState('');
  const [erroMotivo, setErroMotivo] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoFechar();
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    const resultado = estornoSchema.safeParse({ motivo });
    if (!resultado.success) {
      setErroMotivo(resultado.error.issues[0]?.message);
      return;
    }
    setErroMotivo(undefined);
    setErroGeral(null);
    setEnviando(true);
    try {
      await aoConfirmar(resultado.data.motivo);
    } catch (erro) {
      setErroGeral(
        erro instanceof Error ? erro.message : 'Não foi possível estornar. Tente de novo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        noValidate
        onSubmit={(e) => void confirmar(e)}
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg bg-superficie p-6"
      >
        <h2 id={idTitulo} className="text-xl font-bold">
          {titulo}
        </h2>
        <p className="text-base">{aviso}</p>
        <Campo
          rotulo="Motivo"
          ajuda="Por exemplo: valor digitado errado"
          autoComplete="off"
          autoFocus
          valor={motivo}
          erro={erroMotivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        {erroGeral && <MensagemErro mensagem={erroGeral} />}
        <div className="flex flex-wrap justify-end gap-4">
          <Botao type="button" variante="secundario" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={enviando}>
            Sim, estornar
          </Botao>
        </div>
      </form>
    </div>
  );
}
