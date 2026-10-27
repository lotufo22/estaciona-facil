import type { Perfil } from '@estacionafacil/shared';
import type { NomeIcone } from '../components/ui';

export interface AbaDefinicao {
  para: string;
  rotulo: string;
  icone: NomeIcone;
  perfis: readonly Perfil[];
}

const AMBOS: readonly Perfil[] = ['proprietario', 'auxiliar'];
const SO_PROPRIETARIO: readonly Perfil[] = ['proprietario'];

/** Na ordem da spec §4. O Auxiliar só vê Mensalistas, Recebimentos e Despesas. */
export const ABAS: readonly AbaDefinicao[] = [
  { para: '/painel', rotulo: 'Painel', icone: 'painel', perfis: SO_PROPRIETARIO },
  { para: '/mensalistas', rotulo: 'Mensalistas', icone: 'mensalistas', perfis: AMBOS },
  { para: '/vencimentos', rotulo: 'Vencimentos', icone: 'vencimentos', perfis: SO_PROPRIETARIO },
  { para: '/recebimentos', rotulo: 'Recebimentos', icone: 'recebimentos', perfis: AMBOS },
  { para: '/despesas', rotulo: 'Despesas', icone: 'despesas', perfis: AMBOS },
  { para: '/fluxo-de-caixa', rotulo: 'Fluxo de caixa', icone: 'fluxo', perfis: SO_PROPRIETARIO },
];

export function abasDoPerfil(perfil: Perfil): AbaDefinicao[] {
  return ABAS.filter((aba) => aba.perfis.includes(perfil));
}

export function paginaInicial(perfil: Perfil): string {
  return perfil === 'proprietario' ? '/painel' : '/recebimentos';
}
