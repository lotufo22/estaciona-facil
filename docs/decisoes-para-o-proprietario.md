# Decisões para levar ao proprietário

Pontos em que o sistema foi construído com **uma suposição nossa** ou tem uma **limitação conhecida**, e que
só o proprietário pode decidir. A lista vem do que apareceu ao construir e testar a Fase 1. Use-a na
validação em homologação: cada item tem o que o sistema faz hoje, a pergunta e uma sugestão.

> Nada aqui impede o uso do sistema. São escolhas que ficam melhores se vierem de quem usa o
> estacionamento todos os dias. Anote a resposta no fim de cada item.

As respostas que o proprietário **já deu** (questionário e segunda rodada) estão em
[`respostas-do-proprietario.md`](./respostas-do-proprietario.md). Os itens 11 a 18 abaixo nasceram dessas
respostas, e o item 3 já foi respondido por elas.

## Resumo

| # | Assunto | Urgência | Mudança necessária |
|---|---|---|---|
| 1 | Corrigir um recebimento ou uma despesa lançados errado | **Alta** | funcionalidade nova |
| 2 | Renovar contrato semanal | Alta | pequena |
| 3 | Internet no estacionamento | ✅ respondida; falta o campo de data | pequena |
| 4 | Cliente que quita vários meses de uma vez | Média | funcionalidade nova |
| 5 | Cliente que volta depois de encerrar o contrato | Média | decisão + possível ajuste |
| 6 | Escrever o valor com vírgula | Média | pequena |
| 7 | Escolher a vaga numa lista | Baixa | pequena |
| 8 | Cor do resultado negativo no Painel | Baixa | trivial |
| 9 | Arquivar mensalistas antigos | Baixa | funcionalidade nova |
| 10 | Custo e riscos da hospedagem em produção | Na entrega | decisão |
| 11 | **Sem vermelho:** cor de "em atraso" e dos erros | **Alta** | pequena |
| 12 | Celular como aparelho principal | **Alta** | média |
| 13 | Mensalista noturno e vaga compartilhada (turno) | **Alta** | grande (Fase 2) |
| 14 | Avaliações dos clientes: ele respondeu "Sim" | Média | decisão |
| 15 | Nome **Tanaga** e identidade visual | Média | pequena |
| 16 | Valores padrão por categoria e turno | Média | pequena |
| 17 | Cobrança pelo WhatsApp com mensagem pronta | Média | pequena |
| 18 | Fila de espera de mensalistas | Baixa | funcionalidade nova |

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

**Resposta dele (segunda rodada, C.5).** "No momento estou **sem computador**, mas tenho **internet**."
Usa o celular para o trabalho, para Pix e para o WhatsApp com os clientes, e lança as informações "nos
horários de mais calmaria, sem horário certo". Só ele usaria o sistema.

**Conclusão.** A **nuvem está confirmada**: há internet, e não existe computador no estabelecimento para
rodar o sistema localmente (a opção B deixa de fazer sentido). O aparelho principal é o **celular** (item
12).

**O que ainda falta.** Como não há horário fixo para lançar, o recebimento pode ser registrado **depois** do
atendimento. Hoje a tela **só lança com a data de hoje**, então um recebimento anotado antes e lançado agora
sairia com a data errada. Falta um **campo de data** no recebimento (ligado ao item 1).

**Pergunta que sobra.** O que ele faz hoje se faltar internet no estacionamento? (Sugestão: anotar no caderno
e lançar depois, com a data certa.)
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

**Atenção.** Este item **depende do item 11**: o proprietário disse que o **vermelho não pode aparecer** no
sistema, então "vermelho para negativo" deixou de ser uma opção. A cor do resultado negativo precisa ser
escolhida junto com a cor de "em atraso".

**Sugestão.** Que o resultado positivo e o negativo tenham cores diferentes **nos dois lugares**, com o sinal
sempre em texto. Trivial depois de decidido o item 11.
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

# Itens que nasceram das respostas dele

Os itens abaixo vêm de [`respostas-do-proprietario.md`](./respostas-do-proprietario.md).

## 11. Sem vermelho: cor de "em atraso" e dos erros

**O que ele disse.** Cores desejadas: **verde, azul, amarelo e branco**. Cor que **não pode ter: vermelho**.

**Como é hoje.** O sistema usa **vermelho** para "em atraso" (quadro **Contratos vencidos** do Painel,
etiquetas, sininho, gráfico) e também nas **mensagens de erro** e nos campos inválidos dos formulários. Esse
vermelho (`#B42318`) veio da nossa spec, sem conhecimento da restrição.

**Pergunta.** A restrição vale para tudo, inclusive atraso e erros? Qual cor ele aceita no lugar?

**Opções.** A situação **já aparece sempre em texto**, então a cor é reforço, não a única informação.

- **A. Cinza-escuro ou preto** para "em atraso" e para erros, com o ícone de alerta. Contraste forte, sem
  ficar parecido com vermelho, mas "frio".
- **B. Azul-escuro** para "em atraso" e **amarelo** para "a vencer", com verde para "em dia". Dentro da
  paleta dele, mas azul costuma significar "normal".
- **C. Laranja/âmbar** para erros e atraso. Fica perto do vermelho: **só se ele aceitar**.

**Sugestão.** B ou A, mostrando a ele as três em tela antes de escolher.
**Resposta:** ____________________

## 12. Celular como aparelho principal

**O que ele disse.** Está "sem computador"; usa o celular para trabalho, Pix e WhatsApp.

**Como é hoje.** Testamos numa tela de 390 px: as telas principais **funcionam e não estouram para o lado**.
Mas o cabeçalho ocupa cerca de **um terço da tela** e as abas rolam para o lado. Não foi testado em aparelho
real.

**Pergunta.** Que celular ele usa (Android ou iPhone) e que navegador? Ele quer o sistema como "atalho" na
tela inicial?

**Sugestão.** Cabeçalho mais compacto no celular e abas na parte de baixo da tela; testar num aparelho real
na próxima visita.
**Resposta:** ____________________

## 13. Mensalista noturno e vaga compartilhada (turno)

**O que ele disse.** Até as 18h: 35 carros e 14 motos; depois das 18h: 12 carros e 10 motos. O mensalista da
noite usa a **mesma vaga** de um do dia; ele fica com as chaves e reorganiza. **A maioria não tem vaga fixa
numerada.** Mensalidade noturna é mais barata (item 16).

**Como é hoje.** O sistema permite **um contrato ativo por vaga**: cadastrar um noturno na vaga de um diurno
dá "vaga ocupada". O contorno atual é cadastrar o noturno **sem vaga**, mas assim **não existe o turno** (dia
ou noite): não dá para listar, contar nem relatar por turno.

**Pergunta.** Quantos mensalistas são noturnos? Ele precisa **ver o turno** nas listas e nos relatórios?

**Sugestão.** É o item "vaga por turno" da Fase 2. Se os noturnos são cerca de um terço da carteira, vale
antecipar pelo menos o **campo de turno** no contrato.
**Resposta:** ____________________

## 14. Avaliações dos clientes: ele respondeu "Sim"

**O que ele disse.** Sim a um canal de avaliações (aplicativo ou totem), à classificação por categoria e aos
alertas de satisfação baixa.

**Como é hoje.** A spec **tirou isso do escopo** (RF06 a RF09), com base no relatório. Nada disso existe.

**Pergunta.** Ele quer isso **agora** ou só achou interessante? Com um estacionamento de pequeno porte, de
poucos funcionários, um canal de avaliações dá trabalho para quem lê.

**Sugestão.** Deixar para uma fase futura e registrar como desejo, a menos que seja prioridade dele.
**Resposta:** ____________________

## 15. Nome Tanaga e identidade visual

**O que ele disse.** O estacionamento recebeu o nome **TaNaGa/Tanaga** (letras das filhas dele); quem
escreveu sugere a grafia **TaNaGa**. Cores: verde, azul, amarelo e branco.

**Como é hoje.** O sistema se chama **EstacionaFácil** na tela de entrada, na barra superior, no rodapé, no
título da página e no **comprovante**. Não há logo do estabelecimento.

**Pergunta.** O nome **Tanaga** aparece no sistema e no comprovante? Qual grafia? Existe um logo pronto, ou
precisamos criar um (verde, azul, amarelo e branco)?

**Sugestão.** Mostrar **Tanaga** no cabeçalho, na entrada e nos comprovantes, deixando "EstacionaFácil" só
como nome do projeto no rodapé.
**Resposta:** ____________________

## 16. Valores padrão por categoria e turno

**O que ele disse.** Mensalidade **diurna**: carro R$ 150, moto R$ 80. **Noturna**: carro R$ 100, moto R$ 50.

**Como é hoje.** O valor é **digitado à mão** em cada cadastro (e os exemplos do manual usam outros valores).

**Pergunta.** Esses valores são para todos os clientes, ou há preços especiais?

**Sugestão.** Preencher o valor sozinho conforme a categoria (e o turno, quando houver), mantendo o campo
editável para os preços especiais. Trocar os exemplos do manual pelos valores reais.
**Resposta:** ____________________

## 17. Cobrança pelo WhatsApp com mensagem pronta

**O que ele disse.** Cobra quem atrasa por um **aviso que ele mesmo faz**; usa o WhatsApp com os clientes;
há um cliente a **3 meses sem pagar**.

**Como é hoje.** A aba **Vencimentos** mostra quem está em atraso, mas a cobrança é feita fora do sistema.
O telefone de cada cliente já está cadastrado.

**Pergunta.** Ele gostaria de um botão **"Cobrar pelo WhatsApp"** que abre a conversa com a mensagem já
escrita (nome, valor e vencimento)? Qual o texto que ele usa hoje?

**Sugestão.** Sim: é uma melhoria pequena, usando o telefone que já temos, e o sistema **não envia nada
sozinho** (ele confere e manda).
**Resposta:** ____________________

## 18. Fila de espera de mensalistas

**O que ele disse.** Existe fila de espera, de **16 carros**.

**Como é hoje.** O sistema **não tem** fila de espera.

**Pergunta.** Ele quer controlar essa fila no sistema (nome, telefone, data do pedido, categoria) para
chamar o próximo quando abrir uma vaga?

**Sugestão.** Uma lista simples, só do Proprietário, ligada ao encerramento de contratos ("abriu uma vaga:
chamar quem?"). Fica para depois da validação da Fase 1.
**Resposta:** ____________________

---

## Fora desta lista, mas combinado em outros documentos

- A **validação do manual do usuário** com quem vai usar: como ele disse que **só ele** usaria o sistema, o
  teste é com o proprietário, no celular.
- A **oficina de capacitação**, prevista para dezembro.
- O **Documento de Visão 2.0** (RF11 a RF14), que a equipe ainda precisa escrever.
