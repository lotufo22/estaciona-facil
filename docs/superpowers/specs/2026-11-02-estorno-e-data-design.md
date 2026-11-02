# EstacionaFácil — Estorno de recebimentos e despesas e data do recebimento

**Data:** 02/11/2026
**Status:** design aprovado em conversa; spec aguardando revisão escrita
**Escopo:** itens 1 (corrigir um lançamento errado) e 3 (campo de data no recebimento) de `docs/decisoes-para-o-proprietario.md`. A opção A (estorno) é a recomendada nesse documento; o proprietário ainda não respondeu à pergunta, e a resposta dele pode mudar a regra.

---

## 1. Contexto e objetivo

Hoje não há como alterar nem apagar um recebimento ou uma despesa depois de lançados, e o recebimento sempre usa a data de hoje. O proprietário disse que lança "nos horários de mais calmaria, sem horário certo", então erros de valor ou forma e lançamentos tardios vão acontecer.

**Objetivo:** o Proprietário corrige um lançamento errado sem apagar nada (estorno, com motivo), e o recebimento aceita a data em que o dinheiro entrou.

**Critério de sucesso:** o Proprietário estorna o último recebimento de um contrato, o vencimento volta, o caixa deixa de contar o valor, e o histórico guarda quem, quando e por quê; o mesmo vale para uma despesa.

## 2. Escopo

### Dentro
- Estorno de recebimento (só o mais recente ainda válido do contrato) e de despesa (qualquer uma).
- Campo "Data do recebimento" (padrão hoje; passado permitido; futuro não).

### Fora
Editar valor ou forma; estornar um recebimento que não seja o mais recente; reativar um estorno; os demais itens do documento de decisões (renovação semanal, vários meses, vaga em lista, identidade visual), que esperam a validação do proprietário.

## 3. Regras de negócio

1. Só o **Proprietário** estorna. O **motivo** é obrigatório (3 a 200 letras, após aparar espaços).
2. Nada é apagado. O lançamento fica com `estornadoEm`, `estornadoPor` e `motivoEstorno`. As três colunas são preenchidas juntas ou nenhuma.
3. **Recebimento:** só o mais recente ainda não estornado do contrato (maior `id` entre os válidos). Outro recebimento válido do mesmo contrato com `id` maior impede o estorno: `409 ESTORNO_FORA_DE_ORDEM`, "Estorne primeiro o recebimento nº X".
4. Ao estornar um recebimento, o vencimento do contrato **volta um passo**: um mês (no `diaVencimento`, limitado ao último dia do mês) no mensal, sete dias no semanal. É a inversa de `proximoVencimento` (`vencimentoAnterior`). Renovações feitas depois do recebimento continuam valendo, porque cada passo é independente. O histórico do contrato ganha o evento `estornado`, com o comprovante e o motivo.
5. Contrato encerrado: o estorno é permitido (corrige o caixa); o vencimento volta do mesmo jeito.
6. **Despesa:** qualquer despesa não estornada. A despesa fixa já gerada mantém sua `competencia`, então a geração mensal **não a cria de novo**. Não há efeito em contrato.
7. Estornar o que já foi estornado: `409 JA_ESTORNADO`, sem efeito. Recurso inexistente: `404`. Auxiliar: `403`.
8. O contrato é travado (`FOR UPDATE`) durante o estorno de recebimento, como no pagamento: dois estornos simultâneos resultam em um `200` e um `409`.
9. **Caixa (regime de caixa):** receitas e despesas estornadas **não entram** em nenhuma soma (Painel, Fluxo de caixa, totais das listas, últimos recebimentos do Painel). As listas de Recebimentos e Despesas continuam mostrando o item, marcado.
10. **Data do recebimento:** `pagoEm` já é aceito pela API. Passa a ser recusado se for posterior a hoje (`422`, `campos.pagoEm`, "A data do recebimento não pode ser futura"), usando o relógio injetável. O vencimento continua avançando a partir do vencimento do contrato, e o caixa usa `pagoEm`.

## 4. Modelo de dados

Nova migração (`20261102120000_estorno`), aditiva:
- `evento_historico` ganha o valor `estornado`.
- `pagamentos` e `despesas`: `estornado_em TIMESTAMPTZ(3)`, `estornado_por INTEGER` (chave estrangeira para `usuarios`, mesmo estilo das existentes) e `motivo_estorno TEXT`, todas nulas por padrão, com `CHECK` de que as três são nulas ou as três preenchidas.
- RLS: as tabelas já o têm; nenhuma tabela nova.

## 5. Contrato compartilhado

- `vencimentoAnterior(vencimentoAtual, tipo, diaVencimento)`.
- `estornoSchema` (`motivo`) e `EstornoEntrada`.
- Códigos de erro `ESTORNO_FORA_DE_ORDEM` e `JA_ESTORNADO`; evento de histórico `estornado`.
- `PagamentoItem` e `DespesaItem` ganham `estornado: boolean`, `estornadoEm: string | null` (AAAA-MM-DD, em São Paulo) e `motivoEstorno: string | null`.
- `EstornoPagamentoResposta { pagamento: PagamentoItem; novoVencimento: string }`.

## 6. API

- `POST /api/pagamentos/:id/estorno` e `POST /api/despesas/:id/estorno`, corpo `{ motivo }`, só Proprietário. Respostas: `EstornoPagamentoResposta` e `DespesaItem`.
- `somarPeriodo` (caixa) e o total de `listarPagamentos`/`listarDespesas` excluem os estornados; os últimos recebimentos do Painel mostram só os válidos.
- `registrarPagamento` recusa data futura.
- `docs/api.md` e a matriz de `permissoes.test.ts` são atualizados.

## 7. Interface

- **Recebimentos:** etiqueta "Estornado" em texto nos itens estornados; botão **Estornar** (só Proprietário) abre uma confirmação com o campo "Motivo", em linguagem simples ("O vencimento volta para …"); o comprovante de um recebimento estornado mostra o aviso e o motivo; campo **Data do recebimento** no formulário, com a data de hoje como padrão e o limite de hoje.
- **Despesas:** mesma etiqueta e o mesmo botão/confirmação.
- **Detalhe do mensalista:** o histórico mostra "Recebimento estornado" e o motivo.
- Mocks com as mesmas regras. Preservar carregamento, vazio, erro, sessão expirada e foco visível; situação sempre em texto.

## 8. Testes

- **Shared:** `vencimentoAnterior` (mensal com dia 31, fevereiro, virada de ano, semanal) e a ida e volta com `proximoVencimento`; `estornoSchema`.
- **API (banco descartável):** estorno devolve o vencimento e grava histórico; o caixa e o Painel excluem o estornado; fora de ordem, já estornado, motivo ausente, Auxiliar, 404 e contrato encerrado; dois estornos simultâneos; despesa fixa estornada não é regenerada; data futura recusada e data passada aceita com o vencimento avançando do jeito de sempre; migração (`CHECK`).
- **Web e E2E:** botão visível só para o Proprietário, confirmação com motivo, etiqueta, data no formulário; passo novo no roteiro de aceitação.

## 9. Riscos

- **Regra ainda não validada:** o proprietário não respondeu ao item 1; a decisão fica registrada no documento de decisões e pode mudar.
- **Valor do enum em transação:** `ADD VALUE` na migração só funciona se nada na mesma migração o usar; a migração não o usa.
- **Homologação:** a migração é aditiva, então o código anterior continua funcionando até o deploy.
