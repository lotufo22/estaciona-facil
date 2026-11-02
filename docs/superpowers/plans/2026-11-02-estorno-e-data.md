# Estorno de recebimentos e despesas e data do recebimento — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O Proprietário estorna (com motivo) o último recebimento de um contrato ou uma despesa, sem apagar nada, e o recebimento aceita a data em que o dinheiro entrou.

**Architecture:** Colunas opcionais de estorno em `pagamentos` e `despesas` (migração aditiva) e o evento de histórico `estornado`. A regra mora em `vencimentoAnterior` (pacote shared) e em dois serviços da API, com o contrato travado como no pagamento. Caixa, Painel e totais excluem os estornados; as listas os mostram marcados.

**Tech Stack:** TypeScript, Zod, Express, Prisma 7/PostgreSQL, React/TanStack Query/React Hook Form, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-02-estorno-e-data-design.md`

## Global Constraints

- Node 22; comandos na raiz com `-w` (`@estacionafacil/shared|api|web`). Nomes, mensagens e interface em pt-BR.
- Dinheiro em centavos inteiros pelos helpers compartilhados; datas `AAAA-MM-DD`, hoje em `America/Sao_Paulo` pelo relógio injetável (`agora`).
- Migração nova `apps/api/prisma/migrations/20261102120000_estorno/migration.sql`; não reescrever as aplicadas. Revisar o SQL (CHECKs não aparecem no `schema.prisma`).
- Só o Proprietário estorna; autorizar no servidor e conferir `apps/api/test/permissoes.test.ts`. Escritas exigem `X-Estaciona-App: 1`.
- Estorno nunca apaga linhas. Situação sempre em texto (nunca só cor). Sem vermelho: usar o bordô e o âmbar do sistema.
- Testes da API/E2E apagam dados: só banco descartável com `test` no nome. Não rodar o projeto `capturas` do Playwright.
- Gravar arquivos com LF (`newline='\n'` em scripts Python).
- Commits em Conventional Commits **sem** trailer `Co-Authored-By` nem "Generated with Claude". Branch `feature/estorno-e-data`.
- Deploy só na homologação e só pelo que o usuário autorizou; nada em produção.

## Review Focus

- Estornar o recebimento de um contrato com **vencimento no dia 31** (ou 29 a 31 em fevereiro) devolve exatamente o vencimento anterior.
- Um recebimento **registrado com data passada** (`pagoEm` antigo) e estornado: o caixa do mês certo perde o valor, e o vencimento volta.
- Estornar o mais recente depois de **outro estornado mais novo** (pilha de estornos): o "mais recente válido" passa a ser o anterior, na ordem certa.
- **Despesa fixa** estornada e a geração mensal rodando de novo: nenhuma cópia nova nem reativação.
- **Dois estornos simultâneos** do mesmo recebimento: um `200` e um `409`; o vencimento volta uma única vez.

---

### Task 1: Contrato compartilhado (`packages/shared`)

**Files:**
- Modify: `packages/shared/src/datas.ts`, `schemas.ts`, `tipos.ts`, `erros.ts`, `index.ts`
- Test: `packages/shared/src/datas.test.ts`, `packages/shared/src/schemas.test.ts`

**Interfaces:**
- Produces: `vencimentoAnterior(vencimentoAtual: string, tipo: TipoContrato, diaVencimento: number): string`; `estornoSchema` (`{ motivo: string }`, trim, 3 a 200, mensagens "Explique o motivo do estorno" e "O motivo pode ter no máximo 200 letras") e `type EstornoEntrada`; `CODIGOS_ERRO` com `'ESTORNO_FORA_DE_ORDEM'` e `'JA_ESTORNADO'`; `EventoHistorico` com `'estornado'`; `PagamentoItem` e `DespesaItem` com `estornado: boolean`, `estornadoEm: string | null`, `motivoEstorno: string | null`; `interface EstornoPagamentoResposta { pagamento: PagamentoItem; novoVencimento: string }`. Tudo exportado por `index.ts`.

- [ ] **Step 1: Testes que falham.** Em `datas.test.ts`: `vencimentoAnterior('2026-11-05','mensal',5) === '2026-10-05'`; `('2026-03-31','mensal',31) === '2026-02-28'`; `('2028-03-31','mensal',31) === '2028-02-29'`; `('2026-01-15','mensal',15) === '2025-12-15'`; `('2026-11-12','semanal',5) === '2026-11-05'`; e a ida e volta: para cada dia de 1 a 31 e cada mês de 2026, `vencimentoAnterior(proximoVencimento(v,'mensal',d),'mensal',d) === v` quando `v` é `min(d, ultimoDia)` daquele mês. Em `schemas.test.ts`: `estornoSchema` aceita "Valor digitado errado" e apara espaços; rejeita "ab" com "Explique o motivo do estorno" e texto de 201 letras.
- [ ] **Step 2:** `npm test -w @estacionafacil/shared` → FAIL (função e schema não existem).
- [ ] **Step 3:** Implementar `vencimentoAnterior` em `datas.ts` (semanal: `adicionarDias(v, -7)`; mensal: mês anterior no `min(diaVencimento, ultimoDiaDoMes)`), `estornoSchema`, os tipos, os dois códigos de erro e o evento, e exportar.
- [ ] **Step 4:** `npm test -w @estacionafacil/shared` → PASS; `npm run lint` e `npm run typecheck -w @estacionafacil/shared` limpos (o typecheck de api e web só fecha nas Tasks 3 e 4).
- [ ] **Step 5: Commit** `feat(shared): vencimento anterior, schema e tipos do estorno`.

### Task 2: Migração e esquema do banco

**Files:**
- Create: `apps/api/prisma/migrations/20261102120000_estorno/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`
- Test: `apps/api/test/banco.test.ts`

**Interfaces:**
- Produces: `prisma.pagamento` e `prisma.despesa` com `estornadoEm: Date | null`, `estornadoPor: number | null`, `motivoEstorno: string | null`; relações `Usuario.pagamentosEstornados` e `Usuario.despesasEstornadas` (nomes de relação `"PagamentoEstornadoPor"` e `"DespesaEstornadaPor"`); `EventoHistorico.estornado`.

- [ ] **Step 1: Testes que falham** em `banco.test.ts` (novo `describe('estorno')`): (a) um pagamento e uma despesa criados sem os campos têm os três nulos; (b) preencher só `estornadoEm` viola o CHECK (mensagem contém o nome da restrição, `pagamentos_estorno_completo` / `despesas_estorno_completo`); (c) preencher os três funciona; (d) `historicoContrato.create` com `evento: 'estornado'` funciona.
- [ ] **Step 2:** `npm run gerar -w @estacionafacil/api` e `npm test -w @estacionafacil/api -- banco` → FAIL.
- [ ] **Step 3:** Migração: `ALTER TYPE "evento_historico" ADD VALUE 'estornado'`; em `pagamentos` e em `despesas`, `ADD COLUMN "estornado_em" TIMESTAMPTZ(3)`, `"estornado_por" INTEGER`, `"motivo_estorno" TEXT`; chave estrangeira `estornado_por` -> `usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE`; `CHECK` com os nomes acima: as três colunas nulas ou as três preenchidas (`(estornado_em IS NULL) = (estornado_por IS NULL) AND (estornado_em IS NULL) = (motivo_estorno IS NULL)`). Espelhar no `schema.prisma` (campos, relações nomeadas e o valor do enum) e anotar no comentário do cabeçalho os novos CHECKs.
- [ ] **Step 4:** `npm run gerar -w @estacionafacil/api` e `npm test -w @estacionafacil/api -- banco` → PASS.
- [ ] **Step 5: Commit** `feat(api): colunas de estorno em pagamentos e despesas`.

### Task 3: Serviços e rotas da API

**Files:**
- Modify: `apps/api/src/servicos/pagamentos.ts`, `despesas.ts`, `caixa.ts`, `painel.ts`; `apps/api/src/rotas/pagamentos.ts`, `despesas.ts`
- Test: `apps/api/test/pagamentos.test.ts`, `despesas.test.ts`, `caixa.test.ts`, `painel.test.ts`, `recorrencias.test.ts`, `permissoes.test.ts` (acrescentar casos nos arquivos existentes, no estilo deles)

**Interfaces:**
- Consumes: tudo da Task 1; colunas da Task 2.
- Produces: `estornarPagamento(prisma, id: number, motivo: string, usuarioId: number, agora: Date): Promise<EstornoPagamentoResposta>`; `estornarDespesa(prisma, id: number, motivo: string, usuarioId: number, agora: Date): Promise<DespesaItem>`; `listarPagamentos(prisma, filtros & { apenasValidos?: boolean })` (o `total` sempre exclui estornados; `apenasValidos` também tira os estornados dos `itens`); `POST /api/pagamentos/:id/estorno` e `POST /api/despesas/:id/estorno` (corpo `{ motivo }`, só Proprietário); `paraItem` de pagamento e o item de despesa preenchem `estornado`, `estornadoEm` (data em São Paulo) e `motivoEstorno`.

- [ ] **Step 1: Testes que falham** (cada um com o valor e a data da spec):
  - **Estorno de recebimento:** mensal com vencimento 05/11, pagar e estornar → `200`, `novoVencimento` volta ao anterior, `pagamento.estornado === true`, histórico ganha `estornado` com o comprovante e o motivo; `409 ESTORNO_FORA_DE_ORDEM` ao estornar o primeiro de dois recebimentos (mensagem cita "nº" do mais novo); depois de estornar o mais novo, o mais antigo passa a poder ser estornado (pilha); `409 JA_ESTORNADO` na segunda vez; contrato com **dia 31** (pagar em 31/01→28/02→31/03, estornar duas vezes volta a 31/01); contrato **semanal** volta 7 dias; contrato **encerrado** permite o estorno; motivo ausente ou curto → `422`; Auxiliar → `403`; id inexistente → `404`; **dois estornos simultâneos** (`Promise.all`) → um `200` e um `409` e o vencimento voltou uma vez só.
  - **Caixa e listas:** com `pagoEm` passado (mês anterior), o estorno tira o valor da receita do mês certo no `GET /caixa`; o Painel não conta o estornado em receitas nem em `ultimosRecebimentos`; `GET /pagamentos` lista o item com `estornado: true` mas o `total` não o soma; filtros por forma e período continuam funcionando.
  - **Despesa:** estorno `200` com `estornado`, motivo; `409 JA_ESTORNADO`; `403` para Auxiliar; `404`; o total de `GET /despesas` e o caixa excluem; **despesa fixa estornada** + `gerarDespesasRecorrentes` de novo no mesmo mês → continua uma só linha (a estornada), sem cópia nova.
  - **Data:** `POST /pagamentos` com `pagoEm` depois de hoje (relógio fixo do teste) → `422` com `campos.pagoEm`; com data passada → `201`, o vencimento avança a partir do vencimento do contrato como sempre e a receita cai no mês de `pagoEm`.
- [ ] **Step 2:** `npm test -w @estacionafacil/api -- pagamentos despesas caixa painel recorrencias permissoes` → FAIL.
- [ ] **Step 3:** Implementar. `estornarPagamento`: transação; `SELECT ... FOR UPDATE` no contrato do pagamento (buscar o pagamento primeiro para achar o contrato; 404 se não existir); se já estornado → `JA_ESTORNADO`; se existir outro pagamento do contrato, não estornado, com `id` maior → `ESTORNO_FORA_DE_ORDEM` citando o número; atualizar as três colunas (`estornadoEm: agora`); `vencimento = vencimentoAnterior(...)`; evento `estornado` com `detalhes` "Comprovante nº X estornado: <motivo>". `estornarDespesa`: marcar e devolver o item; recusar se já estornada. `somarPeriodo` e o total das listas filtram `estornadoEm: null`; o Painel usa `apenasValidos: true`. `registrarPagamento` recusa `pagoEm` > hoje (`hojeEmSaoPaulo(agora)`) com `ErroHttp(422, 'DADOS_INVALIDOS', ..., { pagoEm: 'A data do recebimento não pode ser futura' })`. Rotas com `exigirPerfil('proprietario')` e `validar(estornoSchema, req.body)`.
- [ ] **Step 4:** `npm test -w @estacionafacil/api` (todos) e `npm run typecheck -w @estacionafacil/api` → PASS.
- [ ] **Step 5: Commit** `feat(api): estorno de recebimentos e despesas e recusa de data futura`.

### Task 4: Interface e mocks (`apps/web`)

**Files:**
- Modify: `apps/web/src/features/recebimentos/{api.ts,Recebimentos.tsx,FormularioRecebimento.tsx,Comprovante.tsx}`, `apps/web/src/features/despesas/{api.ts,Despesas.tsx}`, `apps/web/src/features/mensalistas/DetalheMensalista.tsx` (nome do evento no histórico), `apps/web/src/mocks/{banco.ts,handlers.ts}`; criar `apps/web/src/components/DialogoEstorno.tsx` (confirmação com campo Motivo) se não houver um componente de diálogo reutilizável
- Test: `apps/web/src/features/recebimentos/recebimentos.test.tsx`, `apps/web/src/features/despesas/despesas.test.tsx`, `apps/web/src/features/mensalistas/mensalistas.test.tsx`

**Interfaces:**
- Consumes: `PagamentoItem`/`DespesaItem` com campos de estorno, `EstornoPagamentoResposta`, `estornoSchema`, `EstornoEntrada` (Task 1); rotas da Task 3.
- Produces: `useEstornarPagamento()` e `useEstornarDespesa()` (mutações que invalidam `pagamentos`, `mensalistas`, `vencimentos`, `painel`, `caixa` e `despesas`); componente de diálogo `DialogoEstorno` com props `{ titulo: string; aviso: string; aoConfirmar: (motivo: string) => Promise<void>; aoFechar: () => void }`.

- [ ] **Step 1: Testes que falham** (MSW já usado nos arquivos): (a) Proprietário vê **Estornar** nos recebimentos e nas despesas; Auxiliar não vê; (b) clicar abre o diálogo, confirmar sem motivo mostra "Explique o motivo do estorno" e não chama a API; (c) estornar com motivo marca o item com "Estornado" em texto, o total da lista deixa de somá-lo e o comprovante mostra o aviso e o motivo; (d) estornar um recebimento que não é o mais recente mostra a mensagem `ESTORNO_FORA_DE_ORDEM` no diálogo; (e) o formulário de recebimento tem **Data do recebimento** com a data de hoje, o campo tem `max` igual a hoje, e enviar uma data passada manda `pagoEm` com ela; (f) o histórico do mensalista mostra "Recebimento estornado" e o motivo.
- [ ] **Step 2:** `npm test -w @estacionafacil/web -- recebimentos despesas mensalistas` → FAIL.
- [ ] **Step 3:** Implementar: mocks com as mesmas regras (marcação, ordem, vencimento voltando, totais sem estornados, data futura recusada, evento no histórico); `DialogoEstorno` com foco no campo, validação por `estornoSchema` e erro de API sob o campo; etiquetas "Estornado" em texto com o estilo do bordô/âmbar existente (sem vermelho); texto do aviso do recebimento: "O vencimento de <nome> volta para <data>. Nada é apagado: o recebimento fica marcado como estornado."; campo de data no `FormularioRecebimento` (padrão `hoje()` de `lib/hoje`); nome do evento `estornado` no histórico.
- [ ] **Step 4:** `npm test -w @estacionafacil/web`, `npm run typecheck -w @estacionafacil/web`, `npm run lint` e `npm run build -w @estacionafacil/web` → PASS (`casca.test.tsx` e `celular.test.tsx` não podem quebrar).
- [ ] **Step 5: Commit** `feat(web): estorno, etiqueta Estornado e data do recebimento`.

### Task 5: E2E, documentação e verificação final

**Files:**
- Modify: `e2e/aceitacao.spec.ts` (passo novo), `docs/api.md`, `docs/manual-do-usuario.md`, `docs/decisoes-para-o-proprietario.md` (itens 1 e 3: como ficou e a pergunta continua aberta), `handoff.md`

- [ ] **Step 1:** Passo E2E "estorno": como Proprietário, registrar um recebimento com data de ontem, estornar com motivo, ver "Estornado", o vencimento do mensalista de volta e o resultado do mês sem o valor; Auxiliar não vê o botão.
- [ ] **Step 2:** `npx playwright test --project=aceitacao` (banco descartável) → PASS; se o navegador não estiver disponível, registrar como não executado.
- [ ] **Step 3:** Atualizar os documentos: rotas e erros em `api.md`; seção do manual (estornar, data); itens 1 e 3 do documento de decisões; handoff (referência, o que existe, regras essenciais: caixa exclui estornados, estorno só do mais recente). Nenhum diz que o proprietário validou.
- [ ] **Step 4:** Rodar `npm run lint`, `npm run typecheck`, `npm test`, `npm run build -w @estacionafacil/web`, `npm run funcoes`; registrar o que não foi possível executar.
- [ ] **Step 5: Commit** `docs: estorno e data do recebimento (API, manual, decisões e handoff)`.
