# Decisões para levar ao proprietário

Pontos em que o sistema foi construído com **uma suposição nossa** ou tem uma **limitação conhecida**, e que
só o proprietário pode decidir. A lista vem do que apareceu ao construir e testar a Fase 1. Use-a na
validação em homologação: cada item tem o que o sistema faz hoje, a pergunta e uma sugestão.

> Nada aqui impede o uso do sistema. São escolhas que ficam melhores se vierem de quem usa o
> estacionamento todos os dias. Anote a resposta no fim de cada item.

## Resumo

| # | Assunto | Urgência | Mudança necessária |
|---|---|---|---|
| 1 | Corrigir um recebimento ou uma despesa lançados errado | **Alta** | funcionalidade nova |
| 2 | Renovar contrato semanal | Alta | pequena |
| 3 | Internet no estacionamento | Alta | nenhuma (decisão de uso) |
| 4 | Cliente que quita vários meses de uma vez | Média | funcionalidade nova |
| 5 | Cliente que volta depois de encerrar o contrato | Média | decisão + possível ajuste |
| 6 | Escrever o valor com vírgula | Média | pequena |
| 7 | Escolher a vaga numa lista | Baixa | pequena |
| 8 | Cor do resultado negativo no Painel | Baixa | trivial |
| 9 | Arquivar mensalistas antigos | Baixa | funcionalidade nova |
| 10 | Custo e riscos da hospedagem em produção | Na entrega | decisão |

---

## 1. Corrigir um lançamento errado

**Como é hoje.** Não existe como **alterar nem apagar** um recebimento ou uma despesa depois de lançados. O
recebimento sempre usa a data de **hoje** (a tela não tem campo de data). Se o Auxiliar digitar o valor ou a
forma de pagamento errados, o erro fica, e o vencimento do contrato já avançou.

**Pergunta.** Isso acontece? Quem pode corrigir, e como hoje é feito no papel: risca, anota ao lado, ou refaz?

**Opções.**

- **A. Estorno** (recomendada). O Proprietário "desfaz" o recebimento com um motivo: o pagamento fica marcado
  como estornado (continua no histórico, mas sai da soma do caixa), e o vencimento volta. Nada é apagado, o
  que é bom para quem presta contas.
- **B. Edição limitada** de valor e forma, só pelo Proprietário, com registro de quem mudou e quando.
- **C. Nada**, e a correção é feita fora do sistema (pedindo para a equipe técnica). Funciona no começo, mas
  não aguenta o dia a dia.

**Sugestão.** A, também para despesas lançadas errado.
**Resposta:** ____________________

## 2. Renovar contrato semanal

**Como é hoje.** A renovação pede o número de **meses** (1 a 12) e avança em meses, **inclusive nos contratos
semanais**. Para o contrato mensal isso está certo.

**Pergunta.** Existem contratos semanais de verdade, e eles são renovados sem pagamento (cortesia, acordo)?
Se sim, o certo seria contar em **semanas**?

**Sugestão.** Se há semanais, a renovação deles passa a pedir semanas. Se não há (ou ninguém renova assim),
deixar como está.
**Resposta:** ____________________

## 3. Internet no estacionamento

**Como é hoje.** Por decisão do projeto, o sistema roda **na nuvem**: precisa de internet para qualquer
operação, inclusive registrar um recebimento. O relatório inicial falava em funcionar **local e offline**.

**Pergunta.** A internet no estacionamento é estável? O que o Auxiliar faz hoje se faltar luz ou sinal?

**Opções.**

- **A. Manter a nuvem** e combinar um plano B: se cair a internet, anotar no caderno e lançar depois. Hoje
  **só dá para lançar com a data de hoje**; um recebimento anotado ontem e lançado hoje sairia com a data
  errada (ligado ao item 1).
- **B. Instalação local** no computador do estabelecimento. Funciona sem internet, mas exige refazer a
  hospedagem e o backup (trabalho grande).

**Sugestão.** A, desde que a internet seja razoável, e acrescentar o campo de data no recebimento (para o
plano B funcionar).
**Resposta:** ____________________

## 4. Cliente que quita vários meses de uma vez

**Como é hoje.** Cada recebimento cobre **um mês** (ou uma semana), a partir do vencimento atual. Se o
cliente deve três meses e paga tudo junto, o Auxiliar precisa registrar **três recebimentos**. O contrato
continua em atraso até o terceiro.

**Pergunta.** Isso é comum? Atrapalha o atendimento?

**Sugestão.** Se for comum, um campo **"quantos meses"** no recebimento (gera os lançamentos de uma vez).
Se for raro, manter.
**Resposta:** ____________________

## 5. Cliente que volta depois de encerrar o contrato

**Como é hoje.** Encerrar é definitivo: o contrato some da lista, e a vaga e a placa ficam livres. Se o
cliente volta, o Proprietário faz um **novo cadastro**; o histórico do contrato anterior **não** aparece junto
no novo (fica ligado ao registro antigo).

**Pergunta.** Clientes voltam com frequência? O histórico antigo faz falta?

**Opções.** **A.** Manter como está. **B.** Um botão **"Reativar"** que reabre o contrato anterior com o
histórico. **C.** O novo cadastro encontrar o cliente pela placa e continuar o histórico.

**Sugestão.** A, e B se voltar com frequência.
**Resposta:** ____________________

## 6. Escrever o valor com vírgula

**Como é hoje.** O valor exige **ponto e duas casas** (`255.00`). Quem digita `255,00` (o natural no Brasil)
vê o erro "Informe o valor com duas casas decimais, como 255.00". O manual explica, mas é um tropeço para quem tem pouca
experiência com computador.

**Sugestão.** Aceitar a vírgula e converter sozinho (`255,00` vira `255.00`). Mudança pequena e só na tela.
**Resposta:** ____________________

## 7. Escolher a vaga numa lista

**Como é hoje.** A vaga é um campo de texto: o usuário digita `01` ou `M1`. Digitar uma vaga que não existe
dá erro no campo; digitar uma ocupada também.

**Pergunta.** Seria mais fácil escolher numa lista que mostre **só as vagas livres** (da categoria do veículo)?

**Sugestão.** Sim, se o proprietário concordar: tira dois tipos de erro.
**Resposta:** ____________________

## 8. Cor do resultado negativo no Painel

**Como é hoje.** O quadro **Resultado do mês** do Painel é **verde**, inclusive quando o resultado é negativo
(o sinal de menos e a porcentagem aparecem em texto). No Fluxo de caixa, o resultado negativo já é vermelho.

**Sugestão.** Verde para resultado positivo e vermelho para negativo, nos dois lugares. Trivial.
**Resposta:** ____________________

## 9. Arquivar mensalistas antigos

**Como é hoje.** O banco tem o campo "arquivado em", mas **nenhuma tela o usa**. Hoje, quem saiu é
**encerrado**; a lista só mostra contratos ativos, então ele já sai da vista.

**Pergunta.** Falta algo além do encerramento? Por exemplo, consultar quem já foi mensalista.

**Sugestão.** Se a necessidade for "consultar ex-clientes", uma busca por encerrados resolve melhor que
arquivar.
**Resposta:** ____________________

## 10. Custo e riscos da hospedagem em produção

**Como é hoje.** Em desenvolvimento e validação o custo é **US$ 0**. Em produção, mantendo US$ 0:

- o plano gratuito do banco **não tem backup automático** (o sistema faz o seu, noturno e criptografado);
- o projeto do banco é **pausado após uma semana sem uso**;
- a hospedagem **pausa todos os sites** se os créditos mensais acabarem (cada publicação gasta créditos).

A opção recomendada para produção é o plano pago do banco (**US$ 25 por mês**, com backup diário e sem
pausa), e opcionalmente o plano pago da hospedagem (**US$ 9 por mês**).

**Pergunta (para o proprietário e o grupo, ao fim do semestre).** Quem paga? Há problema se o sistema ficar
parado por uma semana de férias e precisar ser "acordado"?
**Resposta:** ____________________

---

## Fora desta lista, mas combinado em outros documentos

- A **validação do manual do usuário** com o Auxiliar: ele consegue seguir o passo a passo sozinho?
- A **oficina de capacitação**, prevista para dezembro.
- O **Documento de Visão 2.0** (RF11 a RF14), que a equipe ainda precisa escrever.
