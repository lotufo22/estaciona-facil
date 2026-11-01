# Turno no contrato (mensalista noturno) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O contrato ganha `turno` (diurno | noturno) e a unicidade de contrato ativo passa a valer por vaga **e turno**, para o noturno dividir a vaga de um diurno.

**Architecture:** Enum `Turno` e coluna `contratos.turno` (padrão `diurno`) por nova migração; o índice parcial `contratos_um_ativo_por_vaga` é recriado sobre `(vaga_id, turno)` mantendo o nome. Schemas Zod e tipos no pacote shared; `vagaLivre` e a edição na API consideram o turno; o front mostra, edita e filtra o turno; os mocks espelham a regra.

**Tech Stack:** TypeScript, Zod, Express, Prisma 7/PostgreSQL, React/TanStack Query/React Hook Form, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-01-mensalista-noturno-turno-design.md`

## Global Constraints

- Node 22; comandos na raiz com `-w` (`@estacionafacil/shared|api|web`). Nomes, mensagens e interface em pt-BR.
- Não reescrever migrações aplicadas; a nova migração é `apps/api/prisma/migrations/20261101120000_turno_no_contrato/migration.sql`. Revisar o SQL (índice parcial não aparece no `schema.prisma`).
- Manter o nome do índice `contratos_um_ativo_por_vaga` (`traduzirViolacao` procura `por_vaga`). O índice por veículo não muda: uma placa, um contrato ativo.
- Sem turno integral, valor sugerido, contagem por turno no painel nem limite de capacidade.
- Turno exibido em texto ("Diurno"/"Noturno"), nunca só por cor.
- Testes da API/E2E apagam dados: só banco descartável com `test` no nome (`DATABASE_URL_TESTE`).
- Commits em Conventional Commits, **sem** trailer `Co-Authored-By` nem "Generated with Claude" (preferência do usuário). Branch `feature/turno-no-contrato`.
- Não rodar o projeto `capturas` do Playwright; não regravar imagens.

## Review Focus

- Mudar o turno de um contrato **que tem vaga** para um turno em que a vaga já está ocupada → 409 `VAGA_OCUPADA` e contrato inalterado (a edição só do turno, sem enviar `vaga`, também revalida).
- Vários noturnos **sem vaga** convivem; o noturno sem vaga não disputa nada.
- Código de vaga em outra caixa (`c01` vs `C01`) continua a mesma vaga, por turno.
- Dois cadastros simultâneos do mesmo turno na mesma vaga: um 201 e um 409 (índice + `traduzirViolacao`).
- Cliente da API que não envia `turno` continua funcionando como diurno; `?turno=` inválido → 422.

---

### Task 1: Contrato compartilhado (`packages/shared`)

**Files:**
- Modify: `packages/shared/src/enums.ts`, `schemas.ts`, `tipos.ts`, `index.ts`
- Test: `packages/shared/src/schemas.test.ts`

**Interfaces:**
- Produces: `TURNOS` (`readonly ['diurno','noturno']`) e `type Turno`; `mensalistaCriarSchema` com `turno` (padrão `'diurno'`, mensagem de erro "Escolha diurno ou noturno"); `mensalistaAtualizarSchema` com `turno` opcional; `MensalistaItem.turno: Turno` e `ContratoDetalhe.turno: Turno`. Todos exportados por `index.ts`.

- [ ] **Step 1: Testes que falham** em `schemas.test.ts`: (a) `mensalistaCriarSchema.parse(valido)` sem `turno` devolve `turno === 'diurno'`; (b) com `turno: 'noturno'` mantém; (c) `turno: 'integral'` falha com a mensagem "Escolha diurno ou noturno"; (d) `mensalistaAtualizarSchema.parse({ turno: 'noturno' })` passa, e `{ turno: 'x' }` falha.
- [ ] **Step 2:** `npm test -w @estacionafacil/shared` → FAIL (`turno` desconhecido).
- [ ] **Step 3:** Em `enums.ts` acrescentar `TURNOS`/`Turno` no mesmo estilo de `CATEGORIAS`. Em `schemas.ts` usar `z.enum(TURNOS, { error: 'Escolha diurno ou noturno' })`, com `.default('diurno')` na criação e no `.partial()` da atualização. Em `tipos.ts` acrescentar `turno: Turno` às duas interfaces. Exportar `TURNOS` e `Turno` em `index.ts`.
- [ ] **Step 4:** `npm test -w @estacionafacil/shared` e `npm run typecheck -w @estacionafacil/shared` → PASS. (O typecheck de api/web só fechará nas Tasks 3 e 4.)
- [ ] **Step 5: Commit** `feat(shared): turno do contrato (diurno ou noturno)`.

### Task 2: Migração e esquema do banco

**Files:**
- Create: `apps/api/prisma/migrations/20261101120000_turno_no_contrato/migration.sql`
- Modify: `apps/api/prisma/schema.prisma` (enum `Turno` com `@@map("turno")`, campo `turno Turno @default(diurno)` em `Contrato`, comentário do cabeçalho: "por vaga e turno")
- Test: `apps/api/test/banco.test.ts`

**Interfaces:**
- Produces: `prisma.contrato` com campo `turno` (`'diurno' | 'noturno'`, padrão `diurno`); índice único parcial `contratos_um_ativo_por_vaga` sobre `("vaga_id","turno")`.

- [ ] **Step 1: Testes que falham** em `banco.test.ts`, no `describe('um contrato ativo por placa e por vaga')`: (a) diurno e noturno ativos na mesma vaga (`dadosDeContrato(..., { turno: 'noturno' })`, segundo veículo/mensalista como no teste existente) são aceitos; (b) dois noturnos ativos na mesma vaga violam `contratos_um_ativo_por_vaga`; (c) encerrar o diurno não afeta o noturno e libera o turno diurno para um novo; (d) contrato criado sem `turno` fica `diurno`.
- [ ] **Step 2:** `npm run gerar -w @estacionafacil/api` e `npm test -w @estacionafacil/api -- banco` → FAIL.
- [ ] **Step 3:** Escrever a migração em SQL: `CREATE TYPE "turno" AS ENUM ('diurno','noturno')`; `ALTER TABLE "contratos" ADD COLUMN "turno" "turno" NOT NULL DEFAULT 'diurno'`; `DROP INDEX "contratos_um_ativo_por_vaga"`; recriar com o mesmo nome em `("vaga_id","turno") WHERE "status" = 'ativo' AND "vaga_id" IS NOT NULL`. Espelhar enum e campo no `schema.prisma`. Não há tabela nova (RLS já cobre `contratos`).
- [ ] **Step 4:** `npm run gerar -w @estacionafacil/api` e `npm test -w @estacionafacil/api -- banco` → PASS (migrações de teste são automáticas).
- [ ] **Step 5: Commit** `feat(api): turno no contrato e unicidade por vaga e turno`.

### Task 3: Serviço e rotas da API

**Files:**
- Modify: `apps/api/src/servicos/mensalistas.ts`, `apps/api/src/rotas/mensalistas.ts`
- Test: `apps/api/test/mensalistas.test.ts`, `apps/api/test/permissoes.test.ts` (só se algum caso precisar do campo), `apps/api/test/ajudantesRotas.ts` (`mensalistaValido` não precisa de `turno`; padrão deve valer)

**Interfaces:**
- Consumes: `Turno`, `TURNOS`, schemas e tipos da Task 1; campo `turno` da Task 2.
- Produces: `vagaLivre(tx, codigo, categoria, turno, contratoAtualId?)`; `FiltrosLista.turno?: Turno`; `itensAtivos(prisma, hoje, filtros)` aceita `turno` e devolve `MensalistaItem.turno`; `detalheDoMensalista` devolve `contrato.turno`; `GET /api/mensalistas?turno=diurno|noturno` (inválido → 422 `DADOS_INVALIDOS` com `campos.turno`, via `escolha`).

- [ ] **Step 1: Testes que falham** em `mensalistas.test.ts`: (1) criar diurno na vaga `C01` e noturno (`turno:'noturno'`, outra placa) na mesma `C01` → 201; (2) segundo noturno em `C01` → 409 `VAGA_OCUPADA` com `campos.vaga`; (3) sem enviar `turno` o contrato fica `diurno` e o detalhe traz `contrato.turno === 'diurno'`; (4) `PATCH { turno: 'noturno' }` num contrato com vaga cuja vaga já tem noturno → 409 e `turno` inalterado no banco; para vaga livre no turno → 200 com `contrato.turno === 'noturno'`; (5) `PATCH { turno }` de contrato sem vaga → 200; (6) `vaga: 'c01'` (minúscula) respeita o turno; (7) dois `POST` simultâneos (`Promise.all`) do mesmo turno e vaga → um 201 e um 409; (8) `GET ?turno=noturno` devolve só noturnos e cada item traz `turno`; `?turno=integral` → 422; (9) vários noturnos sem vaga coexistem. Ajustar qualquer teste que compare o texto antigo "Esta vaga já está ocupada" (`grep -rn "já está ocupada" apps packages`).
- [ ] **Step 2:** `npm test -w @estacionafacil/api -- mensalistas` → FAIL.
- [ ] **Step 3:** `vagaLivre` passa a filtrar o ocupante também por `turno` e a mensagem do erro vira "Esta vaga já está ocupada neste turno." (campo `vaga`). `criarMensalista` grava `turno` do `dados`. Em `atualizarMensalista`: gravar `turno` se enviado; o código a validar com `vagaLivre` é `dados.vaga` quando enviado (não nulo) ou, se só o turno mudou, o `contrato.vaga?.codigo` atual; o turno efetivo é `dados.turno ?? contrato.turno`; a validação roda na mesma transação do `update`. `itensAtivos` filtra por `turno` no `where` e devolve `turno`; `detalheDoMensalista` devolve `turno`; `filtrosDaConsulta` lê `turno` com `escolha<Turno>(req, 'turno', TURNOS)`.
- [ ] **Step 4:** `npm test -w @estacionafacil/api` (todos) e `npm run typecheck -w @estacionafacil/api` → PASS; conferir que `permissoes.test.ts` segue verde.
- [ ] **Step 5: Commit** `feat(api): vaga livre por turno, turno editável e filtro por turno`.

### Task 4: Interface e mocks (`apps/web`)

**Files:**
- Modify: `apps/web/src/mocks/banco.ts` (`MensalistaMock.turno`, `LINHAS` com turno `'diurno'` em todas, `listarMensalistas`/`montarDetalhe` expõem `turno`), `apps/web/src/mocks/handlers.ts` (`conflito` considera o turno; criação, edição e filtro `turno`; mesma mensagem "neste turno"), `features/mensalistas/api.ts` (`FiltrosMensalistas.turno?: Turno`), `CadastroMensalista.tsx` (campo Turno, padrão Diurno, incluir `'turno'` em `CAMPOS`), `DetalheMensalista.tsx` (campo Turno na edição, `'turno'` em `CAMPOS_EDICAO`, `turno` nos `defaultValues`, `Dado rotulo="Turno"`), `ListaMensalistas.tsx` (filtro Turno com "Todos/Diurno/Noturno" e coluna "Turno" na `Tabela`; `semFiltros` inclui o turno).
- Test: `apps/web/src/features/mensalistas/mensalistas.test.tsx`

**Interfaces:**
- Consumes: `Turno`, `mensalistaCriarSchema`/`mensalistaAtualizarSchema` e `MensalistaItem.turno` da Task 1. Reutiliza `Selecao` com `{ valor, texto }`, como `OPCOES_TIPO`.

- [ ] **Step 1: Testes que falham** em `mensalistas.test.tsx` (padrão MSW já usado no arquivo): (a) o formulário de cadastro mostra "Turno" com Diurno marcado e envia `turno: 'noturno'` quando escolhido; (b) cadastrar noturno na vaga de um diurno do mock conclui; um segundo noturno na mesma vaga mostra "Esta vaga já está ocupada neste turno." no campo Vaga; (c) a lista mostra a coluna Turno em texto e o filtro Noturno chama `?turno=noturno` e lista só noturnos; (d) o detalhe mostra "Turno"; editar o turno salva e atualiza o detalhe; (e) `semFiltros` com só o filtro de turno mostra "Nenhum mensalista encontrado com esses filtros." quando vazio.
- [ ] **Step 2:** `npm test -w @estacionafacil/web -- mensalistas` → FAIL.
- [ ] **Step 3:** Implementar conforme a lista de arquivos. No mock, `conflito(placa, vaga, turno, ignorarId)` compara vaga **e** turno; a placa continua global entre ativos. No celular a `Tabela` já vira cartões: conferir que a coluna Turno aparece também lá.
- [ ] **Step 4:** `npm test -w @estacionafacil/web`, `npm run typecheck -w @estacionafacil/web`, `npm run lint` e `npm run build -w @estacionafacil/web` → PASS (inclui `casca.test.tsx` e `celular.test.tsx`, que não podem quebrar).
- [ ] **Step 5: Commit** `feat(web): turno no cadastro, detalhe, lista e filtro`.

### Task 5: Dados de demonstração e E2E

**Files:**
- Modify: `scripts/dados-de-demonstracao.ts` (campo opcional `turno?: Turno` em `CLIENTES`, padrão diurno; acrescentar um cliente **noturno** na vaga de um diurno existente, p. ex. a `'01'`, com placa nova e valor 100,00; gravar `turno` no `contrato.create`)
- Modify: `apps/api/test/demonstracao.test.ts` e quaisquer contagens/totais que ele ou o E2E afirmem sobre os dados de demonstração
- Test: `e2e/aceitacao.spec.ts` (novo caso)

- [ ] **Step 1:** Escrever o caso E2E "noturno na vaga de um diurno": como proprietário cadastra um diurno na vaga X e depois um noturno na mesma X (sucesso), vê "Noturno" na lista, filtra por Noturno, e um segundo noturno em X é recusado com a mensagem do campo Vaga. Seguir o estilo de login/seletores do arquivo.
- [ ] **Step 2:** `npm test -w @estacionafacil/api -- demonstracao` → FAIL depois de acrescentar o cliente (contagens antigas); ajustar as expectativas para o novo total e afirmar que existe um noturno compartilhando vaga com um diurno.
- [ ] **Step 3:** Implementar a mudança nos dados; `npm test -w @estacionafacil/api -- demonstracao` → PASS.
- [ ] **Step 4:** `npx playwright test --project=aceitacao` com banco descartável → PASS (se o navegador não estiver disponível, registrar como **não executado**; as capturas não são regravadas).
- [ ] **Step 5: Commit** `test: demonstração com noturno e E2E do turno`.

### Task 6: Documentação e verificação final

**Files:**
- Modify: `docs/api.md` (campo `turno` em `POST`/`PATCH /mensalistas`, resposta, filtro `?turno=`, `VAGA_OCUPADA` por turno), `docs/manual-do-usuario.md` (campo Turno, vaga compartilhada, filtro; **sem** trocar capturas), `handoff.md` (regra 8, ponto (c) das pendências, mapa), `docs/decisoes-para-o-proprietario.md` (item 13: como ficou + pergunta "Existe cliente que usa o mesmo carro de dia e de noite? Como é cobrado?"), `docs/superpowers/specs/2026-10-26-estacionafacil-fase1-design.md` (nota na seção 5/linha 104: agora por vaga e turno), `docs/respostas-do-proprietario.md` (nota de que o contorno foi substituído).

- [ ] **Step 1:** Atualizar os documentos acima; conferir que nenhum afirma que a validação com o proprietário foi feita.
- [ ] **Step 2:** Rodar `npm run lint`, `npm run typecheck`, `npm test`, `npm run build -w @estacionafacil/web`, `npm run funcoes` → todos PASS; registrar o que não foi possível executar.
- [ ] **Step 3:** Revisar `git diff main...HEAD --stat` (só o pedido; sem `.env`, `generated/` nem imagens) e a migração por inspeção.
- [ ] **Step 4: Commit** `docs: turno no contrato (API, manual, handoff e decisões)`.
- [ ] **Step 5:** Abrir PR para `main` somente com a autorização do usuário; não implantar nem rodar workflows de migração/backup.
