# EstacionaFácil Fase 1 — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a Fase 1 do EstacionaFácil: o proprietário sabe quem são os mensalistas, quando cada contrato vence, quem está em atraso e qual foi o resultado do mês.

**Architecture:** Monorepo npm workspaces com `packages/shared` (regras puras, schemas Zod e tipos), `apps/web` (React) e `apps/api` (Express). O front nasce contra Mock Service Worker (marco M1, 06/11) e passa para a API real depois. A API roda como uma única função Netlify (`criarApp()` é compartilhado com o servidor local) e o banco é PostgreSQL no Supabase.

**Tech Stack:** TypeScript, React, Vite, Tailwind, React Router, TanStack Query, React Hook Form, Zod, Recharts, MSW, Express, Prisma, PostgreSQL, argon2, Vitest, Testing Library, Supertest, Playwright, GitHub Actions, Netlify.

**Spec:** `docs/superpowers/specs/2026-10-26-estacionafacil-fase1-design.md` (leia junto; este plano referencia as seções pelo número).

## Global Constraints

- Nomes dos pacotes: `@estacionafacil/shared`, `@estacionafacil/web`, `@estacionafacil/api`. Todo texto visível ao usuário em português do Brasil; `lang="pt-BR"`.
- Abas, nesta ordem e com estes nomes: **Painel, Mensalistas, Vencimentos, Recebimentos, Despesas, Fluxo de caixa**. O Auxiliar vê só Mensalistas, Recebimentos e Despesas. Proprietário abre em `/painel`, Auxiliar em `/recebimentos`.
- Dinheiro: `NUMERIC(12,2)` no banco; texto decimal na API (`"255.00"`); nunca `number` de ponto flutuante para somar. Datas `AAAA-MM-DD`; fuso `America/Sao_Paulo`.
- Situação do contrato é calculada, nunca gravada: `vencido` se o vencimento já passou; `a_vencer` se faltam 0 a 7 dias; `em_dia` nos demais casos.
- Erros da API: `{ "erro": { "codigo", "mensagem", "campos" } }`, mensagem em português simples. 409: `PLACA_JA_CADASTRADA`, `VAGA_OCUPADA`, `CONTRATO_ENCERRADO`.
- `POST /pagamentos` exige `Idempotency-Key`. Rotas que alteram dados exigem o cabeçalho `X-Estaciona-App: 1` (anti-CSRF). Cookie de sessão `httpOnly`, `Secure`, `SameSite=Lax`, expira em 12 h de inatividade.
- Login: 5 tentativas a cada 15 minutos por login e IP, contadas em `tentativas_login`; senhas com `argon2id`; sem senha padrão.
- RLS ligado em todas as tabelas, sem nenhuma política. Segredos só em variáveis de ambiente; o repositório tem só `.env.example`.
- Interface: Inter; base 16px; contraste de texto ≥ 4,5:1; alvos de clique ≥ 48px de altura; situação sempre com texto, nunca só cor. Tokens de cor exatamente os da seção 7 da spec.
- Despesa fixa mensal: função agendada às `03:00 UTC`, idempotente, limite de 30 s.
- Fluxo de trabalho: uma branch por tarefa (`feature/<nome>`), Conventional Commits em português. Commits ficam locais; **não fazer push nem abrir Pull Request sem o usuário pedir**.
- **Publicação em produção na Netlify é proibida neste plano.** Só ocorre depois do roteiro da seção 9 da spec, por decisão do usuário.

## Review Focus

Entradas que a spec implica mas nenhum critério de aceite exercita. Cada linha tem o teste na tarefa dona.

1. **Vencimento no dia 29, 30 ou 31 em mês curto e ano bissexto** (contrato e despesa fixa): deve cair no último dia do mês e voltar ao dia certo no mês seguinte. → Tarefas 1 e 15.
2. **Pagar um contrato muito atrasado**: cada pagamento cobre um mês a partir do vencimento atual, não a partir de hoje; três meses de atraso continuam vencidos depois de um pagamento. → Tarefa 14.
3. **Placa em formatos diferentes** (minúsculas, hífen, espaços, formato antigo `ABC-1234`): normaliza antes de comparar, para a duplicidade ser detectada. → Tarefas 1, 2 e 13.
4. **Contrato encerrado**: pagar, renovar ou encerrar de novo dá 409 `CONTRATO_ENCERRADO`; a mesma placa e a mesma vaga podem ser usadas em novo contrato. → Tarefas 13 e 14.
5. **Valores inválidos**: `"255,00"`, `"0.00"`, negativo e mais de duas casas dão 422 no campo `valor`, na API e no formulário. → Tarefas 2, 8 e 14.

---

## Marco M1 (06/11): front-end completo com mocks — Tarefas 1 a 10
## Marco M2 (02/12): API real e testes de aceitação — Tarefas 11 a 17
## Marco M3 (09/12): documentação e empacotamento Netlify — Tarefa 18

---

### Task 1: Monorepo, CI e regras puras do domínio

**Files:**
- Create: `package.json` (workspaces `apps/*`, `packages/*`), `tsconfig.base.json`, `.gitignore`, `.env.example`, `eslint.config.js`, `.prettierrc`, `.github/workflows/ci.yml`
- Create: `packages/shared/package.json`, `packages/shared/src/{datas,dinheiro,placa,situacao,index}.ts`
- Test: `packages/shared/src/{datas,dinheiro,placa,situacao}.test.ts`

**Interfaces:**
- Produces (todas exportadas por `@estacionafacil/shared`):
  - `AVISO_DIAS = 7`; `type Situacao = 'em_dia' | 'a_vencer' | 'vencido'`; `type TipoContrato = 'mensal' | 'semanal'`
  - `situacaoDoContrato(vencimento: string, hoje: string, avisoDias = AVISO_DIAS): Situacao`
  - `proximoVencimento(vencimentoAtual: string, tipo: TipoContrato, diaVencimento: number): string`
  - `hojeEmSaoPaulo(agora: Date = new Date()): string`
  - `paraCentavos(valor: string): number`, `deCentavos(centavos: number): string`, `formatarReais(valor: string): string`
  - `normalizarPlaca(texto: string): string`, `formatarPlaca(placa: string): string`

- [ ] **Step 1: Write the failing tests**

`situacao.test.ts`: `situacaoDoContrato('2026-10-25','2026-10-26')` → `'vencido'`; `('2026-10-26','2026-10-26')` → `'a_vencer'`; `('2026-11-02','2026-10-26')` → `'a_vencer'` (7 dias); `('2026-11-03','2026-10-26')` → `'em_dia'`.
`datas.test.ts`: `proximoVencimento('2026-10-05','mensal',5)` → `'2026-11-05'`; `('2026-01-31','mensal',31)` → `'2026-02-28'`; `('2028-01-31','mensal',31)` → `'2028-02-29'`; `('2026-02-28','mensal',31)` → `'2026-03-31'`; `('2026-10-05','semanal',5)` → `'2026-10-12'`; `hojeEmSaoPaulo(new Date('2026-10-27T02:30:00Z'))` → `'2026-10-26'`.
`dinheiro.test.ts`: `paraCentavos('255.00')` → `25500`; `deCentavos(25500)` → `'255.00'`; `formatarReais('11340.00')` → `'R$ 11.340,00'`.
`placa.test.ts`: `normalizarPlaca(' qrs-7t81 ')` → `'QRS7T81'`; `normalizarPlaca('abc-1234')` → `'ABC1234'`; `formatarPlaca('QRS7T81')` → `'QRS-7T81'`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @estacionafacil/shared`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Scaffold and implement**

Criar o monorepo e o pacote `shared` (Vitest, TypeScript estrito). Implementar as funções acima em aritmética de inteiros e strings, sem `Date` local. `proximoVencimento` mensal usa o `diaVencimento` limitado ao último dia do mês alvo. CI (`ci.yml`) roda `npm ci`, lint, `tsc --noEmit` e testes em Pull Requests e na `main`.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -w @estacionafacil/shared && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git checkout -b feature/base-e-dominio
git add -A && git commit -m "feat: cria monorepo, CI e regras puras do domínio"
```

---

### Task 2: Schemas Zod, enums, tipos de resposta e códigos de erro

**Files:**
- Create: `packages/shared/src/{enums,schemas,tipos,erros}.ts`
- Test: `packages/shared/src/schemas.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: `normalizarPlaca`, `Situacao`, `TipoContrato` (Tarefa 1).
- Produces:
  - `PERFIS = ['proprietario','auxiliar']`, `CATEGORIAS = ['carro','moto']`, `FORMAS_PAGAMENTO = ['dinheiro','pix','debito','credito']`, `TIPOS_DESPESA = ['fixa','variavel']`
  - `CODIGOS_ERRO` (união literal): `PLACA_JA_CADASTRADA`, `VAGA_OCUPADA`, `CONTRATO_ENCERRADO`, `CREDENCIAIS_INVALIDAS`, `MUITAS_TENTATIVAS`, `SEM_PERMISSAO`, `NAO_AUTENTICADO`, `NAO_ENCONTRADO`, `DADOS_INVALIDOS`, `CHAVE_IDEMPOTENCIA_AUSENTE`
  - Schemas: `loginSchema {login, senha}`, `mensalistaCriarSchema {nome, telefone, placa, categoria, vaga?, tipo, valor, diaVencimento, inicio}`, `mensalistaAtualizarSchema` (parcial: `telefone, placa, vaga, valor`), `renovacaoSchema {motivo, meses}`, `pagamentoCriarSchema {contratoId, valor, forma, pagoEm}`, `despesaCriarSchema {descricao, valor, tipo, data, diaDoMes?}`, `filtrosCaixaSchema {de, ate, tipo?, categoria?}`
  - Tipos de entrada, por `z.infer`: `MensalistaCriarEntrada`, `MensalistaAtualizarEntrada`, `RenovacaoEntrada`, `PagamentoEntrada`, `DespesaEntrada`, `FiltrosCaixa`
  - Tipos: `ErroApi`, `Sessao {id, nome, perfil}`, `MensalistaItem {id, nome, telefone, placa, categoria, vaga: string|null, vencimento, valor, situacao, contratoId}`, `PagamentoItem {id, numero, mensalista, placa, valor, forma, pagoEm}`, `PainelResposta`, `CaixaResposta`, `VencimentosResposta`

- [ ] **Step 1: Write the failing tests**

`schemas.test.ts`: `mensalistaCriarSchema` aceita `{nome:'Joana Prado', telefone:'(12) 99999-0000', placa:'qrs-7t81', categoria:'carro', vaga:'12', tipo:'mensal', valor:'255.00', diaVencimento:5, inicio:'2026-10-26'}` e devolve `placa:'QRS7T81'` e `telefone:'12999990000'`. Rejeita, com erro no campo `valor`: `'255,00'`, `'0.00'`, `'-5.00'`, `'255.001'`. Rejeita `diaVencimento: 32` e `placa:'XX'`. `pagamentoCriarSchema` rejeita `forma:'cheque'`. `despesaCriarSchema` exige `diaDoMes` (1 a 31) só quando `tipo === 'fixa'`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @estacionafacil/shared -- schemas`
Expected: FAIL.

- [ ] **Step 3: Implement** os schemas com transformações (placa e telefone normalizados) e `valor` por `/^\d+\.\d{2}$/` maior que zero. Os tipos de resposta são `interface` e refletem a seção 6 da spec; `PainelResposta` e `CaixaResposta` seguem a seção 5 (campos `resultado: string | null` e `filtrado: boolean` em `CaixaResposta`).

- [ ] **Step 4: Run to verify pass**

Run: `npm test -w @estacionafacil/shared`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: adiciona schemas, enums, tipos e códigos de erro compartilhados"
```

---

### Task 3: Web — base, tokens e componentes de interface

**Files:**
- Create: `apps/web/{package.json,vite.config.ts,tailwind.config.ts,index.html}`, `apps/web/src/{main.tsx,estilos.css}`
- Create: `apps/web/src/components/ui/{Botao,Campo,EtiquetaSituacao,CartaoKpi,Aba,Tabela,EstadoVazio,Carregando,MensagemErro}.tsx`
- Test: `apps/web/src/components/ui/ui.test.tsx`

**Interfaces:**
- Consumes: `Situacao` (Tarefa 1).
- Produces:
  - `<Botao variante="primario" | "secundario" onClick type disabled>`
  - `<Campo rotulo valor onChange erro? ajuda? name type? />` (rótulo associado ao input; `erro` troca a borda e exibe a mensagem com `role="alert"`)
  - `<EtiquetaSituacao situacao: Situacao />` (textos "Em dia", "A vencer", "Em atraso")
  - `<CartaoKpi tom: 'primario'|'atencao'|'positivo' titulo valor variacao? rodape />`
  - `<Aba para rotulo icone ativa />`, `<EstadoVazio titulo orientacao acao? />`, `<MensagemErro mensagem onTentarDeNovo? />`

- [ ] **Step 1: Write the failing tests**

`ui.test.tsx`: `EtiquetaSituacao` renderiza o texto "Em atraso" para `vencido`, "A vencer" e "Em dia"; `Campo` com `erro="Esta placa já tem contrato ativo"` expõe a mensagem com `role="alert"` e o input tem `aria-invalid="true"`; `Botao` tem altura mínima de 48px (classe `min-h-12`); `CartaoKpi` mostra título, valor e o selo `variacao`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @estacionafacil/web -- ui`
Expected: FAIL.

- [ ] **Step 3: Implement** o projeto Vite com Vitest e Testing Library (jsdom). `tailwind.config.ts` define os tokens da seção 7 da spec como cores nomeadas (`primaria`, `primaria-escura`, `primaria-clara`, `destaque`, `texto`, `texto-suave`, `fundo`, `superficie`, `borda`, `ok`, `ok-fundo`, `alerta`, `alerta-fundo`, `atraso`, `atraso-fundo`, `barra`, `barra-texto`, `barra-icone`, `barra-ativa`) e a fonte Inter. Ícones como componentes SVG locais (painel, mensalistas, vencimentos, recebimentos, despesas, fluxo, alerta, busca, seta).

- [ ] **Step 4: Run to verify pass**

Run: `npm test -w @estacionafacil/web -- ui`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git checkout -b feature/web-componentes
git add -A && git commit -m "feat: cria base do front e componentes de interface"
```

---

### Task 4: Web — casca, rotas com guarda, sessão, Entrar e mocks de autenticação

**Files:**
- Create: `apps/web/src/app/{Roteador,Casca,BarraSuperior,Rodape,CabecalhoPagina,Provedores}.tsx`, `apps/web/src/lib/{api,sessao}.ts`
- Create: `apps/web/src/features/auth/{Entrar.tsx,api.ts}`
- Create: `apps/web/src/mocks/{browser.ts,servidor.ts,handlers.ts,banco.ts}`
- Test: `apps/web/src/app/casca.test.tsx`, `apps/web/src/lib/api.test.ts`

**Interfaces:**
- Consumes: `Sessao`, `ErroApi`, `CODIGOS_ERRO`, `loginSchema` (Tarefa 2); componentes da Tarefa 3.
- Produces:
  - `apiFetch<T>(caminho: string, opcoes?: { metodo?: 'GET'|'POST'|'PATCH'; corpo?: unknown; idempotencia?: string }): Promise<T>`; lança `class ErroApiCliente { status: number; codigo: string; mensagem: string; campos?: Record<string,string> }`; adiciona `X-Estaciona-App: 1` nas escritas; redireciona para `/entrar?expirou=1` em 401
  - `useSessao(): { sessao: Sessao | null; entrar(login: string, senha: string): Promise<void>; sair(): Promise<void> }`
  - `abasDoPerfil(perfil: 'proprietario' | 'auxiliar'): { para: string; rotulo: string }[]`; `paginaInicial(perfil): string`
  - `bancoMock` (estado em memória, reiniciável com `reiniciarBancoMock()`) e `handlers: HttpHandler[]` do MSW; variável `VITE_USAR_MOCKS` liga o mock no navegador

- [ ] **Step 1: Write the failing tests**

`casca.test.tsx`: perfil `proprietario` vê as 6 abas na ordem da seção 4 da spec e abre em `/painel`; perfil `auxiliar` vê apenas Mensalistas, Recebimentos e Despesas, abre em `/recebimentos`, e acessar `/fluxo-de-caixa` redireciona para `/recebimentos`; sem sessão, qualquer rota vai para `/entrar`; o sino mostra a contagem de vencidos **só para o Proprietário** (o Auxiliar não tem permissão de ler essa contagem e não vê o sino).
`api.test.ts`: escrita envia `X-Estaciona-App: 1`; resposta 422 vira `ErroApiCliente` com `campos`; 401 redireciona para `/entrar?expirou=1`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w @estacionafacil/web -- casca api`
Expected: FAIL.

- [ ] **Step 3: Implement** a casca conforme seção 4 (barra superior escura, abas com ícone, busca, sino, usuário, cabeçalho de página e rodapé "© 2026 EstacionaFácil · Projeto Integrador IV · Universidade de Taubaté"). Mocks de `POST /auth/login`, `POST /auth/logout` e `GET /auth/me` com os usuários fictícios `proprietario`/`auxiliar` (senha `teste123`, só no mock). Mensagem de login inválido: "Usuário ou senha incorretos." Rotas conforme seção 7; `Entrar` mostra o aviso "Sua sessão expirou. Entre de novo." quando `?expirou=1`.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -w @estacionafacil/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git checkout -b feature/web-casca
git add -A && git commit -m "feat: adiciona casca com abas, rotas por perfil, login e mocks de autenticação"
```

---

### Task 5: Web — aba Painel (com mocks)

**Files:**
- Create: `apps/web/src/features/painel/{Painel.tsx,api.ts,GraficoReceitaDespesa.tsx,GraficoSituacao.tsx}`
- Modify: `apps/web/src/mocks/handlers.ts`, `apps/web/src/mocks/banco.ts` (dados de exemplo)
- Test: `apps/web/src/features/painel/painel.test.tsx`

**Interfaces:**
- Consumes: `PainelResposta` (Tarefa 2), `CartaoKpi`, `EtiquetaSituacao`, `formatarReais`, `apiFetch`.
- Produces: `usePainel(): UseQueryResult<PainelResposta>`; mock de `GET /painel`.

- [ ] **Step 1: Write the failing test**

`painel.test.tsx` (com o servidor MSW): mostra 4 KPIs com títulos "Mensalistas ativos", "Contratos vencidos", "A vencer em 7 dias" e "Resultado do mês", com os valores do mock (vencidos `4`, `R$ 885,00 em aberto`; resultado `R$ 3.360,00`); mostra "Últimos recebimentos" com 5 linhas; durante o carregamento exibe `Carregando`; com o mock respondendo 500, exibe `MensagemErro` e o botão "Tentar de novo" refaz a chamada.

- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/web -- painel` → FAIL.
- [ ] **Step 3: Implement** a página: 4 `CartaoKpi` (tons: primário, atenção, primário, positivo), gráfico de receitas e despesas por mês (Recharts), situação dos contratos e últimos recebimentos. Dados do mock: os do protótipo (Carlos Mendes, Rita Souza, Joana Prado etc.).
- [ ] **Step 4: Run to verify pass** — `npm test -w @estacionafacil/web -- painel` → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/web-painel && git add -A && git commit -m "feat: adiciona aba Painel com mocks"`

---

### Task 6: Web — aba Mensalistas (lista, cadastro, detalhe, renovar, encerrar)

**Files:**
- Create: `apps/web/src/features/mensalistas/{ListaMensalistas,CadastroMensalista,DetalheMensalista,DialogoEncerrar}.tsx` e `apps/web/src/features/mensalistas/api.ts`
- Modify: `apps/web/src/mocks/handlers.ts`
- Test: `apps/web/src/features/mensalistas/mensalistas.test.tsx`

**Interfaces:**
- Consumes: `MensalistaItem`, `mensalistaCriarSchema`, `renovacaoSchema`, `ErroApiCliente`, `normalizarPlaca`, `formatarPlaca`, `Campo`, `Botao`.
- Produces: `useMensalistas(filtros: { busca?: string; situacao?: Situacao; categoria?: 'carro'|'moto'; tipo?: TipoContrato; pagina?: number })`, `useMensalista(id: number)`, `useCriarMensalista()`, `useAtualizarMensalista(id: number)`, `useRenovarContrato()`, `useEncerrarContrato()`; mocks de `GET/POST /mensalistas`, `GET/PATCH /mensalistas/:id`, `POST /contratos/:id/renovacao`, `POST /contratos/:id/encerramento`.

- [ ] **Step 1: Write the failing tests**

`mensalistas.test.tsx`: a lista busca por nome e por placa (`'qrs7t81'` e `'QRS-7T81'` encontram Joana Prado); o filtro de situação mostra só vencidos; cadastrar com a placa de um contrato ativo mostra "Esta placa já tem contrato ativo" **sob o campo Placa** (mock responde 409 `PLACA_JA_CADASTRADA`); vaga ocupada mostra o erro sob o campo Vaga; valor `255,00` mostra erro de campo sem chamar a API; cadastro válido navega para o detalhe; o Auxiliar vê a lista **sem** botões de cadastrar, renovar e encerrar; "Encerrar contrato" pede confirmação e só chama a API após confirmar.

- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/web -- mensalistas` → FAIL.
- [ ] **Step 3: Implement** conforme seções 4 e 7. Formulário com React Hook Form e `mensalistaCriarSchema`; 409 e 422 mapeados para `setError` no campo correspondente. Estados vazio ("Nenhum mensalista ainda. Cadastre o primeiro."), carregando e erro de rede.
- [ ] **Step 4: Run to verify pass** — `npm test -w @estacionafacil/web -- mensalistas` → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/web-mensalistas && git add -A && git commit -m "feat: adiciona aba Mensalistas com mocks"`

---

### Task 7: Web — aba Vencimentos

**Files:** `apps/web/src/features/vencimentos/{Vencimentos.tsx,api.ts}`, `apps/web/src/features/vencimentos/vencimentos.test.tsx`; modifica `mocks/handlers.ts`.

**Interfaces:**
- Consumes: `VencimentosResposta`, `EtiquetaSituacao`, `formatarReais`.
- Produces: `useVencimentos(filtros: { situacao?: Situacao; categoria?; tipo? })`; mock `GET /vencimentos`.

- [ ] **Step 1: Write the failing test** — a página mostra 3 totais (vencidos, a vencer, em dia) e a tabela; o filtro "Em atraso" deixa só os 4 vencidos do mock (Sérgio Alves, Carlos Mendes, Rita Souza e Beatriz Campos), os mesmos que o Painel e o sino contam; cada linha tem "Registrar pagamento", que navega para `/recebimentos?contrato=<id>`; o botão de alerta do sino leva a esta aba filtrada por vencidos.
- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/web -- vencimentos` → FAIL.
- [ ] **Step 3: Implement** a página (chips de filtro Todos / Em atraso / A vencer / Em dia, tabela ordenada por vencimento crescente).
- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/web-vencimentos && git add -A && git commit -m "feat: adiciona aba Vencimentos com mocks"`

---

### Task 8: Web — aba Recebimentos (formulário, comprovante, lançamentos do dia)

**Files:** `apps/web/src/features/recebimentos/{Recebimentos,FormularioRecebimento,Comprovante}.tsx`, `apps/web/src/features/recebimentos/api.ts`, `recebimentos.test.tsx`; modifica `mocks/handlers.ts`.

**Interfaces:**
- Consumes: `pagamentoCriarSchema`, `PagamentoItem`, `ErroApiCliente`, `formatarReais`, `apiFetch` com `idempotencia`.
- Produces: `useRegistrarPagamento(): UseMutationResult<{ pagamento: PagamentoItem; novoVencimento: string }, ErroApiCliente, PagamentoEntrada>` (gera uma `Idempotency-Key` por tentativa de envio e a mantém em reenvios do mesmo formulário), `usePagamentos(filtro: { de?: string; ate?: string })`, `usePagamento(id: number)`; mocks de `POST /pagamentos`, `GET /pagamentos`, `GET /pagamentos/:id`.

- [ ] **Step 1: Write the failing tests**

`recebimentos.test.tsx`: abrir com `?contrato=<id>` preenche o mensalista; o formulário traz Pix pré-selecionado e valor da mensalidade do contrato; valor `0.00` e `255,00` mostram erro no campo Valor sem chamar a API; clique duplo em "Confirmar recebimento" envia **uma** chamada (botão desabilitado durante o envio) e a mesma `Idempotency-Key` em um reenvio após falha de rede; após o sucesso, exibe o comprovante com número, mensalista, placa, forma, data e valor, e o botão "Imprimir comprovante" chama `window.print`; contrato encerrado (409 `CONTRATO_ENCERRADO`) mostra "Este contrato já foi encerrado."; a tabela "Lançamentos do dia" lista os recebimentos de hoje; tela inicial do Auxiliar.

- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/web -- recebimentos` → FAIL.
- [ ] **Step 3: Implement** conforme seção 4: duas colunas (formulário e prévia do comprovante), impressão por CSS `@media print` mostrando só o comprovante.
- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/web-recebimentos && git add -A && git commit -m "feat: adiciona aba Recebimentos com comprovante e mocks"`

---

### Task 9: Web — aba Despesas

**Files:** `apps/web/src/features/despesas/{Despesas,FormularioDespesa}.tsx`, `apps/web/src/features/despesas/api.ts`, `despesas.test.tsx`; modifica `mocks/handlers.ts`.

**Interfaces:**
- Consumes: `despesaCriarSchema`, `TIPOS_DESPESA`, `formatarReais`.
- Produces: `useDespesas(periodo: { de: string; ate: string })`, `useCriarDespesa()`, `useRecorrencias()`, `useAlternarRecorrencia()`; mocks de `GET/POST /despesas`, `GET /recorrencias`, `PATCH /recorrencias/:id`.

- [ ] **Step 1: Write the failing test** — escolher "Fixa" mostra o campo "Dia do mês" obrigatório e "Variável" o oculta; enviar fixa sem dia mostra o erro no campo; a lista do mês mostra tipo, valor e total (`R$ 7.980,00` no mock: aluguel 5.500, luz 1.150, água 430, manutenção do portão 600, material de limpeza 300); o Auxiliar **não** vê o botão de pausar recorrência; o Proprietário pausa e a linha passa a "Pausada".
- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/web -- despesas` → FAIL.
- [ ] **Step 3: Implement** a página (formulário à esquerda, lista do mês e despesas fixas ativas à direita).
- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/web-despesas && git add -A && git commit -m "feat: adiciona aba Despesas com mocks"`

---

### Task 10: Web — aba Fluxo de caixa (fecha o marco M1)

**Files:** `apps/web/src/features/fluxo-de-caixa/{FluxoDeCaixa,GraficoMensal,GraficoFormas}.tsx`, `apps/web/src/features/fluxo-de-caixa/api.ts`, `fluxo.test.tsx`; modifica `mocks/handlers.ts`.

**Interfaces:**
- Consumes: `CaixaResposta`, `filtrosCaixaSchema`, `formatarReais`.
- Produces: `useCaixa(filtros: { de: string; ate: string; tipo?: TipoContrato; categoria?: 'carro'|'moto' })`; mock `GET /caixa` (devolve `resultado: null` e `filtrado: true` quando `tipo` ou `categoria` vierem).

- [ ] **Step 1: Write the failing test** — sem filtro, mostra receitas `R$ 11.340,00`, despesas `R$ 7.980,00` e resultado `R$ 3.360,00`; escolher "Moto" oculta o resultado e mostra o aviso "O resultado só é calculado sem filtro de contrato ou categoria, porque as despesas não pertencem a um deles."; período com `ate` anterior a `de` mostra erro de campo; gráfico mensal e divisão por forma de pagamento renderizam; a rota é inacessível ao Auxiliar (já coberto na Tarefa 4).
- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/web -- fluxo` → FAIL.
- [ ] **Step 3: Implement** a página conforme seção 4 (3 KPIs, gráfico mensal, rosca por forma).
- [ ] **Step 4: Run to verify pass** — `npm test -w @estacionafacil/web && npm run build -w @estacionafacil/web` → PASS e build sem erro.
- [ ] **Step 5: Commit** — `git checkout -b feature/web-fluxo-de-caixa && git add -A && git commit -m "feat: adiciona aba Fluxo de caixa com mocks"`

**Fim do marco M1:** o front funciona de ponta a ponta com mocks, pronto para a validação com o proprietário (09 a 13/11).

---

### Task 11: API — base, Prisma, RLS, harness de teste e dados iniciais

**Files:**
- Create: `apps/api/{package.json,prisma/schema.prisma,docker-compose.yml}` (compose na raiz do repositório), `apps/api/prisma/migrations/*`, `apps/api/src/{app.ts,servidor.ts,erros.ts,prisma.ts}`, `apps/api/src/rotas/saude.ts`, `apps/api/prisma/seed.ts`
- Test: `apps/api/test/{ajudantes.ts,saude.test.ts,banco.test.ts}`

**Interfaces:**
- Consumes: `CODIGOS_ERRO`, `ErroApi` (Tarefa 2).
- Produces:
  - `criarApp(deps: { prisma: PrismaClient; agora?: () => Date }): Express`
  - `class ErroHttp extends Error { constructor(status: number, codigo: CodigoErro, mensagem: string, campos?: Record<string,string>) }` e o middleware que o converte no formato da spec
  - Ajudantes de teste: `criarAppDeTeste(): { app: Express; prisma: PrismaClient; limparBanco(): Promise<void> }` (Postgres real em `DATABASE_URL_TESTE`)
  - Modelo Prisma com as tabelas da seção 5 da spec **mais** `despesas.competencia` (data do 1º dia do mês) com unicidade `(recorrenciaId, competencia)`

- [ ] **Step 1: Write the failing tests**

`saude.test.ts`: `GET /api/saude` → 200 `{ status: 'ok' }`; rota inexistente → 404 `NAO_ENCONTRADO` no formato de erro; erro inesperado → 500 sem expor detalhes internos.
`banco.test.ts`: inserir dois contratos ativos para a mesma placa viola a unicidade; dois ativos na mesma vaga violam; encerrar o primeiro permite o segundo; `valor` rejeita mais de duas casas; todas as tabelas têm RLS ligado e nenhuma política (consulta a `pg_tables` e `pg_policies`); o seed cria 49 vagas (35 carro, 14 moto).

- [ ] **Step 2: Run to verify failure** — `docker compose up -d && npm test -w @estacionafacil/api` → FAIL.
- [ ] **Step 3: Implement** o esquema Prisma e as migrações; as restrições parciais (um ativo por placa e por vaga) e o `ENABLE ROW LEVEL SECURITY` entram em SQL na migração. `criarApp` monta JSON, `helmet`, o prefixo `/api` e o tratador de erros. `servidor.ts` só chama `listen`.
- [ ] **Step 4: Run to verify pass** — `npm test -w @estacionafacil/api` → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/api-base && git add -A && git commit -m "feat: cria base da API, esquema Prisma com RLS e harness de testes"`

---

### Task 12: API — autenticação, sessão, limite de tentativas e permissões

**Files:**
- Create: `apps/api/src/{autenticacao/{senhas,sessoes,limiteLogin}.ts,middlewares/{exigirLogin,exigirPerfil,exigirCabecalhoApp}.ts,rotas/auth.ts}`, `apps/api/scripts/criar-proprietario.ts`
- Test: `apps/api/test/auth.test.ts`, `apps/api/test/permissoes.test.ts`

**Interfaces:**
- Consumes: `loginSchema`, `PERFIS`, `ErroHttp`, `criarAppDeTeste` (Tarefas 2 e 11).
- Produces: `exigirLogin`, `exigirPerfil(...perfis: ('proprietario'|'auxiliar')[])`, `exigirCabecalhoApp`; `hashSenha(senha: string): Promise<string>`, `conferirSenha(senha: string, hash: string): Promise<boolean>`; `req.usuario: { id: number; nome: string; perfil }`; rotas `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; erro `403 SEM_PERMISSAO` para perfil insuficiente (código acrescentado ao conjunto de erros da spec).

- [ ] **Step 1: Write the failing tests**

`auth.test.ts`: login correto → 200, `Set-Cookie` com `HttpOnly`, `Secure`, `SameSite=Lax`; senha errada → 401 `CREDENCIAIS_INVALIDAS`; a 6ª tentativa em 15 minutos para o mesmo login → 429 `MUITAS_TENTATIVAS`, mesmo com a senha certa; após 15 minutos (relógio injetado) volta a aceitar; `GET /auth/me` sem cookie → 401 `NAO_AUTENTICADO`; logout invalida a sessão (o mesmo cookie passa a dar 401); sessão sem uso por mais de 12 h → 401; `POST` sem `X-Estaciona-App` → 403; hash gravado começa com `$argon2id$`; o script de instalação recusa senha menor que 10 caracteres.
`permissoes.test.ts`: matriz de todas as rotas da seção 6 × perfis, usando uma tabela de `[método, rota, perfisPermitidos]`; Auxiliar em rota de Proprietário → 403 `SEM_PERMISSAO`; sem login → 401. (As rotas ainda não implementadas entram na tabela conforme as tarefas seguintes as criam.)

- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/api -- auth permissoes` → FAIL.
- [ ] **Step 3: Implement** com `argon2` (argon2id), sessões na tabela `sessoes` com renovação do `expira_em` a cada uso, contagem em `tentativas_login`, `cookie-parser` e as três middlewares.
- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/api-auth && git add -A && git commit -m "feat: adiciona autenticação, sessão, limite de tentativas e permissões"`

---

### Task 13: API — mensalistas e contratos (cadastro, lista, detalhe, atualização, renovação, encerramento)

**Files:**
- Create: `apps/api/src/{servicos/{mensalistas,contratos}.ts,rotas/{mensalistas,contratos}.ts}`
- Test: `apps/api/test/{mensalistas,contratos}.test.ts`

**Interfaces:**
- Consumes: `mensalistaCriarSchema`, `mensalistaAtualizarSchema`, `renovacaoSchema`, `situacaoDoContrato`, `proximoVencimento`, `normalizarPlaca`, `exigirPerfil`, `ErroHttp`.
- Produces:
  - `criarMensalista(prisma, dados: MensalistaCriarEntrada, usuarioId: number): Promise<{ mensalistaId: number; contratoId: number }>` (uma transação: mensalista, veículo, contrato e histórico `criado`; `vencimento` inicial = `proximoVencimento` conforme o `inicio` e o `diaVencimento`)
  - `renovarContrato(prisma, contratoId: number, entrada: { meses: number; motivo: string }, usuarioId: number): Promise<{ vencimento: string }>`
  - `encerrarContrato(prisma, contratoId: number, usuarioId: number): Promise<void>`
  - Rotas: `GET/POST /mensalistas`, `GET/PATCH /mensalistas/:id`, `POST /contratos/:id/renovacao`, `POST /contratos/:id/encerramento` (permissões da seção 6)

- [ ] **Step 1: Write the failing tests**

`mensalistas.test.ts`: `GET /mensalistas?contrato=<id>` devolve só o item daquele contrato ativo (a tela Recebimentos abre com `?contrato=` e precisa de nome, placa e valor); cadastrar com placa `qrs-7t81` e depois com `QRS7T81` → 409 `PLACA_JA_CADASTRADA`; vaga com contrato ativo → 409 `VAGA_OCUPADA` com `campos.vaga`; categoria `moto` em vaga de carro → 422; lista filtra `busca` por nome parcial e por placa em qualquer formato, `situacao=vencido` usa a regra da Tarefa 1 com a data injetada, e pagina; detalhe devolve contrato atual e histórico em ordem decrescente; `PATCH` troca a placa para uma já ativa → 409; Auxiliar em `POST /mensalistas` → 403.
`contratos.test.ts`: renovação de 1 mês a partir de `2026-10-05` com `dia 5` leva a `2026-11-05` e grava histórico `renovado` com o motivo; renovar sem motivo → 422; **encerrar libera a vaga e a placa** (novo contrato com os mesmos dados → 201); encerrar de novo → 409 `CONTRATO_ENCERRADO`; renovar contrato encerrado → 409 `CONTRATO_ENCERRADO`; contrato inexistente → 404.

- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/api -- mensalistas contratos` → FAIL.
- [ ] **Step 3: Implement** os serviços sobre `prisma.$transaction`, validando entradas com os schemas compartilhados e mapeando a violação das restrições únicas para os 409 corretos.
- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/api-mensalistas && git add -A && git commit -m "feat: adiciona API de mensalistas e contratos"`

---

### Task 14: API — pagamentos

**Files:** `apps/api/src/{servicos/pagamentos.ts,rotas/pagamentos.ts}`, `apps/api/test/pagamentos.test.ts`.

**Interfaces:**
- Consumes: `pagamentoCriarSchema`, `proximoVencimento`, `exigirLogin`, `ErroHttp`.
- Produces: `registrarPagamento(prisma, entrada: PagamentoEntrada, chave: string, usuarioId: number): Promise<{ pagamento: PagamentoItem; novoVencimento: string }>`; rotas `POST /pagamentos`, `GET /pagamentos` (`?de&ate&forma`), `GET /pagamentos/:id`. Repetir a mesma `Idempotency-Key` devolve **o mesmo corpo e status 201, sem nova linha**.

- [ ] **Step 1: Write the failing tests**

`pagamentos.test.ts`: contrato com vencimento `2026-10-05`, dia 5, pago em `2026-10-04` → 201, `novoVencimento` `'2026-11-05'`, `mesReferencia` `'2026-10-01'`, histórico `pagamento`; sem `Idempotency-Key` → 400 `CHAVE_IDEMPOTENCIA_AUSENTE`; **duas chamadas simultâneas** com a mesma chave criam **uma** linha e o vencimento avança uma vez; **contrato vencido há 3 meses** (`2026-07-05`, hoje `2026-10-26`) pago uma vez → `novoVencimento` `'2026-08-05'` e a situação continua `vencido`; contrato semanal avança 7 dias; contrato encerrado → 409 `CONTRATO_ENCERRADO`; contrato inexistente → 404; `valor` `'255,00'`, `'0.00'` e `'255.001'` → 422 em `campos.valor`; `GET /pagamentos?de=2026-10-26&ate=2026-10-26` devolve só os do dia; `GET /pagamentos/:id` devolve os dados do comprovante e 404 para id inexistente; Auxiliar e Proprietário podem registrar.

- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/api -- pagamentos` → FAIL.
- [ ] **Step 3: Implement** com `chave_idempotencia` única; a segunda chamada devolve o registro existente. A atualização do vencimento é atômica com a criação do pagamento.
- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/api-pagamentos && git add -A && git commit -m "feat: adiciona API de pagamentos com idempotência"`

---

### Task 15: API — despesas, recorrências e geração mensal

**Files:** `apps/api/src/{servicos/{despesas,recorrencias}.ts,rotas/{despesas,recorrencias}.ts}`, `apps/api/test/{despesas,recorrencias}.test.ts`.

**Interfaces:**
- Consumes: `despesaCriarSchema`, `exigirPerfil`, `hojeEmSaoPaulo`.
- Produces: `criarDespesa(prisma, entrada: DespesaEntrada, usuarioId: number): Promise<{ despesaId: number; recorrenciaId: number | null }>`; `gerarDespesasRecorrentes(prisma, hoje: string): Promise<number>` (devolve quantos lançamentos criou); rotas `POST/GET /despesas`, `GET /recorrencias`, `PATCH /recorrencias/:id` (só Proprietário, corpo `{ ativa: boolean }`).

- [ ] **Step 1: Write the failing tests**

`despesas.test.ts`: fixa sem `diaDoMes` → 422 em `campos.diaDoMes`; fixa cria o lançamento do mês **e** a recorrência, ligados por `competencia`; variável não cria recorrência; `GET /despesas?de&ate&tipo` filtra; Auxiliar pode lançar mas `PATCH /recorrencias/:id` → 403.
`recorrencias.test.ts`: `GET /recorrencias` devolve também as pausadas, com `ativa: false`, para a tela poder retomá-las; `gerarDespesasRecorrentes('2026-11-05')` cria o lançamento de novembro para a recorrência com `diaDoMes` 5 e devolve `1`; **rodar de novo no mesmo dia devolve `0`** e não duplica; rodar em `2026-11-20` sem ter rodado antes ainda cria o de novembro (recuperação após site parado); recorrência pausada não gera; **recorrência com dia 31 em `2027-02-28`** gera o lançamento de fevereiro com data `2027-02-28`, e em `2027-03-31` o de março com data `2027-03-31`; o lançamento criado no cadastro da fixa não é duplicado pela geração do mesmo mês.

- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/api -- despesas recorrencias` → FAIL.
- [ ] **Step 3: Implement** a geração: para cada recorrência ativa cujo dia efetivo (dia configurado limitado ao último dia do mês) já chegou e que não tem lançamento na `competencia` do mês de `hoje`, criar um. A unicidade `(recorrenciaId, competencia)` garante a idempotência.
- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/api-despesas && git add -A && git commit -m "feat: adiciona API de despesas e geração mensal de recorrências"`

---

### Task 16: API — vencimentos, painel e fluxo de caixa

**Files:** `apps/api/src/{servicos/{vencimentos,painel,caixa}.ts,rotas/{vencimentos,painel,caixa}.ts}`, `apps/api/test/{vencimentos,painel,caixa}.test.ts`.

**Interfaces:**
- Consumes: `situacaoDoContrato`, `filtrosCaixaSchema`, `paraCentavos`, `deCentavos`, `PainelResposta`, `CaixaResposta`, `VencimentosResposta`.
- Produces: `montarVencimentos(prisma, filtros, hoje: string): Promise<VencimentosResposta>`, `montarPainel(prisma, hoje: string): Promise<PainelResposta>`, `montarCaixa(prisma, filtros: FiltrosCaixa): Promise<CaixaResposta>`; rotas `GET /vencimentos`, `GET /painel`, `GET /caixa` (só Proprietário).

- [ ] **Step 1: Write the failing tests**

`caixa.test.ts`: com 3 pagamentos (`255.00`, `255.00`, `120.00`) e despesas `5500.00` e `430.00` no período, `receitas` `'630.00'`, `despesas` `'5930.00'`, `resultado` `'-5300.00'` (negativo é válido); pagamentos fora do período não entram; **com `categoria=moto`, `receitas` considera só motos, `resultado` é `null` e `filtrado` é `true`**; `ate` anterior a `de` → 422; `porForma` soma por forma; `serieMensal` cobre todos os meses do período, inclusive os sem movimento; Auxiliar → 403.
`vencimentos.test.ts`: totais por situação batem com a regra da Tarefa 1; contratos encerrados não aparecem; ordenação por vencimento crescente.
`painel.test.ts`: `mensalistasAtivos` ignora encerrados e arquivados; `vencidos.total` soma os valores dos contratos vencidos; `variacao` do resultado é `null` quando o mês anterior é zero.

- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/api -- vencimentos painel caixa` → FAIL.
- [ ] **Step 3: Implement** com consultas agregadas no Postgres; somas em centavos inteiros. Receita por data de pagamento e despesa por data da despesa (regime de caixa).
- [ ] **Step 4: Run to verify pass** — `npm test -w @estacionafacil/api` → PASS (suíte inteira).
- [ ] **Step 5: Commit** — `git checkout -b feature/api-consultas && git add -A && git commit -m "feat: adiciona API de vencimentos, painel e fluxo de caixa"`

---

### Task 17: Integração — front sem mocks e teste de aceitação

**Files:**
- Modify: `apps/web/vite.config.ts` (proxy `/api` para a API local), `apps/web/src/main.tsx` (mock só com `VITE_USAR_MOCKS=1`)
- Create: `playwright.config.ts`, `e2e/{aceitacao.spec.ts,capturas.spec.ts}`, `scripts/dados-de-demonstracao.ts`

**Interfaces:**
- Consumes: todas as rotas da API; `criarApp`, seed (Tarefa 11).
- Produces: roteiro de aceitação automatizado; capturas de tela em `docs/manual/capturas/`.

- [ ] **Step 1: Write the failing test**

`aceitacao.spec.ts` (Playwright, contra API e banco reais de teste): o Proprietário entra e vê as 6 abas; cadastra um mensalista, e cadastrar outro com a mesma placa mostra o erro no campo Placa; registra um recebimento (o vencimento avança e o comprovante aparece; clicar duas vezes não duplica); lança uma despesa fixa; o Painel mostra o resultado do mês; filtrar por "Moto" no Fluxo de caixa oculta o resultado; o Auxiliar entra e vê só as 3 abas, e a URL `/fluxo-de-caixa` o devolve a `/recebimentos`; sessão expirada volta ao login com o aviso. Cobre os critérios 1 a 7 da seção 13 da spec.

- [ ] **Step 2: Run to verify failure** — `npx playwright test e2e/aceitacao.spec.ts` → FAIL (front ainda usa mocks).
- [ ] **Step 3: Implement** o proxy, a troca do mock por variável e o script que sobe API e web para o Playwright; `capturas.spec.ts` gera as imagens do manual a partir dos dados de demonstração.
- [ ] **Step 4: Run to verify pass** — `npx playwright test` → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/integracao-e2e && git add -A && git commit -m "feat: integra front com a API real e adiciona teste de aceitação"`

**Fim do marco M2.**

---

### Task 18: Empacotamento Netlify, backup, CI de migração e documentação

**Files:**
- Create: `netlify.toml`, `netlify/functions/{api.ts,gerar-despesas.ts}`, `.github/workflows/{migrar.yml,backup.yml}`, `scripts/{restaurar-backup.md}`
- Create: `docs/manual-do-usuario.md`, `docs/guia-de-instalacao.md`
- Modify: `README.md`, `docs/api.md`, `docs/diagramas/README.md` (nota das divergências da seção 11 da spec)
- Test: `apps/api/test/netlify.test.ts`

**Interfaces:**
- Consumes: `criarApp`, `gerarDespesasRecorrentes`, `hojeEmSaoPaulo`.
- Produces: `handler` da função `api` (adapta `criarApp` ao formato da Netlify) e função agendada `gerar-despesas` (`schedule: '0 3 * * *'`); redirecionamento `/api/*` → função `api` com status 200 e fallback do SPA para `index.html`.

- [ ] **Step 1: Write the failing test**

`netlify.test.ts`: invocar o `handler` com um evento `GET /api/saude` devolve 200; o handler reaproveita a mesma instância do app entre invocações; `gerar-despesas` chama `gerarDespesasRecorrentes(prisma, hojeEmSaoPaulo())` e devolve o número criado; `netlify.toml` contém o redirecionamento de `/api/*` e a publicação automática em produção desligada, e o agendamento `0 3 * * *`.

- [ ] **Step 2: Run to verify failure** — `npm test -w @estacionafacil/api -- netlify` → FAIL.
- [ ] **Step 3: Implement** a função e o `netlify.toml`. Conexão da função pelo pooler (modo transação, `connection_limit=1`); migrações pelo `migrar.yml` com a URL do pooler em modo sessão. `backup.yml` roda `pg_dump` toda noite, **criptografa antes de enviar** e envia a um armazenamento privado (segredos em variáveis do GitHub). Documentar: criação das contas, variáveis, publicação **manual**, backup, **teste de restauração**, criação do primeiro usuário, e os critérios de publicação da seção 9 da spec. Atualizar `README.md` e `docs/api.md` para a nova pilha. O manual do usuário usa as capturas da Tarefa 17, em linguagem simples. **Executar o backup uma vez e restaurá-lo em um banco de teste**, registrando o resultado no guia (critério 8 da seção 13 da spec).
- [ ] **Step 4: Run to verify pass** — `npm test` (todos os pacotes) e `npm run build` → PASS.
- [ ] **Step 5: Commit** — `git checkout -b feature/netlify-e-docs && git add -A && git commit -m "feat: adiciona função Netlify, backup, migração em CI e documentação"`

**Fim do marco M3.** A publicação em produção continua pendente do roteiro da seção 9 da spec.
