import type { Sessao } from '@estacionafacil/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { buscarSessao, fazerLogin, fazerLogout } from '../features/auth/api';

interface ContextoSessao {
  sessao: Sessao | null;
  /** true enquanto o app ainda pergunta ao servidor quem está logado. */
  carregando: boolean;
  /** true depois que o servidor respondeu 401 a uma sessão que existia. */
  expirada: boolean;
  entrar(login: string, senha: string): Promise<Sessao>;
  sair(): Promise<void>;
  /** Esquece a sessão local (o servidor já respondeu 401). */
  expirou(): void;
}

const Contexto = createContext<ContextoSessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const cliente = useQueryClient();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [expirada, setExpirada] = useState(false);

  useEffect(() => {
    let ativo = true;
    buscarSessao()
      .then((s) => ativo && setSessao(s))
      .catch(() => ativo && setSessao(null))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const entrar = useCallback(async (login: string, senha: string) => {
    const s = await fazerLogin(login, senha);
    setSessao(s);
    setExpirada(false);
    return s;
  }, []);

  const sair = useCallback(async () => {
    await fazerLogout().catch(() => undefined);
    setSessao(null);
    cliente.clear();
  }, [cliente]);

  const expirou = useCallback(() => {
    setSessao(null);
    setExpirada(true);
    cliente.clear();
  }, [cliente]);

  const valor = useMemo(
    () => ({ sessao, carregando, expirada, entrar, sair, expirou }),
    [sessao, carregando, expirada, entrar, sair, expirou],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): ContextoSessao {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSessao precisa estar dentro de <SessaoProvider>');
  return contexto;
}
