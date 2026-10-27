import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { SessaoProvider } from '../lib/sessao';

export function criarClienteDeConsulta(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false } },
  });
}

export function Provedores({ children }: { children: ReactNode }) {
  const [cliente] = useState(criarClienteDeConsulta);
  return (
    <QueryClientProvider client={cliente}>
      <SessaoProvider>{children}</SessaoProvider>
    </QueryClientProvider>
  );
}
