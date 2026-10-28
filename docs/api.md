# Rotas da API

API REST em JSON, sob o prefixo `/api`. Implementada com Express (`apps/api`); as regras e os schemas de
validação vêm do pacote `@estacionafacil/shared`, o mesmo que valida os formulários da interface.
Os [diagramas de sequência](./diagramas/README.md) descrevem os fluxos de uso; esta página descreve o que a
API **realmente** faz.

## Convenções

- **Dinheiro** sempre em texto decimal com duas casas: `"255.00"`. Nunca número de ponto flutuante.
  `"255,00"`, `"0.00"`, negativo e mais de duas casas dão **422** no campo `valor`.
- **Datas** no formato `AAAA-MM-DD`, no fuso `America/Sao_Paulo`.
- **Placa** é normalizada antes de qualquer comparação (`abc-1d23`, `ABC1D23` e `ABC 1D23` são a mesma).
- **Situação do contrato** é calculada, nunca gravada: `vencido` se o vencimento já passou, `a_vencer` se
  faltam de 0 a 7 dias, `em_dia` nos demais casos.
- **Sessão** por cookie `httpOnly`, `Secure` e `SameSite=Lax`, guardada no banco; expira com **12 horas** de
  inatividade. Depois de `POST /auth/login`, o navegador envia o cookie sozinho.
- **Escritas** (`POST`, `PATCH`) exigem o cabeçalho `X-Estaciona-App: 1`, como proteção contra CSRF. Sem ele:
  `403`.
- **Permissão** é conferida na API em toda rota: `401 NAO_AUTENTICADO` sem login e `403 SEM_PERMISSAO` com o
  perfil errado. Esconder a aba na interface é só conforto visual.

### Formato de erro

```json
{
  "erro": {
    "codigo": "PLACA_JA_CADASTRADA",
    "mensagem": "Esta placa já tem contrato ativo.",
    "campos": { "placa": "Esta placa já tem contrato ativo" }
  }
}
```

`mensagem` vai direto para a tela, em português simples. `campos` (opcional) aponta o campo com problema.
Erro inesperado vira `500 ERRO_INTERNO` sem detalhes internos.

| Código | HTTP | Quando |
|---|---|---|
| `DADOS_INVALIDOS` | 400, 422 | corpo ou filtro inválido (`campos` diz qual) |
| `NAO_AUTENTICADO` | 401 | sem sessão válida |
| `CREDENCIAIS_INVALIDAS` | 401 | usuário ou senha errados |
| `SEM_PERMISSAO` | 403 | perfil sem acesso à rota |
| `NAO_ENCONTRADO` | 404 | recurso ou rota inexistente |
| `PLACA_JA_CADASTRADA` | 409 | a placa já tem contrato ativo |
| `VAGA_OCUPADA` | 409 | a vaga já tem contrato ativo |
| `CONTRATO_ENCERRADO` | 409 | pagar, renovar, editar ou encerrar um contrato já encerrado |
| `CHAVE_IDEMPOTENCIA_AUSENTE` | 400 | `POST /pagamentos` sem `Idempotency-Key` |
| `MUITAS_TENTATIVAS` | 429 | 5 falhas de login em 15 minutos (traz `Retry-After`) |
| `ERRO_INTERNO` | 500 | erro inesperado |

## Rotas

**Quem:** *Prop.* = só o Proprietário · *todos* = Proprietário e Auxiliar · *público* = sem login.

### Autenticação

| Rota | O que faz | Quem | Respostas |
|---|---|---|---|
| `POST /auth/login` | Entra. Corpo `{ login, senha }`. Devolve `{ id, nome, perfil }` e o cookie de sessão | público | 200, 401, 422, 429 |
| `POST /auth/logout` | Encerra a sessão | todos | 204 |
| `GET /auth/me` | Usuário e perfil da sessão | todos | 200, 401 |

Limite de **5 tentativas a cada 15 minutos** por login e IP (contadas no banco); senhas com `argon2id`.

### Mensalistas e contratos

| Rota | O que faz | Quem | Respostas |
|---|---|---|---|
| `GET /mensalistas` | Contratos ativos. Filtros: `busca` (nome ou placa), `situacao`, `categoria`, `tipo`, `contrato`, `pagina` (10 por página) | todos | 200, 422 |
| `POST /mensalistas` | Cadastra cliente, veículo e contrato numa transação. Corpo: `nome`, `telefone`, `placa`, `categoria`, `vaga?`, `tipo`, `valor`, `diaVencimento`, `inicio`. Devolve `{ mensalistaId, contratoId }` | Prop. | 201, 409, 422 |
| `GET /mensalistas/:id` | Dados, contrato atual e histórico (do mais recente ao mais antigo) | todos | 200, 404 |
| `PATCH /mensalistas/:id` | Atualiza `telefone`, `placa`, `vaga` (`null` tira da vaga) e `valor`. Devolve o detalhe | Prop. | 200, 404, 409, 422 |
| `POST /contratos/:id/renovacao` | Estende o vencimento em `meses` (1 a 12), sem pagamento, com `motivo` obrigatório | Prop. | 200, 404, 409, 422 |
| `POST /contratos/:id/encerramento` | Encerra o contrato e libera a vaga e a placa | Prop. | 200, 404, 409 |

Só existe **um contrato ativo por placa e por vaga** (garantido por índices únicos no banco). Encerrar libera
ambas para um novo contrato. A vaga precisa existir e ser da mesma categoria do veículo (`422` em `campos.vaga`).

### Pagamentos

| Rota | O que faz | Quem | Respostas |
|---|---|---|---|
| `POST /pagamentos` | Registra o recebimento e avança o vencimento do contrato. Corpo: `contratoId`, `valor`, `forma` (`dinheiro`, `pix`, `debito`, `credito`), `pagoEm`. Devolve `{ pagamento, novoVencimento }` | todos | 201, 400, 404, 409, 422 |
| `GET /pagamentos` | Lançamentos. Filtros: `de`, `ate`, `forma`. Devolve `{ itens, total }`, do mais recente ao mais antigo | todos | 200, 422 |
| `GET /pagamentos/:id` | Dados do comprovante | todos | 200, 404 |

- **`Idempotency-Key` é obrigatória** no `POST`. Repetir a mesma chave devolve **o mesmo corpo e `201`, sem nova
  linha**, para clique duplo ou rede lenta não cobrarem duas vezes. Pedidos simultâneos com a mesma chave
  criam um só pagamento.
- **Cada pagamento cobre um mês** (ou 7 dias, no contrato semanal) a partir do **vencimento atual**, não de hoje.
  Um contrato vencido há três meses, pago uma vez, avança um mês e continua vencido.
- A resposta a uma chave repetida traz o vencimento **atual** do contrato (o do primeiro envio não fica gravado).

### Despesas

| Rota | O que faz | Quem | Respostas |
|---|---|---|---|
| `POST /despesas` | Lança despesa. Corpo: `descricao`, `valor`, `tipo` (`fixa` ou `variavel`), `data`, e `diaDoMes` se fixa. Devolve `{ despesaId, recorrenciaId }` | todos | 201, 422 |
| `GET /despesas` | Lista. Filtros: `de`, `ate`, `tipo`. Devolve `{ itens, total }` | todos | 200, 422 |
| `GET /recorrencias` | Despesas fixas, **ativas e pausadas** (campo `ativa`) | todos | 200 |
| `PATCH /recorrencias/:id` | Pausa ou retoma. Corpo `{ ativa: boolean }` | Prop. | 200, 404, 422 |

Uma despesa **fixa** cria a recorrência e o lançamento do mês. A função agendada `gerar-despesas`
(03:00 UTC, todo dia) lança os meses seguintes no dia configurado (dia 31 cai no último dia de meses
curtos), sem duplicar e recuperando um dia em que não rodou.

### Consultas gerenciais (só Proprietário)

| Rota | O que faz | Respostas |
|---|---|---|
| `GET /painel` | Mensalistas ativos e novos no mês, vencidos e a vencer (com soma dos valores), resultado do mês com variação sobre o anterior, série dos 6 últimos meses, contagem por situação e os 5 últimos recebimentos | 200 |
| `GET /vencimentos` | Contratos ativos por vencimento, com totais por situação. Filtros: `situacao` (só filtra a tabela), `categoria`, `tipo` | 200, 422 |
| `GET /caixa` | Receitas, despesas, resultado, série por mês e divisão por forma de pagamento. Obrigatórios: `de` e `ate`. Opcionais: `tipo`, `categoria` | 200, 422 |

Regime de caixa: **receita pela data do pagamento**, **despesa pela data da despesa**. Com filtro de `tipo` ou
`categoria`, só as receitas são filtradas, e o `resultado` vem `null` com `filtrado: true` (despesas não
pertencem a contrato nem a veículo). `ate` anterior a `de` dá `422` em `campos.ate`.

### Saúde

| Rota | O que faz | Quem | Respostas |
|---|---|---|---|
| `GET /saude` | Verificação de funcionamento: `{ "status": "ok" }` | público | 200 |

## Como a API roda

`criarApp()` (`apps/api/src/app.ts`) monta o Express sem abrir porta. O servidor local (`npm run dev`) e a
função da Netlify (`netlify/nucleo/api.ts`) usam **o mesmo app**. Na Netlify, `/api/*` é redirecionado para a
função, e o front e a API ficam no mesmo domínio. Veja o [guia de instalação](./guia-de-instalacao.md).
