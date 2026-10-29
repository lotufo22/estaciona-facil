import type { Perfil } from '@estacionafacil/shared';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Carregando } from '../components/ui/Carregando';
import { Entrar } from '../features/auth/Entrar';
import { MinhaConta } from '../features/conta/MinhaConta';
import { Despesas } from '../features/despesas/Despesas';
import { FluxoDeCaixa } from '../features/fluxo-de-caixa/FluxoDeCaixa';
import { CadastroMensalista } from '../features/mensalistas/CadastroMensalista';
import { DetalheMensalista } from '../features/mensalistas/DetalheMensalista';
import { ListaMensalistas } from '../features/mensalistas/ListaMensalistas';
import { Painel } from '../features/painel/Painel';
import { Recebimentos } from '../features/recebimentos/Recebimentos';
import { Usuarios } from '../features/usuarios/Usuarios';
import { Vencimentos } from '../features/vencimentos/Vencimentos';
import { definirAoExpirar } from '../lib/api';
import { useSessao } from '../lib/sessao';
import { paginaInicial } from './abas';
import { Casca } from './Casca';
import { Provedores } from './Provedores';

const SO_PROPRIETARIO: readonly Perfil[] = ['proprietario'];

/** Deixa passar só quem tem sessão (e, se informado, um dos perfis). */
function RotaProtegida({ perfis }: { perfis?: readonly Perfil[] }) {
  const { sessao, carregando, expirada } = useSessao();
  if (carregando) {
    return (
      <div className="p-8">
        <Carregando texto="Verificando sua sessão…" />
      </div>
    );
  }
  if (!sessao) return <Navigate to={expirada ? '/entrar?expirou=1' : '/entrar'} replace />;
  if (perfis && !perfis.includes(sessao.perfil)) {
    return <Navigate to={paginaInicial(sessao.perfil)} replace />;
  }
  return <Outlet />;
}

function IrParaInicio() {
  const { sessao } = useSessao();
  return sessao ? <Navigate to={paginaInicial(sessao.perfil)} replace /> : null;
}

export function RotasApp() {
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route element={<RotaProtegida />}>
        <Route element={<Casca />}>
          <Route index element={<IrParaInicio />} />

          <Route element={<RotaProtegida perfis={SO_PROPRIETARIO} />}>
            <Route path="/painel" element={<Painel />} />
            <Route path="/mensalistas/novo" element={<CadastroMensalista />} />
            <Route path="/vencimentos" element={<Vencimentos />} />
            <Route path="/fluxo-de-caixa" element={<FluxoDeCaixa />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>

          <Route path="/mensalistas" element={<ListaMensalistas />} />
          <Route path="/mensalistas/:id" element={<DetalheMensalista />} />
          <Route path="/recebimentos" element={<Recebimentos />} />
          <Route path="/despesas" element={<Despesas />} />
          <Route path="/conta" element={<MinhaConta />} />
          <Route path="*" element={<IrParaInicio />} />
        </Route>
      </Route>
    </Routes>
  );
}

/** Quando qualquer chamada responde 401, esquece a sessão; a rota protegida leva ao login com o aviso. */
function OuvinteSessaoExpirada() {
  const { expirou } = useSessao();
  useEffect(() => {
    definirAoExpirar(expirou);
  }, [expirou]);
  return null;
}

/** O app sem o roteador: o navegador usa BrowserRouter e os testes, MemoryRouter. */
export function App() {
  return (
    <Provedores>
      <OuvinteSessaoExpirada />
      <RotasApp />
    </Provedores>
  );
}

export function Roteador() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
