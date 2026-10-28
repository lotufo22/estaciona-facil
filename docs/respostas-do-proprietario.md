# Respostas do proprietário

Registro das respostas do proprietário ao **questionário de validação de funcionalidades**, à **segunda
rodada de perguntas** (Apêndice C do relatório extensionista) e às observações sobre **nome e cores**.
Origem: o documento `estacionamento.docx`, preenchido nas visitas ao estabelecimento. Registrado em
27/10/2026.

**Como ler.** As respostas estão como ele as deu (só corrigi a ortografia). Onde houve conclusão da equipe,
ela aparece separada, em *Interpretação* e *Impacto*, para que ninguém confunda o que ele disse com o que
nós deduzimos. O que ainda precisa da confirmação dele está em [`decisoes-para-o-proprietario.md`](./decisoes-para-o-proprietario.md).

> **Dados pessoais.** O documento original traz uma foto de um comprovante de papel com a placa de um veículo
> real. A foto **não** foi copiada para o repositório; o modelo abaixo usa um exemplo fictício.

## 1. Questionário de validação de funcionalidades

| # | Pergunta (resumida) | Resposta | Situação no sistema |
|---|---|---|---|
| 1 | Login com perfis diferentes (Operador, Administrador/Diretor e Cliente)? | **Não** | O sistema tem dois perfis (Proprietário e Auxiliar), sem perfil Cliente. Veja a observação 1 |
| 2 | Registrar a entrada do veículo (placa, tipo, data, horário e vaga)? | **Sim** | **Fase 2** (avulsos). Veja a seção 4 |
| 3 | Registrar a saída e calcular o valor da estadia? | **Sim** | **Fase 2**. Cobrança por hora cheia (seção 3) |
| 4 | Cadastrar, renovar e controlar contratos mensais e semanais? | **Sim** | ✅ Feito (Fase 1) |
| 5 | Pagamento em dinheiro, crédito, débito e Pix, com comprovante? | **Sim** | ✅ Feito (Fase 1) para mensalistas. O comprovante do avulso é da Fase 2 (seção 4) |
| 6 | Registrar e acompanhar serviços adicionais (lava-jato, reparos, estética)? | **Não** ("não faz este tipo de serviço") | ✅ Fora do escopo, como previsto |
| 7 | Canal de avaliações e comentários por aplicativo ou totem? | **Sim** | Fora do escopo atual. Veja a observação 2 |
| 8 | Classificar as avaliações por categoria de serviço? | **Sim** | Fora do escopo atual. Veja a observação 2 |
| 9 | Alertas quando a satisfação ficar abaixo de um mínimo? | **Sim** | Fora do escopo atual. Veja a observação 2 |
| 10 | Filtrar e analisar dados por período, tipo de contrato e categoria de veículo? | **Sim** | ✅ Feito (Fluxo de caixa e Vencimentos) |
| 11 | Alguma funcionalidade importante que não foi mencionada? | "Nada" | — |
| 12 | Alguma funcionalidade desnecessária ou que deveria mudar? | "Nada" | — |
| 13 | Outra sugestão para facilitar a gestão? | "Ver se o cliente já pagou através da placa, digitando ou tirando uma foto" | Veja a observação 3 |

### Observações da equipe

1. **Perfis.** Ele respondeu "Não", e na segunda rodada disse que só ele trabalha no estacionamento e que só
   ele usaria o computador. *Interpretação:* o perfil Auxiliar pode ser desnecessário hoje. *Impacto:* nada
   precisa ser removido (o perfil existe e não atrapalha), mas vale confirmar se ele quer mantê-lo.
2. **Avaliações.** As perguntas 7 a 9 foram respondidas "Sim", mas a spec retirou avaliações, serviços
   adicionais e alertas de satisfação do escopo (RF06 a RF09), com base no relatório. A resposta à pergunta 6
   mostra que ele lê com atenção, então não dá para tratar como engano. *Impacto:* pergunta aberta ao
   proprietário: quer isso **agora** ou só achou interessante?
3. **Consulta pela placa.** *Digitando* a placa já funciona hoje: a busca da barra superior e a lista de
   Mensalistas encontram o cliente pela placa (em qualquer formato) e mostram a situação (em dia, a vencer ou
   em atraso). *Tirando uma foto* (leitura automática da placa) **não existe** e é uma funcionalidade nova.

## 2. Segunda rodada de perguntas (Apêndice C)

### C.1 Carteira de mensalistas

| Pergunta | Resposta |
|---|---|
| Quantos mensalistas existem? É mais que 49, considerando o turno da noite? | "Até as 18h: 35 carros e 14 motos. Depois das 18h: 12 carros e 10 motos." |
| Valor da mensalidade para carro e moto? Há valor diferente para o noturno? | **Diurno:** carro R$ 150, moto R$ 80. **Noturno:** carro R$ 100, moto R$ 50 |
| O vencimento é o mesmo dia para todos? | **Não**, cada cliente tem o seu próprio vencimento |
| Todo mensalista tem vaga fixa numerada? | **Não** |
| O mensalista da noite usa a mesma vaga de um do dia? Como combinam? | **Sim.** O proprietário fica com as chaves e reorganiza quando necessário |
| Existe fila de espera? De quantas pessoas? | **Sim**, 16 carros |

*Interpretação:* a resposta à primeira pergunta parece dar a **capacidade** por turno, e não a contagem de
mensalistas. Somando, são 49 vagas de dia e 22 de noite (cerca de 71), o que seria **mais que 49**. *A
contagem real de mensalistas ainda precisa ser confirmada.*

*Impacto:*

- **Vaga opcional** no cadastro (já é assim) está certo, porque a maioria não tem vaga numerada.
- **Mensalista noturno na mesma vaga de um diurno:** o sistema permite **um** contrato ativo por vaga, então
  o segundo seria recusado com "vaga ocupada". O jeito de contornar hoje é cadastrar o noturno **sem vaga**,
  mas assim não há como registrar o **turno** nem relatar por turno. Isso é o item de "vaga por turno" da Fase 2.
- **Valores:** hoje o valor é digitado à mão. Os valores acima podem virar sugestão automática por categoria
  e turno.
- **Fila de espera:** o sistema não tem. É uma necessidade nova.

### C.2 Inadimplência e cobrança

| Pergunta | Resposta |
|---|---|
| Quantos clientes atrasam por mês? Como descobre? | Cerca de **4 a 5**. Usa uma **lista que ele mesmo faz** |
| Como é feita a cobrança? Já perdeu cliente por isso? | Por um **aviso que ele mesmo faz**. Não chegou a perder clientes |
| Já descobriu tarde demais que alguém estava há meses sem pagar? | **Sim.** Há um cliente **a 3 meses sem pagar**, e ele está atrás dele |

*Impacto:* a aba **Vencimentos** substitui a lista que ele faz à mão. O caso do cliente com 3 meses de atraso
é real: hoje cada recebimento cobre **um** mês, então quitar tudo de uma vez exige três lançamentos. Como ele já
usa o WhatsApp com os clientes (C.5) e o telefone está cadastrado, um botão de cobrança com mensagem pronta é
uma melhoria natural.

### C.3 Despesas e resultado

| Pergunta | Resposta |
|---|---|
| Quais são as despesas fixas e com que frequência? | "Água, luz, internet, governo, Daf" |
| Hoje consegue dizer se um mês foi melhor ou pior que o outro? | **Não** |
| O que gostaria de saber e hoje não consegue? | "Nada vem à mente agora" |

*Impacto:* o **Painel** (variação sobre o mês anterior) e o **Fluxo de caixa** respondem à segunda pergunta.
*A confirmar:* o que é "Daf" e se há **aluguel** entre as despesas fixas (a primeira entrevista citava aluguel;
aqui ele não aparece).

### C.4 Operação e veículo avulso

| Pergunta | Resposta |
|---|---|
| Ainda entra carro avulso? Quantos por dia? | **Sim**, de 2 a 10 por dia |
| Como é cobrado o avulso? | **Por hora cheia** |
| Quem trabalha além do senhor? Alguém reveza à noite? | "**Somente eu**" |
| Os papéis de estacionamento são usados para todo mundo ou só para o avulso? | "**Sim, para todo mundo**" |

*Interpretação:* "hora cheia" quer dizer que qualquer fração de hora é cobrada como hora inteira (a confirmar).
A resposta sobre o papel sugere que a entrada e a saída são anotadas também para os **mensalistas**, o que
afeta o escopo da Fase 2 (registrar entrada e saída de todos, e não só dos avulsos). *A confirmar.*

### C.5 Ambiente técnico

| Pergunta | Resposta |
|---|---|
| O computador do estabelecimento tem internet? Qual sistema? | "No momento estou **sem computador**, mas tenho **internet**" |
| Quem usa esse computador hoje e para quê? | "Somente eu usaria" |
| Usa o celular para trabalho, Pix ou WhatsApp com cliente? | **Sim** |
| Em que momento do dia conseguiria lançar as informações? | "Nos horários de mais calmaria, **sem horário certo**" |

*Impacto:* é a resposta com mais consequência prática.

- **A hospedagem na nuvem está confirmada** como caminho (há internet, e não há computador no estabelecimento
  para rodar o sistema localmente).
- **O celular é o aparelho principal.** O sistema precisa funcionar bem nele. Em teste numa tela de 390 px,
  todas as telas principais funcionam e nenhuma estoura para o lado, mas o cabeçalho ocupa cerca de um terço da
  tela e as abas rolam para o lado: há o que melhorar.
- **Sem horário fixo para lançar:** os recebimentos podem ser registrados depois do atendimento. Hoje o
  recebimento **sempre usa a data de hoje**, então um campo de data faz falta (veja a decisão 3 da lista).

### C.6 Formalização da parceria

| Pergunta | Resposta |
|---|---|
| Podemos citar o nome do estacionamento no trabalho da faculdade? | **Sim**. "Inclusive inventei um nome: Tanaga" |
| Podemos voltar durante o semestre para mostrar as telas e ouvir a opinião? | **Sim** |

## 3. Nome e cores (logo)

- **Nome:** o estacionamento recebeu recentemente o nome **TaNaGa** (ou **Tanaga**): são as letras com que
  começam os nomes das filhas dele. Quem escreveu o documento sugere a primeira grafia (TaNaGa).
- **Cores desejadas:** **verde, azul, amarelo e branco.**
- **Cor que não pode ter:** **vermelho.**

*Impacto.* O sistema se chama **EstacionaFácil** na tela de entrada, na barra superior, no rodapé, no título
da página e no comprovante. E **usa vermelho** como a cor de "em atraso" (quadro do Painel, etiquetas, sininho)
e nas mensagens de erro e campos inválidos; a paleta com esse vermelho veio da nossa spec (seção 7), sem
conhecimento da restrição. *Decisão pendente:* qual cor usar no lugar para "em atraso" e para erros, dentro de
verde, azul, amarelo e branco, **sem depender só da cor** (a situação já aparece sempre em texto), e se o nome
**Tanaga** passa a aparecer no sistema e no comprovante.

## 4. Modelo do comprovante de estacionamento (veículo avulso, Fase 2)

O estabelecimento usa hoje um **comprovante de papel**, preenchido à mão, numerado e com a frase de
responsabilidade. Quando o sistema registrar a entrada e a saída dos veículos (Fase 2), o comprovante emitido
**deve ter as informações abaixo**, que são as do papel atual:

| Campo | O que é | Exemplo (fictício) |
|---|---|---|
| **Data** | dia do estacionamento | 20/10/2026 |
| **Veículo** | tipo: carro ou moto | Moto |
| **Placa** | placa do veículo | ABC-1D23 |
| **Entrada** | horário em que entrou | 15:32 |
| **Saída** | horário em que saiu | 16:16 |
| **Valor** | valor cobrado, em reais | R$ 4,00 |

Também aparecem no papel atual, e **a equipe sugere manter**, mas ainda precisam de confirmação dele:

- um **número** do comprovante (no papel é pré-impresso, no exemplo "4595");
- a frase **"Não nos responsabilizamos por objetos deixados no interior do veículo"**;
- o **nome do estacionamento** no cabeçalho (hoje "Comprovante de Estacionamento"; pode virar **Tanaga**).

Exemplo do layout, com dados fictícios:

```text
┌─────────────────────────────────────┐
│  COMPROVANTE DE ESTACIONAMENTO  4595│
├─────────────────────────────────────┤
│  DATA      20/10/2026               │
│  VEÍCULO   Moto                     │
│  PLACA     ABC-1D23                 │
│  ENTRADA   15:32                    │
│  SAÍDA     16:16                    │
│  VALOR R$  4,00                     │
├─────────────────────────────────────┤
│  Não nos responsabilizamos por      │
│  objetos deixados no interior do    │
│  veículo.                           │
└─────────────────────────────────────┘
```

**Regra de cobrança (a confirmar).** O avulso é cobrado **por hora cheia**. No exemplo do papel, 44 minutos
(das 15:32 às 16:16) foram cobrados R$ 4,00, o que é coerente com uma tarifa de R$ 4,00 por hora para moto.
**Só temos esse exemplo:** falta a tarifa do **carro** e se há valor para frações ou para o dia todo.

**Não é este o comprovante do mensalista.** O comprovante de recebimento que o sistema já emite (Fase 1) é
outro documento: traz o número, o mensalista, a placa, a forma de pagamento, a data, o valor e o próximo
vencimento. Não tem *entrada* nem *saída*, porque o mensalista paga uma mensalidade, e não cada visita.

## 5. O que já está no sistema e o que ainda não

| Item | Situação |
|---|---|
| Contratos mensais e semanais, renovação, encerramento e histórico | ✅ Fase 1 |
| Cada cliente com o seu vencimento; vaga opcional | ✅ Fase 1 |
| Recebimento (dinheiro, débito, crédito e Pix) com comprovante | ✅ Fase 1 |
| Vencimentos, Painel e Fluxo de caixa, com filtros | ✅ Fase 1 |
| Consulta da situação pela placa digitada | ✅ Fase 1 |
| Funcionar bem no celular | 🟡 funciona; falta melhorar o cabeçalho e testar em aparelho real |
| Cores sem vermelho e o nome Tanaga | ❌ pendente (decisão) |
| Valores padrão por categoria e turno | ❌ não existe |
| Pagar vários meses de uma vez; corrigir lançamento errado | ❌ não existe |
| Cobrança pelo WhatsApp com mensagem pronta | ❌ não existe |
| Fila de espera de mensalistas | ❌ não existe |
| Entrada e saída, cálculo por hora cheia e comprovante de estacionamento | ❌ Fase 2 |
| Mensalista noturno na mesma vaga (turno) | ❌ Fase 2 |
| Consulta por foto da placa | ❌ não existe |
| Avaliações e satisfação dos clientes | ❌ fora do escopo (a confirmar) |
