# EstacionaFácil — Design da Fase 1

**Data:** 26/10/2026
**Status:** design aprovado em conversa (seções 1 a 5); spec aguardando revisão escrita
**Escopo:** Fase 1 do sistema web de gestão do estacionamento (mensalistas, vencimentos, recebimentos, despesas e fluxo de caixa)

---

## 1. Contexto e objetivo

O EstacionaFácil atende um estacionamento real de pequeno porte no Centro de Taubaté: 49 vagas (35 de carro e 14 de moto), sempre lotado, clientela quase toda de **mensalistas**, gestão inteiramente em papel. O proprietário acumula as funções de gestor, operador e caixa, e nunca usou informática na gestão (fonte: entrevista de 01/09/2026, Apêndice B do Relatório Inicial V1).

O que ele pediu, nas palavras dele: **lista de mensalistas**, **fluxo de caixa** e **data de vencimento dos mensalistas**. A maior dificuldade declarada é fechar as contas de água, luz e aluguel.

**Objetivo da Fase 1:** o proprietário sabe quem são os mensalistas, quando cada contrato vence, quem está em atraso e qual foi o resultado do mês depois das despesas.

**Critério de sucesso:** o proprietário executa sozinho o teste de aceitação (cadastrar um mensalista real, registrar um recebimento, lançar uma despesa e ler o painel). O risco principal do projeto é de **adoção**, não técnico (Relatório, seção 11).

## 2. Escopo

### Dentro da Fase 1
- Acesso com dois perfis: Proprietário e Auxiliar (RF01).
- Mensalistas e contratos: cadastro, atualização, renovação, encerramento e histórico (RF04).
- Recebimentos em dinheiro, Pix, débito e crédito, com comprovante simples (RF05).
- Vencimentos: vencidos, a vencer e em dia, com alerta (RF13).
- Despesas fixas (recorrência mensal) e variáveis (RF11).
- Fluxo de caixa e resultado do período, com filtros por período, tipo de contrato e categoria de veículo (RF12, RF10).
- Manual do usuário e guia de instalação (RNF01, RNF02), segurança dos dados (RNF07) e painel responsivo (RNF06).

### Fora da Fase 1
- Entrada e saída de veículo avulso e cálculo de estadia (RF02, RF03).
- Gestão de vaga por turno (RF14).
- Serviços adicionais, canal de avaliações, classificação de feedback e alertas de satisfação (RF06 a RF09), retirados do escopo pelo relatório.

A API e as rotas deixam espaço para a Fase 2, mas nada dela é construído agora.

## 3. Decisões de tecnologia

Esta spec **substitui** a pilha do README e do Relatório (PHP, MySQL, HTML/CSS sem framework, XAMPP local). Motivos e consequências estão na seção 11.

| Camada | Escolha |
|---|---|
| Interface | React, TypeScript, Tailwind, Vite, React Router, TanStack Query, React Hook Form, Recharts |
| API | Node.js, Express, TypeScript, Prisma |
| Validação | Zod, em pacote compartilhado entre API e interface |
| Banco | PostgreSQL gerenciado pelo Supabase |
| Hospedagem | Netlify (front estático e API como função), custo zero no início |
| Testes | Vitest, Testing Library, Supertest (contra Postgres real), Playwright |
| Integração contínua | GitHub Actions |

**Estrutura do repositório** (monorepo com npm workspaces):

```
apps/web/        interface
apps/api/        API
packages/shared/ schemas Zod, tipos e constantes
docs/
```

## 4. Perfis, abas e telas

O layout segue o modelo de painel administrativo fornecido pela equipe: barra superior escura com as abas em linha e ícone, cabeçalho de página com título e botão de ação, cartões KPI coloridos com selo de variação, cartões brancos com gráficos e tabelas, e rodapé. A busca fica na barra, e o sino mostra a contagem de contratos vencidos. Elementos do modelo sem equivalente no escopo (chat, avaliações, pedidos, e-mail, idioma) não entram.

| Aba | Conteúdo | Quem vê |
|---|---|---|
| **Painel** | 4 KPIs (mensalistas ativos, vencidos, a vencer, resultado do mês), gráfico de receitas e despesas, situação dos contratos, últimos recebimentos | Proprietário (tela inicial) |
| **Mensalistas** | Lista com busca e filtros; cadastro, edição, renovação, encerramento e histórico | Proprietário edita; Auxiliar só consulta |
| **Vencimentos** | Vencidos, a vencer e em dia, com "Registrar pagamento" por linha | Proprietário |
| **Recebimentos** | Formulário de recebimento, comprovante e lançamentos do dia | Todos (tela inicial do Auxiliar) |
| **Despesas** | Lançamento de despesa fixa ou variável e lista do mês | Todos |
| **Fluxo de caixa** | Receitas, despesas, resultado, gráfico mensal e divisão por forma de pagamento, com filtros | Proprietário |

O Auxiliar vê somente Mensalistas (consulta), Recebimentos e Despesas. Telas adicionais: `Cadastro de mensalista`, `Detalhe do mensalista` e `Entrar`.

**Diretrizes de interface** (Relatório, seção 7): poucos campos por tela, ação principal evidente, vocabulário do proprietário ("mensalista", "vencimento", "fluxo de caixa") e tela inicial correspondente ao painel que ele pediu.

**Referência visual:** protótipo no Figma (`https://www.figma.com/design/R6rEklQfDRDdhmHqIjROik`). A versão 1 (menu lateral, 4 telas e cliques) está concluída. A versão 2 (abas) ficou apenas com paleta e ícones, por limite de chamadas do plano gratuito do Figma; ela passa a ser feita diretamente em código.

## 5. Modelo de dados (PostgreSQL)

### Tabelas da Fase 1

| Tabela | Campos principais |
|---|---|
| `usuarios` | id, nome, login (único), senha_hash, perfil (`proprietario` ou `auxiliar`), ativo |
| `sessoes` | id, usuario_id, expira_em |
| `tentativas_login` | login, ip, ocorrida_em (para o limite de tentativas) |
| `mensalistas` | id, nome, telefone, arquivado_em |
| `veiculos` | id, mensalista_id, placa (única), categoria (`carro` ou `moto`) |
| `vagas` | id, codigo (único), categoria; nasce com as 49 vagas (35 de carro, 14 de moto) |
| `contratos` | id, mensalista_id, veiculo_id, vaga_id (opcional), tipo (`mensal` ou `semanal`), valor, dia_vencimento, inicio, **vencimento** (próxima data a pagar), status (`ativo` ou `encerrado`), encerrado_em |
| `pagamentos` | id, contrato_id, valor, forma (`dinheiro`, `pix`, `debito`, `credito`), pago_em, mes_referencia, registrado_por, chave_idempotencia (única) |
| `despesas` | id, descricao, valor, tipo (`fixa` ou `variavel`), data, registrado_por, recorrencia_id (opcional) |
| `recorrencias_despesa` | id, descricao, valor, dia_do_mes, ativa |
| `historico_contrato` | id, contrato_id, evento (`criado`, `renovado`, `pagamento`, `encerrado`), em, usuario_id, detalhes |

O número do comprovante é o id do pagamento. Fase 2 acrescentará `estadias` e `turnos_vaga`.

### Garantias no banco
Valem mesmo que a API tenha um defeito.

- Dinheiro em `NUMERIC(12,2)`, nunca ponto flutuante.
- No máximo um contrato **ativo** por placa.
- No máximo um contrato **ativo** por vaga (na Fase 2, por vaga e turno).
- Encerrar contrato e arquivar mensalista são lógicos, nunca apagam dados.
- Cada despesa gerada por recorrência é única por recorrência e mês (a geração é segura de repetir).

### Regras de negócio
Padrões adotados a validar com o proprietário na segunda rodada de perguntas.

1. **Pagar versus renovar.** Pagar a mensalidade avança o `vencimento` em 1 mês (7 dias, se o contrato for semanal). **Renovar** é ação só do proprietário para estender o vencimento sem pagamento (por exemplo, um acordo), com motivo registrado no histórico.
2. **Situação** (calculada, nunca gravada): *vencido* se o vencimento já passou; *a vencer* se faltam até 7 dias; *em dia* nos demais casos. Datas no fuso `America/Sao_Paulo`.
3. **Resultado** do período = pagamentos recebidos no período menos despesas lançadas no período, pela data (regime de caixa).
4. **Filtros por tipo de contrato e categoria de veículo** afetam só as receitas, pois despesas não têm contrato nem veículo. Com um desses filtros ativo, o painel mostra as receitas filtradas e **oculta o resultado**.
5. **Despesa fixa** gera sozinha um lançamento por mês, no dia configurado.
6. **Valores na API** trafegam como texto decimal (`"255.00"`); a interface formata em reais. Datas em `AAAA-MM-DD`.

### Segurança dos dados no Supabase
O Supabase expõe as tabelas por uma API pública própria. Como o acesso será somente pelo Express, o **RLS fica ligado em todas as tabelas, sem nenhuma política**, o que bloqueia acesso direto. A string de conexão existe somente no servidor.

## 6. API REST

Rotas sob `/api`, respostas em JSON.

| Rota | O que faz | Quem | Respostas |
|---|---|---|---|
| `POST /auth/login` | Entrar | todos | 200, 401, 429 |
| `POST /auth/logout` | Sair | logado | 204 |
| `GET /auth/me` | Usuário e perfil | logado | 200, 401 |
| `GET /painel` | KPIs, gráfico, situação dos contratos, últimos recebimentos | Prop. | 200 |
| `GET /mensalistas` | Lista, com `busca`, `situacao`, `categoria`, `tipo` e paginação | todos | 200 |
| `POST /mensalistas` | Cadastra cliente, veículo e contrato numa transação | Prop. | 201, 409, 422 |
| `GET /mensalistas/:id` | Dados, contrato atual e histórico | todos | 200, 404 |
| `PATCH /mensalistas/:id` | Atualiza telefone, placa, vaga e valor | Prop. | 200, 404, 409, 422 |
| `POST /contratos/:id/renovacao` | Estende o vencimento sem pagamento, com motivo | Prop. | 200, 404, 409, 422 |
| `POST /contratos/:id/encerramento` | Encerra e libera a vaga | Prop. | 200, 404, 409 |
| `GET /vencimentos` | Vencidos, a vencer e em dia, com totais | Prop. | 200 |
| `POST /pagamentos` | Registra o recebimento e avança o vencimento | todos | 201, 404, 409, 422 |
| `GET /pagamentos` | Lançamentos por dia ou período | todos | 200 |
| `GET /pagamentos/:id` | Dados do comprovante | todos | 200, 404 |
| `POST /despesas` | Lança despesa (`tipo`; `diaDoMes` se fixa) | todos | 201, 422 |
| `GET /despesas` | Lista do período | todos | 200 |
| `GET /recorrencias` | Despesas fixas, ativas e pausadas (com o campo `ativa`) | todos | 200 |
| `PATCH /recorrencias/:id` | Pausa ou retoma uma despesa fixa | Prop. | 200, 404 |
| `GET /caixa` | Receitas, despesas, resultado, série por mês e divisão por forma | Prop. | 200, 422 |
| `GET /saude` | Verificação de funcionamento | público | 200 |

**Convenções:**
- Erros no formato `{ "erro": { "codigo", "mensagem", "campos" } }`, com mensagem em português simples. Os 409 têm códigos próprios: `PLACA_JA_CADASTRADA`, `VAGA_OCUPADA`, `CONTRATO_ENCERRADO`.
- `POST /pagamentos` exige o cabeçalho `Idempotency-Key`, para que clique duplo ou rede lenta não registrem o recebimento duas vezes.
- Os schemas Zod do pacote compartilhado validam na API (422) e na interface (erro no campo).
- A permissão é verificada na API em toda rota; esconder a aba é apenas conforto visual.
- Sessão por cookie `httpOnly`, `Secure` e `SameSite=Lax`. Rotas que alteram dados exigem também um cabeçalho próprio da aplicação, como proteção contra CSRF.

## 7. Arquitetura do front-end

- `components/ui/`: blocos visuais (Botão, Campo, Etiqueta de situação, Cartão KPI, Aba, Tabela, estado vazio, carregando e mensagem de erro).
- `features/<aba>/`: páginas, componentes e chamadas da API de cada aba (`painel`, `mensalistas`, `vencimentos`, `recebimentos`, `despesas`, `fluxo-de-caixa`, `auth`).
- `app/`: roteador, casca (barra superior com abas, cabeçalho, rodapé) e provedores.
- `lib/`: cliente da API, formatadores (reais e datas em pt-BR) e a regra de situação do contrato.
- **Rotas:** `/entrar`, `/painel`, `/mensalistas`, `/mensalistas/novo`, `/mensalistas/:id`, `/vencimentos`, `/recebimentos`, `/despesas`, `/fluxo-de-caixa`. Um guarda confere o perfil. O Proprietário abre no Painel e o Auxiliar em Recebimentos.
- **Dados:** TanStack Query com cache. Após um pagamento, painel, vencimentos e lista de mensalistas são atualizados.
- **Estados da tela:** carregando (silhueta, sem tela em branco); vazio com orientação; erro de rede com "Tentar de novo"; erro de campo (422 e 409) sob o campo certo; sessão expirada volta ao login com aviso; encerrar contrato pede confirmação em linguagem clara.
- **Protótipo funcional:** o front nasce com **Mock Service Worker**, respondendo `/api` com dados de exemplo que obedecem aos mesmos schemas Zod. Quando a API existir, o mock é desligado por `VITE_USAR_MOCKS`, sem alterar as telas.
- **Responsividade (RNF06):** abas viram faixa rolável, tabelas rolam na horizontal e cartões empilham. Navegadores-alvo: Chrome, Firefox e Edge.
- **Acessibilidade:** contraste de texto acima de 4,5:1, alvos de clique de pelo menos 48px, situação sempre com texto (nunca só cor), foco visível, tabelas semânticas e `lang="pt-BR"`.

### Tokens visuais

| Token | Valor | Uso |
|---|---|---|
| primária / escura / clara | `#4A55C7` / `#3A44A8` / `#E8EAFB` | ações, aba ativa, destaques |
| destaque | `#0A7F75` | gráficos, indicadores positivos |
| amarelo | `#E0A100` | série de gráfico |
| texto / texto suave | `#1F2933` / `#52606D` | tipografia |
| fundo / superfície / borda | `#F5F7FA` / `#FFFFFF` / `#CBD2D9` | estrutura |
| em dia (texto / fundo) | `#1B7F3B` / `#E3F5E8` | situação |
| a vencer (texto / fundo) | `#8A5300` / `#FFF1D6` | situação |
| em atraso (texto / fundo) | `#B42318` / `#FDE7E4` | situação |
| barra / texto da barra / ícone / aba ativa | `#2A3042` / `#AEB6D4` / `#D5DAF2` / `#3B4263` | barra superior |

Tipografia: Inter. Base de 16px; títulos de tela 28px, de seção 20px, números de KPI 36px.

## 8. Segurança (RNF07)

- Senhas com `argon2id`.
- Login limitado a 5 tentativas a cada 15 minutos por usuário e IP, contadas na tabela `tentativas_login` (um contador em memória não funcionaria entre instâncias serverless). `helmet` ativo e tráfego somente por HTTPS.
- Sessão guardada no Postgres, para que "Sair" a invalide de fato; expira em 12 horas de inatividade.
- O primeiro usuário é criado por um script de instalação que pede a senha na hora. **Não existe senha padrão.**
- Dados pessoais (LGPD): somente nome, telefone e placa; sem CPF. Logs ocultam telefone e senha, e erros nunca expõem detalhes internos.
- Segredos somente nas variáveis de ambiente da Netlify; o repositório contém apenas `.env.example`.

## 9. Publicação, ambientes e backup

### Como roda na Netlify
A Netlify serve o front a partir da CDN, e um redirecionamento envia `/api/*` para **uma única função** que contém o Express. O domínio é um só, portanto o cookie de sessão funciona no mesmo domínio e **não há CORS**. A criação do app (`criarApp()`) é separada da inicialização: a função e o servidor local usam o mesmo app.

| Ponto | Solução |
|---|---|
| Conexões com o banco | Função usa o *pooler* do Supabase em modo transação, com uma conexão por instância |
| Migrações | Executadas pelo GitHub Actions contra o banco, não ao subir a função; usam a URL do pooler em modo sessão (a conexão direta do Supabase é só IPv6) |
| Despesa fixa mensal | Função agendada diária às `03:00 UTC` (meia-noite em Brasília), idempotente. Roda somente em deploy publicado. Limite de 30 s |
| Primeira requisição após inatividade | Mais lenta (partida a frio); aceitável para uso de poucas vezes ao dia |
| Logs | A Netlify retém o histórico de funções por 24 h no plano gratuito |

### Ambientes
- **Local:** Postgres em Docker, dados fictícios (os mesmos nomes do protótipo).
- **Homologação:** deploy de prévia da Netlify, que não consome créditos, apontando para um projeto Supabase gratuito com dados fictícios. Serve à validação com o proprietário.
- **Produção:** segundo projeto Supabase, criado na entrega, com dados reais.

### Política de publicação em produção
Cada **deploy em produção** custa 15 créditos de um limite rígido de 300 por mês no plano gratuito (no máximo 20 por mês). Se os créditos acabam, **todos os sites da conta são pausados** até o mês seguinte. Deploys de prévia (por Pull Request) não consomem créditos.

Por isso:

1. A publicação automática em produção fica **desligada**; a publicação é manual (a opção exata é confirmada na configuração da Netlify).
2. O merge na `main` **não** publica. Publica-se em produção somente quando todos os critérios abaixo forem cumpridos:
   - o CI está verde na `main`;
   - a validação com o proprietário em homologação foi concluída e os ajustes pedidos foram feitos;
   - o roteiro de teste de aceitação passa de ponta a ponta;
   - o backup foi executado e a **restauração foi testada** com sucesso;
   - o guia de instalação foi seguido do zero, sem passos faltando.
3. Meta: poucas publicações em produção durante o semestre, bem abaixo do limite de 20. A Netlify avisa por e-mail aos 50%, 75% e 100% dos créditos.

### Backup
- Enquanto o Supabase estiver no plano gratuito, que **não tem backup automático**, um agendamento do GitHub Actions faz um `pg_dump` toda noite. O arquivo é **criptografado antes de sair** do Actions (artefatos de repositório público são legíveis por qualquer pessoa) e enviado a um armazenamento privado.
- Na produção recomenda-se o Supabase Pro (backup diário de 7 dias, sem pausa); o dump semanal permanece como segunda cópia.
- O guia de instalação inclui um teste de restauração.

### Custo

| Momento | Custo mensal |
|---|---|
| Desenvolvimento e validação | **US$ 0** (Netlify gratuita, Supabase gratuito, GitHub) |
| Produção mantendo US$ 0 | US$ 0, aceitando os riscos: sem backup oficial, site pausável se os créditos acabarem e projeto Supabase pausado após 1 semana de inatividade |
| Produção recomendada | Supabase Pro (US$ 25) e, opcionalmente, Netlify Personal (US$ 9, com 1.000 créditos) |

A escolha da produção cabe ao proprietário e ao grupo, ao fim do semestre.

## 10. Testes e fluxo de trabalho

- **API:** Vitest e Supertest contra **Postgres real** (não mocks), para exercitar as garantias do banco. Cobrem a situação do contrato, o avanço do vencimento no pagamento, a idempotência, a matriz de permissões, o resultado oculto com filtro e a despesa fixa mensal sem duplicar.
- **Interface:** Vitest e Testing Library para componentes e formulários.
- **Aceitação:** Playwright executa o fluxo do proprietário (cadastrar mensalista, receber, lançar despesa e ler o painel), primeiro contra os mocks e depois contra a API real. Gera também as capturas de tela do manual.
- **CI:** cada Pull Request roda lint, tipos, testes e build. A `main` exige CI verde e uma revisão, conforme o `CONTRIBUTING.md`. Commits seguem Conventional Commits.
- **Documentação entregável:** manual do usuário com capturas reais (RNF01) e guia de instalação reescrito para Netlify e Supabase: contas, variáveis, publicação, backup, restauração e primeiro usuário (RNF02).

## 11. Divergências com a documentação atual

Estes documentos precisam ser atualizados quando a implementação começar:

- `README.md`: tecnologias (PHP, MySQL, XAMPP), estrutura do repositório (`src/`) e cronograma ("PHP, HTML/CSS, SQL").
- `docs/api.md`: estilo PHP, rotas `/contratos` com `PATCH` e `DELETE`, `/despesas/fixa` e `/despesas/variavel`, `/login`. Substituído pela seção 6.
- `docs/diagramas/`: participantes "Controlador (PHP)" e "Banco (MySQL)".
- RNF04: o DER previsto no MySQL Workbench passa a ser o esquema Prisma, com um diagrama exportado.
- `docs/documento-de-visao.md` ainda está na versão 1.0 (requisitos originais, perfil Cliente, PLN) e não tem RF11 a RF14. A versão 2.0 está pendente.
- O relatório e o README descrevem execução **local e offline** como fator decisivo; a decisão atual é **nuvem**.

## 12. Riscos e pontos em aberto

| Item | Situação |
|---|---|
| Segunda rodada de perguntas ao proprietário | Não respondida. Bloqueia valores reais de mensalidade, dia de vencimento, vaga numerada e tipos de contrato. A pergunta 17 (o computador do estacionamento tem internet?) é crítica para a decisão de nuvem. |
| Regras de negócio da seção 5 | Padrões a validar com o proprietário. |
| Visibilidade do repositório | A Netlify gratuita tem um único membro; se o repositório for privado, confirmar se os colaboradores conseguem disparar deploys. |
| Adaptação do Express à função da Netlify | Confirmar o adaptador e os limites de tempo na configuração. |
| Conexão Supabase a partir da função | Confirmar o uso do pooler (IPv4) na configuração. |
| Prazo | 09/11 a 02/12 para implementar; 11/12 a capacitação. |

**Ordem de corte se o cronograma apertar:** primeiro os filtros do Fluxo de caixa, depois os gráficos, e só então qualquer item de mensalista, pagamento ou vencimento, que é o núcleo pedido pelo proprietário.

## 13. Critérios de aceite da Fase 1

1. O Proprietário entra, vê o Painel e abre as 6 abas; o Auxiliar entra e vê apenas as 3 permitidas.
2. Cadastrar mensalista com placa já ativa mostra o erro no campo Placa; vaga ocupada mostra o erro no campo Vaga.
3. Registrar um recebimento avança o vencimento e emite o comprovante; repetir o mesmo envio não duplica o pagamento.
4. Contratos aparecem em *vencido*, *a vencer* ou *em dia* conforme as regras da seção 5.
5. Lançar uma despesa fixa gera o lançamento do mês seguinte sem duplicar.
6. O Fluxo de caixa mostra receitas, despesas e resultado do período, e oculta o resultado quando há filtro de contrato ou categoria.
7. Nenhum dado é acessível sem login nem fora do perfil.
8. O backup é executado e restaurado com sucesso em ambiente de teste.
