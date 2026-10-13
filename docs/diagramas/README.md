# Diagramas UML

Esta pasta reúne a modelagem do EstacionaFácil em UML, escrita em [PlantUML](https://plantuml.com) (`.puml`). Para visualizar, use a extensão do PlantUML no VS Code ou o [editor online](https://www.plantuml.com/plantuml). Cada diagrama tem o arquivo `.puml` (fonte editável) e o `.svg` (imagem para visualização) com o mesmo nome.

## Sobre os diagramas

Usamos dois tipos de diagrama, que se complementam:

| Tipo | O que mostra | Pergunta que responde |
|---|---|---|
| **Casos de uso** | Os objetivos de cada usuário (ator) no sistema e como esses objetivos se relacionam | *O que o sistema faz e para quem?* |
| **Sequência** | A troca de mensagens, em ordem, entre o ator, a tela, o controlador e o banco de dados para realizar um caso de uso | *Como o sistema faz isso, passo a passo?* |

Leia primeiro o diagrama de casos de uso, que dá a visão geral. Depois escolha um caso de uso e abra o diagrama de sequência correspondente, para ver o fluxo interno, incluindo os erros possíveis.

### Como ler um diagrama de sequência

- Cada coluna é um participante, e o tempo corre de cima para baixo.
- Seta contínua é uma chamada. Seta tracejada é a resposta.
- A barra estreita sobre a linha vertical indica que o participante está ativo naquele momento.
- A caixa `break` marca um desvio de erro: se a condição ocorrer, o fluxo para ali e o erro chega ao usuário.
- A caixa `alt` marca alternativas (uma ou outra). A caixa `ref` indica que o trecho está detalhado em outro diagrama.

## Casos de uso

19 casos de uso e dois atores. Fonte: [`casos_de_uso_estacionafacil_completo.puml`](./casos-de-uso/casos_de_uso_estacionafacil_completo.puml).

![Diagrama de casos de uso do EstacionaFácil](./casos-de-uso/casos_de_uso_estacionafacil_completo.svg)

- **Auxiliar:** autenticação, registro de entrada, saída e pagamento, lançamento de despesas e consultas do dia e da lista de mensalistas.
- **Proprietário:** herda os casos do Auxiliar (generalização) e acrescenta cadastro, atualização e encerramento de mensalistas, renovação de contratos, gestão de vagas por turno e as consultas gerenciais.
- **`include`:** comportamento obrigatório. A seta vai do caso base para o incluído (atribuir vaga na entrada, calcular valor e registrar pagamento na saída, emitir comprovante no pagamento).
- **`extend`:** comportamento opcional. A seta vai do caso que estende para o base (filtro por período, contrato e categoria nas consultas).

## Diagramas de sequência

| Diagrama | Imagem | Fonte | Caso de uso relacionado |
|---|---|---|---|
| Autenticar no sistema | [SVG](./sequencia/sequencia_autenticar_no_sistema_http.svg) | [.puml](./sequencia/sequencia_autenticar_no_sistema_http.puml) | Autenticar no sistema |
| Cadastrar mensalista | [SVG](./sequencia/sequencia_cadastrar_mensalista_http.svg) | [.puml](./sequencia/sequencia_cadastrar_mensalista_http.puml) | Cadastrar mensalista |
| Registrar pagamento | [SVG](./sequencia/sequencia_registrar_pagamento_http.svg) | [.puml](./sequencia/sequencia_registrar_pagamento_http.puml) | Registrar pagamento |
| Renovar contrato | [SVG](./sequencia/sequencia_renovar_contrato_http.svg) | [.puml](./sequencia/sequencia_renovar_contrato_http.puml) | Renovar contrato |
| Encerrar contrato | [SVG](./sequencia/sequencia_encerrar_contrato_http.svg) | [.puml](./sequencia/sequencia_encerrar_contrato_http.puml) | Encerrar contrato |
| Consultar vencidos e a vencer | [SVG](./sequencia/sequencia_consultar_vencidos_e_a_vencer_http.svg) | [.puml](./sequencia/sequencia_consultar_vencidos_e_a_vencer_http.puml) | Consultar vencidos e a vencer |
| Consultar fluxo de caixa e resultado | [SVG](./sequencia/sequencia_consultar_fluxo_de_caixa_http.svg) | [.puml](./sequencia/sequencia_consultar_fluxo_de_caixa_http.puml) | Consultar fluxo de caixa e resultado |
| Lançar despesa | [SVG](./sequencia/sequencia_lancar_despesa_http.svg) | [.puml](./sequencia/sequencia_lancar_despesa_http.puml) | Lançar despesa |
| Registrar recorrência de despesa fixa | [SVG](./sequencia/sequencia_registrar_recorrencia_de_despesa_fixa.svg) | [.puml](./sequencia/sequencia_registrar_recorrencia_de_despesa_fixa.puml) | Sub-diagrama referenciado por Lançar despesa (não é caso de uso) |
| Registrar entrada de veículo | [SVG](./sequencia/sequencia_registrar_entrada_de_veiculo_http.svg) | [.puml](./sequencia/sequencia_registrar_entrada_de_veiculo_http.puml) | Registrar entrada de veículo |
| Registrar saída de veículo | [SVG](./sequencia/sequencia_registrar_saida_de_veiculo_http.svg) | [.puml](./sequencia/sequencia_registrar_saida_de_veiculo_http.puml) | Registrar saída de veículo |
| Gerenciar vaga por turno | [SVG](./sequencia/sequencia_gerenciar_vaga_por_turno_http.svg) | [.puml](./sequencia/sequencia_gerenciar_vaga_por_turno_http.puml) | Gerenciar vaga por turno |

Atualizar dados do mensalista, consultar lista de mensalistas, histórico do contrato e lançamentos do dia não têm diagrama, por serem leituras e gravações simples.

## Convenções

- **Participantes:** Ator, Tela (HTML), Controlador (PHP) e Banco (MySQL).
- **Mensagens:** chamadas síncronas (seta cheia) e retornos tracejados. Verbos e códigos HTTP só aparecem entre Tela e Controlador. O lado do banco usa consultas SQL (`ok`, etc.).
- **`include`:** autochamada no controlador com o nome do método. Se precisar do banco, a consulta aparece aninhada.
- **Validação:** `validarDados()` confere a requisição isolada, sem banco. Qualquer verificação que precise do banco é uma consulta própria.
- **Conflitos:** a consulta traz só as linhas conflitantes, e um `break` dispara se vier alguma.
- **Erros:** todo `break` termina com uma mensagem ao ator, e não há `deactivate` dentro dele.
- **`ref`:** um diagrama reutiliza outro (Lançar despesa → recorrência; Registrar saída → Registrar pagamento).

Rotas da API: [`../api.md`](../api.md).
