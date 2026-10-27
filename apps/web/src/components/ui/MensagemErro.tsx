import { Botao } from './Botao';

interface MensagemErroProps {
  mensagem: string;
  onTentarDeNovo?: () => void;
}

export function MensagemErro({ mensagem, onTentarDeNovo }: MensagemErroProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-atraso bg-atraso-fundo p-6"
    >
      <p className="text-base font-semibold text-atraso">{mensagem}</p>
      {onTentarDeNovo && (
        <Botao variante="secundario" onClick={onTentarDeNovo}>
          Tentar de novo
        </Botao>
      )}
    </div>
  );
}
