# EstacionaFácil — Turno no contrato (mensalista noturno)

**Data:** 01/11/2026
**Status:** design aprovado em conversa; spec aguardando revisão escrita
**Escopo:** antecipa da Fase 2 o campo de turno do contrato e a regra de vaga por turno. Resolve o ponto (c) das pendências do handoff e o item 13 de `docs/decisoes-para-o-proprietario.md`.

---

## 1. Contexto e objetivo

O proprietário informou 49 vagas de dia (35 carros e 14 motos) e 22 de noite (12 carros e 10 motos). O mensalista da noite usa a **mesma vaga** de um do dia, e o proprietário reorganiza as chaves. A maioria dos mensalistas não tem vaga fixa numerada. A mensalidade noturna é mais barata (item 16, fora desta rodada).

Hoje há no máximo **um contrato ativo por vaga** (índice parcial `contratos_um_ativo_por_vaga`). Cadastrar um noturno na vaga de um diurno dá `VAGA_OCUPADA`. O contorno é cadastrar o noturno sem vaga, mas assim o turno não existe e não dá para listar, contar nem filtrar por ele.

**Objetivo:** o contrato passa a ter **turno** (diurno ou noturno). Um diurno e um noturno podem ocupar a mesma vaga numerada. O turno aparece na lista e no detalhe e pode ser usado como filtro.

**Critério de sucesso:** o proprietário cadastra um noturno na vaga de um diurno sem erro, vê o turno de cada mensalista e filtra a lista por turno.

## 2. Escopo

### Dentro
- Campo `turno` no contrato (`diurno` | `noturno`), escolhido no cadastro e editável depois.
- Unicidade de contrato ativo por **vaga e turno**.
- Turno na lista, no detalhe, no formulário e no filtro da lista de mensalistas.
- Migração dos contratos existentes como `diurno`.

### Fora (decisões explícitas)
- **Turno integral.** Não existe nesta rodada. Quem usa o mesmo carro de dia e de noite é **um contrato só** (um valor, um vencimento, um histórico), mas o modelo ainda não o representa: hoje seria um diurno com valor combinado à mão. Duas linhas para a mesma placa em turnos diferentes **não** serão permitidas. A existência e a cobrança do integral viram pergunta ao proprietário (seção 8).
- Valor sugerido por categoria e turno (item 16).
- Contagem por turno no painel e relatórios por turno.
- Validação de capacidade (49 de dia, 22 de noite): o sistema não limita a quantidade de contratos sem vaga.
- Controle de entrada e saída e gestão de vagas por turno da Fase 2.

## 3. Modelo de dados

Nova migração (as aplicadas não são reescritas):

- Enum `Turno` (`diurno`, `noturno`).
- `contratos.turno Turno NOT NULL DEFAULT 'diurno'`. Os contratos existentes ficam diurnos.
- O índice `contratos_um_ativo_por_vaga` é descartado e recriado sobre `(vaga_id, turno)`, com o mesmo filtro `WHERE status = 'ativo' AND vaga_id IS NOT NULL`. **O nome é mantido**, porque `traduzirViolacao` (`apps/api/src/servicos/mensalistas.ts`) detecta a corrida pelo trecho `por_vaga`.
- O índice por veículo (uma placa, um contrato ativo) não muda.
- RLS: a tabela `contratos` já o tem; nenhuma tabela nova.
- Revisar o SQL da migração: o `schema.prisma` não expressa o índice parcial. Atualizar o comentário do cabeçalho do esquema.

## 4. Contrato compartilhado (`packages/shared`)

- `TURNOS = ['diurno', 'noturno']` e o tipo `Turno`.
- Schema de criação de mensalista: `turno`, com padrão `diurno` e mensagem "Escolha diurno ou noturno".
- Schema de atualização: `turno` opcional.
- `MensalistaItem` e `ContratoDetalhe` expõem `turno`.
- Filtro da lista: `turno` opcional.
- Erro `VAGA_OCUPADA` mantém o código; a mensagem passa a dizer que a vaga está ocupada **neste turno**.

## 5. API (`apps/api`)

- `vagaLivre` recebe o turno e só considera ocupada a vaga com contrato ativo **no mesmo turno** (continua ignorando o contrato atual na edição).
- `criarMensalista` grava `turno`. `atualizarMensalista` aceita mudar o turno e revalida a vaga: se o contrato tem vaga, ela precisa estar livre **no turno de destino**; a vaga e o turno novos são validados juntos quando ambos mudam.
- `itensAtivos`, a lista e o detalhe devolvem `turno`. `GET /mensalistas?turno=` filtra.
- Permissões não mudam: criar e editar continuam do proprietário; a consulta, de ambos.
- Dados de demonstração (`scripts/dados-de-demonstracao.ts`): incluir alguns noturnos, ao menos um na vaga de um diurno.

## 6. Interface (`apps/web`)

- Formulário de cadastro e edição: campo **Turno** com "Diurno" e "Noturno", em texto, sem depender de cor. Padrão Diurno.
- Lista e detalhe: o turno aparece em texto (também nos cartões do celular).
- Filtro de turno na lista, junto dos existentes.
- Erro de vaga ocupada continua no campo Vaga, com a mensagem nova.
- Mocks (`apps/web/src/mocks/`) aplicam a mesma regra de unicidade por vaga e turno.
- Preservar carregamento, vazio, erro, sessão expirada e foco visível.

## 7. Testes

- **Shared:** schemas com e sem `turno`; padrão `diurno`; valor inválido.
- **API** (banco descartável): noturno aceito na vaga de um diurno; dois noturnos na mesma vaga dão 409 `VAGA_OCUPADA`; encerrar o diurno não afeta o noturno; mudar o turno para um já ocupado dá 409; mudar para um livre funciona; a corrida cai no índice e vira 409; filtro `?turno=`; `banco.test.ts` confere o índice recriado; permissões inalteradas (`permissoes.test.ts`).
- **Web:** campo e padrão do formulário; turno exibido na lista e no detalhe; filtro; mensagem de vaga ocupada.
- **E2E:** fluxo do noturno compartilhando a vaga. Não regravar capturas sem necessidade; se as telas mudarem, atualizá-las de propósito.
- Antes do merge: lint, tipos, testes dos três workspaces, build do front e das funções e o E2E.

## 8. Documentação e perguntas ao proprietário

- Atualizar `docs/api.md`, o manual do usuário, o handoff (regra 8 e ponto (c)), o item 13 de `docs/decisoes-para-o-proprietario.md` e a nota da spec da Fase 1 (seção 5, regra de vaga).
- Acrescentar ao item 13 a pergunta: **"Existe cliente que usa o mesmo carro de dia e de noite? Como é cobrado?"**
- Registrar que a validação com o proprietário continua pendente: a implementação não a substitui.

## 9. Riscos

- **Migração do índice** em produção: nada foi implantado, então o risco hoje é só local. Quando houver deploy, a migração recria o índice em tabela pequena; conferir a ordem (descartar e criar na mesma migração).
- **Corrida** entre dois cadastros na mesma vaga e turno: coberta pelo índice e pela tradução do erro.
- **Integral não modelado:** quem fica 24h aparece como diurno; é limitação conhecida e declarada.
