# Sistema de Gestão Web - 4º Semestre SI

<p align="center">
    <img src="./docs/img/estacionaFacil-logotipo.svg" alt="Logo do Projeto" width="300">
</p>

<p align="center">
    | <a href="#desafio">Desafio</a> |
    <a href="#backlog">Backlog do Produto</a> |
    <a href="#cronograma">Cronograma do Projeto</a> |
    <a href="#sprint">Cronograma de Sprints</a> |
    <a href="#tecnologia">Tecnologias</a> |
    <a href="#modelagem">Modelagem</a> |
    <a href="#manual">Manual de Instalação</a> |
    <a href="#equipe">Equipe</a> |
    <a href="#adicional">Informações Adicionais</a> |
</p>

# EstacionaFácil

Sistema web de gestão para um estacionamento de pequeno porte, com controle de mensalistas, vencimentos, pagamentos, despesas e resultado financeiro.

> **Status do projeto:** 🚧 Fase 1 implementada (API, interface, testes de aceitação, backup e documentação); falta a validação com o proprietário e a publicação em produção. Veja o [guia de instalação](./docs/guia-de-instalacao.md).

---

## 📋 Descrição do desafio <a id="desafio"></a>

### Narrativa

O EstacionaFácil nasceu como trabalho da disciplina de Engenharia de Software, a partir de um desafio com cliente fictício: um estacionamento tradicional do centro da cidade, pressionado por concorrentes que oferecem vagas cobertas, contratos diversos, serviços agregados e autoatendimento por aplicativo.

No Projeto Integrador IV (Curricularização da Extensão), o projeto passou a atender um **estacionamento real de pequeno porte, no Centro de Taubaté**. A entrevista com o proprietário mostrou que a realidade é outra: o pátio tem 49 vagas (35 para carros e 14 para motos), fica sempre lotado, a clientela é quase toda de **mensalistas**, e toda a gestão é feita em papel. As dificuldades dele são saber quem são os mensalistas, quando cada contrato vence e qual é o resultado do mês depois de pagar água, luz e aluguel.

Por isso o escopo foi revisado: o sistema foca em **contratos, cobrança, despesas e resultado**, e deixou de lado o que o estabelecimento não usa, como serviços agregados e análise de avaliações.

### User stories

**Auxiliar** (lançamento diário)

| ID | História |
|---|---|
| US01 | Como Auxiliar, quero entrar no sistema com meu login e senha, para acessar apenas o que meu perfil permite. |
| US02 | Como Auxiliar, quero registrar o pagamento de uma mensalidade escolhendo a forma de pagamento, para ter o recebimento anotado e entregar um comprovante ao cliente. |
| US03 | Como Auxiliar, quero lançar uma despesa fixa ou variável, para que as contas do estacionamento entrem no resultado do mês. |
| US04 | Como Auxiliar, quero consultar os lançamentos do dia e a lista de mensalistas, para conferir o que foi registrado no turno anterior e saber se uma placa é de um mensalista em dia. |
| US05 | *(Fase 2)* Como Auxiliar, quero registrar a entrada de um veículo avulso e atribuir uma vaga, para saber onde ele está. |
| US06 | *(Fase 2)* Como Auxiliar, quero registrar a saída de um veículo avulso com o valor da estadia calculado, para cobrar o valor correto. |

**Proprietário** (acesso pleno, herda tudo o que o Auxiliar faz)

| ID | História |
|---|---|
| US07 | Como Proprietário, quero cadastrar um mensalista com veículo, vaga e valor contratado, para ter a carteira de clientes registrada e não apenas em anotações. |
| US08 | Como Proprietário, quero atualizar os dados de um mensalista, para manter placa, telefone e vaga sempre corretos. |
| US09 | Como Proprietário, quero renovar o contrato de um mensalista, para manter a vigência atualizada. |
| US10 | Como Proprietário, quero encerrar o contrato de um mensalista que saiu, para liberar a vaga sem perder o histórico. |
| US11 | Como Proprietário, quero consultar o histórico de um contrato, para saber renovações e pagamentos anteriores. |
| US12 | Como Proprietário, quero ver os contratos vencidos e a vencer, para cobrar antes que a inadimplência cresça. |
| US13 | Como Proprietário, quero consultar o fluxo de caixa e o resultado do período, filtrando por período, tipo de contrato e categoria de veículo, para saber se o mês foi lucrativo depois de pagar as contas fixas. |
| US14 | *(Fase 2)* Como Proprietário, quero gerenciar a vaga por turno, para vender a mesma vaga a mensalistas diurnos e noturnos sem conflito de horário. |

> As histórias foram redigidas a partir da entrevista com o proprietário e dos casos de uso. Ainda precisam ser validadas com ele.

---

## ⚙️ Escopo do produto (backlog do produto) <a id="backlog"></a>

| ID | Item | Requisito | Fase | Histórias | Status |
|---|---|---|---|---|---|
| PB01 | Acesso por perfil (Auxiliar e Proprietário) | RF01 | 1 | US01 | Modelado |
| PB02 | Gestão de mensalistas e contratos: cadastro, atualização, renovação, encerramento e histórico | RF04 | 1 | US07 a US11 | Modelado |
| PB03 | Registro de pagamentos (Dinheiro, Pix, Débito e Crédito) com comprovante | RF05 | 1 | US02 | Modelado |
| PB04 | Controle de vencimentos: contratos vencidos e a vencer | RF13 | 1 | US12 | Modelado |
| PB05 | Lançamento de despesas fixas (com recorrência mensal) e variáveis | RF11 | 1 | US03 | Modelado |
| PB06 | Fluxo de caixa e resultado do período | RF12 | 1 | US13 | Modelado |
| PB07 | Filtros por período, tipo de contrato e categoria de veículo | RF10 | 1 | US13 | Modelado |
| PB08 | Consultas operacionais: lançamentos do dia e lista de mensalistas | RF04, RF05 | 1 | US04 | Modelado |
| PB09 | Registro de entrada de veículo avulso | RF02 | 2 | US05 | Modelado |
| PB10 | Registro de saída com cálculo da estadia | RF03 | 2 | US06 | Modelado |
| PB11 | Gestão de vaga por turno | RF14 | 2 | US14 | Modelado |

**Status:** *Modelado* significa que o caso de uso e o diagrama de sequência estão prontos. Nenhum item foi desenvolvido ainda.

**Fora do escopo:** serviços adicionais (lava-jato, reparos, estética), canal de avaliações, classificação de feedbacks, alertas de satisfação e aplicativo de reserva antecipada, porque o estabelecimento não oferece esses serviços nem tem o volume que os justifique.

### Requisitos não funcionais

- Manual do usuário em linguagem acessível, ilustrado com telas reais (requisito crítico, pelo perfil do usuário)
- Guia de instalação e configuração do ambiente
- Modelagem do banco de dados relacional (esquema Prisma e diagrama exportado)
- Painel responsivo, compatível com Chrome, Firefox e Edge
- Armazenamento seguro de dados sensíveis (dados pessoais e financeiros dos mensalistas e acessos), seguindo boas práticas de proteção de dados
- Tempo de resposta inferior a 2 segundos no registro de entrada e saída (Fase 2)

---

## 📅 Cronograma do projeto <a id="cronograma"></a>

O cronograma abaixo cobre a Fase 1 até o fim do semestre, em dezembro de 2026. A Fase 2 não tem prazo definido (a definir).

```mermaid
gantt
    title Cronograma do projeto EstacionaFácil
    dateFormat YYYY-MM-DD
    axisFormat %d/%m

    section Concluído
    Entrevista e Documento de Visão 1.0         :done, c1, 2026-09-01, 1d
    Diagramas de casos de uso e de sequência    :done, c2, 2026-09-02, 2026-10-13

    section Levantamento
    Segunda rodada de perguntas e observação    :l1, 2026-10-14, 2026-10-23
    Documento de Visão 2.0                      :l2, 2026-10-14, 2026-10-30

    section Projeto
    Modelo do banco de dados (DER)              :p1, 2026-10-26, 2026-11-06
    Protótipos das interfaces                   :p2, 2026-10-26, 2026-11-06
    Validação dos protótipos com o proprietário :p3, 2026-11-09, 2026-11-13

    section Desenvolvimento
    Implementação da Fase 1 (React, Express, PostgreSQL) :d1, 2026-11-09, 2026-12-02
    Teste de aceitação e ajustes                :d2, 2026-12-01, 2026-12-04

    section Entrega
    Manual do usuário e guia de instalação      :e1, 2026-12-03, 2026-12-09
    Instalação, capacitação e apresentação final :e2, 2026-12-07, 2026-12-11
```

> As datas futuras são uma proposta de planejamento e podem ser ajustadas conforme as visitas ao estabelecimento.

---

## 📦 Partes entregáveis (backlog da sprint) <a id="sprint"></a>

| Entregável | Descrição | Responsável | Prazo | Status |
|---|---|---|---|---|
| Documento de Visão 1.0 | Descrição do desafio, requisitos e pilha tecnológica | Felipe | 01/09/2026 | Concluído |
| Diagramas de casos de uso e de sequência | 1 diagrama de casos de uso e 12 de sequência, com códigos HTTP | Júlia | 13/10/2026 | Concluído |
| Segunda rodada de perguntas | Coleta das lacunas de modelagem (Apêndice C do relatório extensionista) | Daniel | 23/10/2026 | A desenvolver |
| Documento de Visão 2.0 | Reclassificação dos requisitos, RF11 a RF14 e rastreabilidade | Felipe | 30/10/2026 | A desenvolver |
| Modelo do banco de dados | Esquema Prisma (`apps/api/prisma/schema.prisma`) | Maria Luiza | 06/11/2026 | A desenvolver |
| Protótipos das interfaces | Painel do proprietário, cadastro de mensalistas e lançamento de caixa | Mateus | 06/11/2026 | A desenvolver |
| Validação dos protótipos | Apresentação das telas ao proprietário, com ajustes | Daniel e Mateus | 13/11/2026 | A desenvolver |
| Implementação da Fase 1 | Front em React, API em Express e banco PostgreSQL | Paulo e Mateus | 02/12/2026 | A desenvolver |
| Teste de aceitação | Execução pelo proprietário de um cadastro, um pagamento, uma despesa e leitura do painel | Todos | 04/12/2026 | A desenvolver |
| Manual do usuário | Será criado com a finalização do desenvolvimento | Todos | 09/12/2026 | A desenvolver |
| Guia de instalação e configuração | Implantação no computador do estabelecimento | Todos | 09/12/2026 | A desenvolver |
| Instalação, capacitação e apresentação final | Oficina presencial e apresentação dos resultados | Todos | 11/12/2026 | A desenvolver |

---

## 🛠️ Tecnologias utilizadas <a id="tecnologia"></a>

| Camada | Tecnologia | Propósito |
|---|---|---|
| Interface | React, TypeScript, Vite e Tailwind CSS (React Router, TanStack Query, React Hook Form, Recharts) | Telas responsivas, acessíveis (contraste, alvos de clique grandes, situação sempre em texto) e compatíveis com Chrome, Firefox e Edge |
| Validação | Zod, em um pacote compartilhado | As mesmas regras validam o formulário e a API, e as regras do domínio (vencimento, situação, dinheiro) ficam num lugar só |
| API | Node.js, Express e TypeScript | Uma API REST simples, com sessão por cookie, permissões por perfil e senhas com argon2id |
| Persistência | PostgreSQL (Supabase) e Prisma | Banco relacional com esquema versionado em migrações e RLS ligado; o esquema Prisma substitui o DER |
| Hospedagem | Netlify (front e funções) e GitHub Actions | Um domínio só, sem CORS; publicação em produção manual; migrações e backup noturno criptografado por GitHub Actions |
| Testes | Vitest, Testing Library, Supertest e Playwright | Testes de unidade e de API contra PostgreSQL de verdade, e um roteiro de aceitação com navegador |
| Versionamento | Git e GitHub | Controle de versão do código e da documentação |
| Modelagem | PlantUML | Diagramas UML escritos como código, versionados junto do projeto |

---

## 📐 Modelagem <a id="modelagem"></a>

A modelagem usa UML (casos de uso e diagramas de sequência), escrita em PlantUML.

![Diagrama de casos de uso do EstacionaFácil](./docs/diagramas/casos-de-uso/casos_de_uso_estacionafacil_completo.svg)

- [Todos os diagramas](./docs/diagramas/README.md)
- [Modelo de dados](./docs/modelo-de-dados.md): diagrama entidade-relacionamento do banco (substitui o DER) e as regras que o esquema Prisma não mostra.
- [Rotas da API](./docs/api.md): as rotas HTTP implementadas, com permissões e códigos de resposta.
- [Especificação de design da Fase 1](./docs/superpowers/specs/2026-10-26-estacionafacil-fase1-design.md) e [plano de implementação](./docs/superpowers/plans/2026-10-26-estacionafacil-fase1.md).

---

## 📚 Documentação adicional <a id="manual"></a>

### Manual do usuário

[`docs/manual-do-usuario.md`](./docs/manual-do-usuario.md): em linguagem acessível e ilustrado com telas reais do sistema (as imagens são geradas pelo teste de ponta a ponta, em `docs/manual/capturas/`).

### Guia de instalação e configuração

[`docs/guia-de-instalacao.md`](./docs/guia-de-instalacao.md): contas, banco, Netlify, migrações, backup e o roteiro de restauração ([`scripts/restaurar-backup.md`](./scripts/restaurar-backup.md)).

### Decisões para o proprietário

[`docs/decisoes-para-o-proprietario.md`](./docs/decisoes-para-o-proprietario.md): suposições e limitações conhecidas da Fase 1 que precisam da resposta do proprietário, com uma sugestão para cada uma.

### Identidade da equipe <a id="equipe"></a>

| Integrante | Contato | Responsabilidade |
|---|---|---|
| Daniel Oliveira Rodrigues | A definir | Relação com o parceiro externo: agendamento, condução das entrevistas, visitas ao estabelecimento e registro das evidências |
| Eduardo Alves Teixeira | [GitHub](https://github.com/ed-ateixeira) | Interface: protótipos e desenvolvimento das telas em HTML, CSS e JavaScript |
| Felipe Salles Barlaam | [GitHub](https://github.com/Fesbz) | Engenharia de requisitos e manutenção do Documento de Visão |
| Júlia Cesar dos Santos | [GitHub](https://github.com/JuliaCss) | Modelagem UML: casos de uso, classes e diagramas de sequência |
| Maria Luiza Ribeiro Batista | [GitHub](https://github.com/mlrBatista) | Modelagem e implementação do banco de dados relacional |
| Mateus Lotufo Silvestre | [GitHub](https://github.com/lotufo22) | Interface: protótipos e desenvolvimento das telas em HTML e CSS |
| Paulo Vinicius Ferreira | [GitHub](https://github.com/PauloViniciusFerreira) | Desenvolvimento em PHP e integração com o banco de dados |

Compartilhado por todos: documentação do projeto, testes, elaboração do manual do usuário e condução da oficina de capacitação junto ao parceiro.

---

## 🗂️ Estrutura do repositório <a id="adicional"></a>

```
.
├── apps/
│   ├── web/             # Interface (React + Vite)
│   └── api/             # API (Express + Prisma): rotas, serviços, migrações e testes
├── packages/
│   └── shared/          # Regras do domínio, schemas Zod e tipos usados pelo front e pela API
├── netlify/
│   ├── funcoes/         # Pontos de entrada das funções da Netlify (api e gerar-despesas)
│   └── nucleo/          # Lógica das funções (testada em apps/api/test/netlify.test.ts)
├── e2e/                 # Testes de ponta a ponta (Playwright): aceitação e capturas do manual
├── scripts/             # Backup, restauração, empacotamento das funções e dados de demonstração
├── docs/                # Visão, API, diagramas UML, manual do usuário, guia de instalação e spec
├── .github/workflows/   # CI, migração (manual) e backup noturno
├── netlify.toml         # Build, funções, redirecionamentos e política de publicação
├── README.md
└── CONTRIBUTING.md      # Guia de fluxo de trabalho em equipe (branches, PRs, commits)
```

---

## 🚀 Como começar

Precisa de **Node.js 22+**, **Git** e um **PostgreSQL** local (ou o `docker-compose.yml` da raiz).

```bash
git clone https://github.com/lotufo22/estaciona-facil.git
cd estaciona-facil
npm ci
cp .env.example .env     # preencha DATABASE_URL, DATABASE_URL_MIGRACAO e DATABASE_URL_TESTE

npm run migrar -w @estacionafacil/api                # cria as tabelas
npm run semear -w @estacionafacil/api                # cria as 49 vagas
npm run criar-proprietario -w @estacionafacil/api    # cria o primeiro usuário (a senha é pedida na hora)

npm run dev -w @estacionafacil/api    # API em http://localhost:3001/api
npm run dev -w @estacionafacil/web    # interface em http://localhost:5173
```

Para ver só a interface, com dados de exemplo e sem banco: `npm run dev:mocks -w @estacionafacil/web`
(login `dono` ou `auxiliar`, senha `teste123`).

| Comando | O que faz |
|---|---|
| `npm test` | testes de unidade e de API (a API roda contra o PostgreSQL de `DATABASE_URL_TESTE`, que é **apagado**) |
| `npm run e2e` | roteiro de aceitação com navegador (Playwright) e capturas do manual |
| `npm run lint` e `npm run typecheck` | análise estática |
| `npm run build -w @estacionafacil/web` | build do front |
| `npm run funcoes` | gera as funções da Netlify em `netlify/functions` |

Publicação, backup e migrações em homologação e produção: [guia de instalação](./docs/guia-de-instalacao.md).

---

## 🤝 Como contribuir

Antes de começar a trabalhar, leia o [`CONTRIBUTING.md`](./CONTRIBUTING.md) — ele define o fluxo de branches, padrão de commits e como abrir Pull Requests.

Resumo rápido:
1. Crie uma branch a partir da `main` (`feature/nome-da-tarefa`)
2. Faça commits seguindo o padrão descrito no guia
3. Abra um Pull Request e peça revisão de outro integrante
4. Após aprovação, faça o merge e remova a branch

---

## 📄 Licença

_A definir._
