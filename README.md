# EstacionaFácil

Sistema de gestão para modernização de um estacionamento tradicional, com controle de vagas, pagamentos digitais, contratos e indicadores de desempenho.

> **Status do projeto:** 🚧 Fase inicial — especificação e modelagem

---

## 📋 Sobre o projeto

O EstacionaFácil é um estacionamento com mais de 20 anos de história que precisa digitalizar suas operações para acompanhar a concorrência do setor, que hoje oferece vagas cobertas, contratos mensais, planos por porte de veículo, serviços agregados (lava-jato, estética, pequenos reparos) e múltiplos meios de pagamento.

Este projeto propõe uma solução computacional para automatizar os fluxos operacionais do estacionamento e fornecer à diretoria indicadores claros de desempenho e satisfação do cliente, apoiando decisões gerenciais mais rápidas e embasadas.

---

## ⚙️ Funcionalidades previstas

- Login com diferentes perfis de usuário (Operador, Administrador/Diretor e Cliente), com níveis de permissão
- Registro de entrada de veículos (placa, tipo de veículo, data/hora, vaga atribuída)
- Registro de saída com cálculo automático do valor da estadia
- Cadastro, renovação e controle de contratos mensais e semanais
- Pagamentos em Dinheiro, Cartão de Crédito/Débito e Pix, com emissão de comprovante
- Registro de venda e status de serviços adicionais (lava-jato, reparos, estética)
- Canal para avaliações e comentários dos clientes (app ou totem)
- Classificação dos feedbacks por categoria de serviço
- Alertas automáticos quando o índice de satisfação de um serviço cai abaixo de um limiar
- Filtros de análise por período, tipo de contrato e categoria de veículo

---

## 🧩 Requisitos não funcionais

- Manual do usuário cobrindo painel gerencial e configuração de alertas
- Guia de instalação e configuração do ambiente
- Tempo de resposta na portaria (entrada/saída) inferior a 2 segundos
- Modelagem do banco de dados relacional (DER) e pipeline de PLN para análise de avaliações
- Processamento de até 1000 avaliações em menos de 1 minuto
- Painel administrativo responsivo, compatível com Chrome, Firefox e Edge
- Armazenamento seguro de dados sensíveis (transações e acessos), seguindo boas práticas de proteção de dados

---

## 🗂️ Estrutura do repositório

```
.
├── docs/              # Documento de visão, requisitos, diagramas UML, protótipos
├── src/               # Código-fonte da aplicação
├── README.md
└── CONTRIBUTING.md    # Guia de fluxo de trabalho em equipe (branches, PRs, commits)
```

> A estrutura acima é um ponto de partida e será ajustada conforme o projeto avança.

---

## 🚀 Como começar

```bash
# Clonar o repositório
git clone https://github.com/lotufo22/estaciona-facil.git
cd <repositorio>
```

Instruções de instalação e configuração do ambiente serão adicionadas aqui conforme a stack do projeto for definida.

---

## 🤝 Como contribuir

Antes de começar a trabalhar, leia o [`CONTRIBUTING.md`](./CONTRIBUTING.md) — ele define o fluxo de branches, padrão de commits e como abrir Pull Requests.

Resumo rápido:
1. Crie uma branch a partir da `main` (`feature/nome-da-tarefa`)
2. Faça commits seguindo o padrão descrito no guia
3. Abra um Pull Request e peça revisão de outro integrante
4. Após aprovação, faça o merge e remova a branch

---

## 👥 Equipe

- Daniel Oliveira Rodrigues
- [Felipe Salles Barlaam](https://github.com/Fesbz)
- Júlia Cesar dos Santos
- [Maria Luiza Ribeiro Batista](https://github.com/mlrBatista)
- [Mateus Lotufo Silvestre](https://github.com/lotufo22)
- Paulo Vinicius Ferreira

---

## 📄 Licença

_A definir._
