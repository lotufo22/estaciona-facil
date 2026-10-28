import type { Perfil } from '@estacionafacil/shared';
import type { NomeIcone } from '../components/ui';

export interface AbaDefinicao {
  para: string;
  rotulo: string;
  icone: NomeIcone;
  perfis: readonly Perfil[];
  /** No celular fica sempre à mostra na barra de baixo; as demais vão para "Mais". */
  fixaNoCelular?: boolean;
}

const AMBOS: readonly Perfil[] = ['proprietario', 'auxiliar'];
const SO_PROPRIETARIO: readonly Perfil[] = ['proprietario'];

/** Na ordem da spec §4. O Auxiliar só vê Mensalistas, Recebimentos e Despesas. */
export const ABAS: readonly AbaDefinicao[] = [
  {
    para: '/painel',
    rotulo: 'Painel',
    icone: 'painel',
    perfis: SO_PROPRIETARIO,
    fixaNoCelular: true,
  },
  {
    para: '/mensalistas',
    rotulo: 'Mensalistas',
    icone: 'mensalistas',
    perfis: AMBOS,
    fixaNoCelular: true,
  },
  { para: '/vencimentos', rotulo: 'Vencimentos', icone: 'vencimentos', perfis: SO_PROPRIETARIO },
  {
    para: '/recebimentos',
    rotulo: 'Recebimentos',
    icone: 'recebimentos',
    perfis: AMBOS,
    fixaNoCelular: true,
  },
  { para: '/despesas', rotulo: 'Despesas', icone: 'despesas', perfis: AMBOS },
  { para: '/fluxo-de-caixa', rotulo: 'Fluxo de caixa', icone: 'fluxo', perfis: SO_PROPRIETARIO },
];

export function abasDoPerfil(perfil: Perfil): AbaDefinicao[] {
  return ABAS.filter((aba) => aba.perfis.includes(perfil));
}

/** Quantas abas cabem lado a lado na barra de baixo do celular sem precisar do "Mais". */
export const MAXIMO_SEM_MAIS = 4;

/**
 * Divide as abas do celular: as fixas aparecem na barra, e as outras ficam no "Mais". Quem tem
 * poucas abas (o Auxiliar) vê todas, sem "Mais".
 */
export function abasDoCelular(perfil: Perfil): {
  principais: AbaDefinicao[];
  mais: AbaDefinicao[];
} {
  const todas = abasDoPerfil(perfil);
  if (todas.length <= MAXIMO_SEM_MAIS) return { principais: todas, mais: [] };
  return {
    principais: todas.filter((aba) => aba.fixaNoCelular),
    mais: todas.filter((aba) => !aba.fixaNoCelular),
  };
}

export function paginaInicial(perfil: Perfil): string {
  return perfil === 'proprietario' ? '/painel' : '/recebimentos';
}
