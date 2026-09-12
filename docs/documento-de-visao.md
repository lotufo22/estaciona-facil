# Documento de Visão do Software — EstacionaFácil

**Aprendizagem por Projetos — 4º ADS/SI — 2026-2**
**Requisitos de Cliente-Professor e Equipe**

## Tema do Trabalho

Produto com contexto dos objetivos de Competências da disciplina

### Objetivos (conforme Plano de Ensino)

- Desenvolver e aplicar os principais conceitos relativos à engenharia de software;
- Identificar e utilizar os métodos adequados, no processo de desenvolvimento de um software;
- Aplicar, por meio de laboratórios, os conceitos discutidos em sala de aula.

### Conhecimentos no semestre (conforme Plano de Ensino)

Engenharia de software: Conceitos e definições. Planejamento do desenvolvimento de software. Projeto prático. Requisitos de software: Elicitação, Especificação, Modelagem. Projeto de software usando UML. Codificação. Qualidade de Software. Teste de software. Métricas (processo e produto). Gestão da Configuração.

> **Observação:** embora os tópicos apresentados tenham sido escritos com outra visão ou abordagem para a disciplina, seguiremos desenvolvendo de forma implícita aos tópicos.

---

## Título do Desafio

**Especificação e Modelagem do Sistema EstacionaFácil**

> **Observação:** Como interpretar automaticamente o que os clientes dizem sobre nossos serviços para melhorar a tomada de decisão em um estacionamento com portfólio amplo e crescente?

---

## Descrição do Desafio

O EstacionaFácil — nome fictício adotado neste desafio — é um estacionamento localizado no centro da cidade, fundado há mais de 20 anos pela família. Durante décadas, o negócio operou de forma simples: reserva avulsa de vagas descobertas, pagamento presencial em dinheiro e um manobrista de confiança. A reputação era sólida, a clientela era fiel e o movimento era garantido pela boa localização.

Com o passar dos anos, a concorrência intensificou-se. Novos concorrentes do setor passaram a oferecer vagas cobertas com preços diferenciados, contratos mensais e semanais, planos para motos e veículos de grande porte, serviços de pernoite para frequentadores de casas de show próximas, autoatendimento via aplicativo com reserva antecipada, além de serviços agregados como lava-jato, pequenos reparos mecânicos e estética automotiva. O EstacionaFácil também viu sua oferta de serviços demandar novos meios de pagamento — como Pix e cartão de crédito —, múltiplas categorias tarifárias e um canal próprio com avaliações de clientes.

Hoje, o diretor operacional enfrenta este desafio: a empresa precisa de uma solução computacional capaz de extrair os principais pontos de serviço e apresentar indicadores de gestão e de satisfação do cliente, permitindo decisões mais rápidas e embasadas.

---

## Requisitos Funcionais e Não Funcionais

### Requisitos Funcionais

| ID | Descrição |
|------|-----------|
| RF01 | O sistema deve permitir o login de diferentes perfis de usuários (Operador, Administrador/Diretor e Cliente) com níveis de permissão |
| RF02 | O sistema deve registrar a entrada de um veículo, capturando a placa, o tipo de veículo (carro, moto, veículo de grande porte), a data/hora de entrada e a atribuição de uma vaga |
| RF03 | O sistema deve registrar a saída do veículo, calculando automaticamente o valor da estadia com base no tempo de permanência e na tabela de tarifas vigente |
| RF04 | O sistema deve permitir o cadastro, renovação e controle de contratos mensais e semanais (vagas fixas ou rotativas para mensalistas) |
| RF05 | O sistema deve processar pagamentos nas modalidades Dinheiro, Cartão de Crédito/Débito e Pix, emitindo o comprovante/recibo correspondente |
| RF06 | O sistema deve permitir registrar a venda e o status de serviços adicionais oferecidos, como lava-jato, pequenos reparos mecânicos e estética automotiva |
| RF07 | O sistema deve disponibilizar um canal (via aplicativo ou totem) para que os clientes registrem avaliações de satisfação e comentários sobre o atendimento |
| RF08 | Classificar os feedbacks dos clientes por categoria de serviço (vaga avulsa, vaga coberta, lava-jato, estética, manobrista, app/reserva, pernoite, contrato mensal) |
| RF09 | Emitir alertas automáticos quando o índice de satisfação de algum serviço cair abaixo de um limiar configurado |
| RF10 | Permitir filtragem das análises por período, tipo de contrato (avulso, semanal, mensal) e categoria de veículo (carro pequeno, carro grande, moto) |

### Requisitos Não Funcionais

| ID | Descrição |
|------|-----------|
| RNF01 | O sistema deve fornecer um Manual do Usuário completo cobrindo o painel gerencial e a configuração dos alertas |
| RNF02 | O sistema deve acompanhar um guia de instalação e configuração do ambiente para implantação |
| RNF03 | O tempo de resposta para o registro de entrada e cálculo de saída de veículos na portaria não deve exceder 2 segundos, a fim de evitar filas no fluxo do estacionamento |
| RNF04 | O projeto técnico deve incluir a modelagem do banco de dados relacional (DER via MySQL Workbench) e a especificação do pipeline de processamento de linguagem natural (PLN) para análise de avaliações |
| RNF05 | O sistema deve processar um lote de até 1000 avaliações em menos de 1 minuto em ambiente padrão de execução |
| RNF06 | O painel administrativo e de indicadores (Dashboard) deve ser responsivo e compatível com os principais navegadores web do mercado (Chrome, Firefox e Edge) |
| RNF07 | Os dados sensíveis de transações financeiras e acessos de usuários devem ser armazenados de forma segura, atendendo às boas práticas de proteção de dados |

---

## Informações relevantes ao projeto

*O que a equipe julgar*

---

## Controle de Versão

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | 01/09/2026 | Apresentação da proposta |
