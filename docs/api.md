# Rotas da API (proposta)

Rotas HTTP entre a tela (HTML) e o controlador (PHP), conforme os [diagramas de sequência](./diagramas/README.md).

| Requisição | Uso | Respostas |
|---|---|---|
| `POST /login` | Autenticar | 200, 401 |
| `POST /mensalistas` | Cadastrar mensalista | 201, 422, 409 |
| `GET /contratos` | Buscar contrato (pagamento, renovação e encerramento) | 200, 404 |
| `PATCH /contratos/{id}` | Renovar contrato | 200 |
| `DELETE /contratos/{id}` | Encerrar contrato | 204 |
| `POST /pagamentos` | Registrar pagamento | 201 |
| `GET /vencimentos` | Consultar vencidos e a vencer | 200 |
| `GET /fluxo-de-caixa` | Consultar fluxo de caixa e resultado | 200 |
| `POST /despesas/fixa` | Lançar despesa fixa | 201, 422 |
| `POST /despesas/variavel` | Lançar despesa variável | 201, 422 |
| `POST /entradas` | Registrar entrada de veículo | 201, 409 |
| `POST /saidas` | Registrar saída de veículo | 201, 404 |
| `POST /turnos` | Atribuir turno à vaga | 201, 409 |

## Significado dos códigos

| Código | Quando aparece |
|---|---|
| 200 OK | Consulta ou atualização concluída |
| 201 Created | Registro criado |
| 204 No Content | Operação concluída sem corpo de resposta (encerramento) |
| 401 Unauthorized | Login ou senha inválidos |
| 404 Not Found | Contrato ou entrada não encontrados |
| 409 Conflict | Conflito de placa, vaga, turno ou entrada já aberta |
| 422 Unprocessable | Dados da requisição inválidos |

> As rotas e os códigos são uma proposta de modelagem e podem mudar na implementação.
