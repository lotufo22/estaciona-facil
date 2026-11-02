# Handoff — EstacionaFácil

Atualizado em 02/11/2026, após a reformulação local do frontend na branch `feature/frontend-profissional`. A homologação já publicada é anterior a esta reformulação; estas mudanças não foram implantadas. Base de referência: `main` com a Tarefa 18 (Netlify, backup, migrações em CI e documentação), Usuários e Minha conta, o turno no contrato (PR #35), o relatório e a apresentação da Atividade 2 (PR #36) e o estorno de recebimentos e despesas com a data do recebimento (02/11/2026). Este retrato descreve o código, sem certificar implantação ou aceitação pelo proprietário.

## Frontend reformulado — entrega local de 02/11/2026

Implementado na branch `feature/frontend-profissional`. O envio desta branch ao GitHub não representa merge nem publicação do frontend:

- Login em duas colunas no computador, com planta ilustrativa do estacionamento; formulário simples em celulares. Inclui mostrar/ocultar senha e feedback durante o envio.
- Navegação lateral no computador, cabeçalho claro com busca e conta; no celular, cabeçalho compacto, menu inferior e menu Mais por perfil. A lateral tem rolagem própria em telas baixas.
- Painel com cartões claros, atalho para registrar recebimento, resumo da situação dos contratos, gráficos refinados e acesso aos últimos recebimentos. Os números continuam vindo da consulta existente.
- Campos, botões, tabelas, bordas, espaçamentos e títulos harmonizados entre mensalistas, vencimentos, recebimentos, despesas, caixa, usuários e conta. A busca superior agora aplica o parâmetro `busca` na lista, inclusive em pesquisas sucessivas.
- Transições de página e interação, entrada escalonada dos KPIs e animação curta do gráfico de barras. `prefers-reduced-motion` é respeitado pelo CSS e por `lib/movimento.ts`. A impressão do comprovante remove as transformações do contêiner animado.
- Paleta em `apps/web/src/estilos.css`: azul profundo, superfícies claras e ocre para atraso/erros (`#67502c` / `#f6efe4`), substituindo o bordô. A ausência de vermelho foi preservada; a aprovação visual do proprietário continua pendente.
- Monograma reutilizável em `components/ui/Marca.tsx`, favicon SVG e cor de tema no HTML. A planta da tela de login é decorativa e não representa ocupação real.

### Comportamento responsivo

Até 639 px: sem lateral, navegação fixa inferior com área segura do aparelho, linhas das tabelas em cartões com rótulos, formulários ajustáveis e ações de toque. A partir de 640 px: lateral com conteúdo redimensionado; grids de KPIs usam menos colunas em larguras intermediárias. Campos podem encolher sem extrapolar o contêiner e a página não esconde overflow horizontal para mascarar defeitos.

### Validação desta revisão

- Node 24.22.2, executado temporariamente por `npx --yes --package=node@24 -- ...` no WSL; dependências instaladas por `npm ci`. O Node 20.18 original da máquina é incompatível com as engines atuais.
- `npm test -w @estacionafacil/web -- --maxWorkers=4`: **237 testes passaram**, em 15 arquivos, incluindo os testes de contraste dos tokens.
- `npm run build -w @estacionafacil/web`, `npx eslint apps/web/src` e `git diff --check`: aprovados. O build mantém o aviso de bundle acima de 500 kB; a divisão do JavaScript em chunks permanece como melhoria futura.
- Playwright com Edge headless e MSW: **72 combinações de tela/largura passaram**, sem overflow horizontal nem erro de execução JavaScript. Foram nove telas (`/painel`, `/mensalistas`, `/vencimentos`, `/recebimentos`, `/despesas`, `/fluxo-de-caixa`, `/usuarios`, `/conta`, `/mensalistas/novo`) nas larguras **320, 360, 390, 414, 640, 768, 1024 e 1440 px**.
- Capturas de login, painel e telas móveis foram inspecionadas. Os arquivos de conferência e roteiros exploratórios ficaram temporariamente fora do repositório; não foram regravadas as imagens do manual.
- Toque em navegador emulado: **360×800, 390×844 e 844×390 (paisagem)** aprovados; login, busca por Carlos e nova busca por Joana já na lista, acesso a Usuários, logout e login do auxiliar com somente três destinos. Os testes de navegador usaram redução de movimento; transições também foram inspecionadas em capturas anteriores.
- Não foram executados nesta revisão os testes da API nem o E2E que recria o PostgreSQL. A conferência de navegador acima usou exclusivamente dados fictícios; não comprova integração com banco nem teste em aparelho físico/Safari.

### Como abrir esta cópia local

No projeto `/home/fesbxdev/projects/unitau/estaciona-facil`, iniciar:

```bash
npx --yes --package=node@24 -- npm run dev:mocks -w @estacionafacil/web -- --host 0.0.0.0
```

A interface fica em `http://localhost:5173`. Credenciais exclusivamente fictícias: `dono` ou `auxiliar`, senha `teste123`. O servidor local foi deixado em execução ao final da sessão. Os mocks estão em memória: atualizar o documento reinicia a sessão/dados; entrar novamente e navegar pelos links internos para manter o contexto. Para acessar de um celular na mesma rede, usar o endereço LAN da máquina que expõe o Vite e verificar o encaminhamento de rede/firewall do WSL; `localhost` no celular aponta para o próprio aparelho. Acesso de celular físico nesta rede não foi configurado nesta revisão.

As capturas versionadas do manual e os tokens da spec ainda retratam o design anterior. Atualizá-los no próximo ciclo de documentação/aceitação, usando o procedimento de capturas com banco descartável. A homologação e a produção não receberam este redesign.

## Novas logos e paleta — integração de 02/11/2026

Após validação e autorização do usuário, os assets de `docs/img` foram integrados ao frontend. `Marca.tsx` usa logo horizontal em áreas claras e ícone com texto adaptado ao fundo na lateral e no cabeçalho móvel. O comprovante e o favicon também usam a identidade com F. As cinco exportações PNG otimizadas estão em `apps/web/public/marca/`; originais preservados. Ícone de interface: aproximadamente 3–8 KB; logo horizontal: 31–101 KB conforme resolução.

Paleta aplicada com separação de tokens: marinho `#0B1E3C`, ações `#0D6EFD`, texto azul `#0B5ED7`, amarelo `#FFC107`, verde vivo `#22C55E` e texto verde `#15803D`. Os testes de contraste foram ampliados. A palavra ESTACIONA da logo horizontal não é usada sobre fundo escuro; nesse contexto, o nome é composto em HTML claro. O favicon simplifica o símbolo para manter legibilidade em tamanho pequeno. A descrição completa está em [validação da identidade visual](docs/validacao-identidade-visual.md).

As 72 combinações de nove telas por oito larguras (320–1440 px) foram novamente aprovadas, sem overflow horizontal ou erros de execução JavaScript. Toque, busca e permissões dos dois perfis passaram em 360×800, 390×844 e 844×390 (paisagem). Build do frontend e lint passaram. `npm test -w @estacionafacil/web -- --maxWorkers=1`: **244 testes passaram** em 15 arquivos, incluindo 49 testes de tokens/contraste. A primeira rodada concorrente teve timeouts; a rodada serial passou sem alterar os limites dos testes. Nenhum deploy foi feito; validação física/Safari e atualização das capturas do manual continuam pendentes.

## Contexto e stack

Gestão de um estacionamento no Centro de Taubaté: 49 vagas (35 carros e 14 motos), com clientela predominantemente mensalista. A Fase 1 cobre mensalistas, contratos, recebimentos, vencimentos, despesas e fluxo de caixa. Perfis: `proprietario` e `auxiliar`.

**PHP não será utilizado.** A stack atual é TypeScript, React, Express, Prisma e PostgreSQL. As referências a PHP/MySQL/XAMPP e a “desenvolvimento não iniciado” no README são desatualizadas.

Avulsos, cálculo de estadia e vagas por turno pertencem à Fase 2.

## Mapa do projeto

| Caminho                             | Responsabilidade                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/`                         | React 19, Vite 8, Tailwind 4, Router, TanStack Query, Hook Form e Recharts                                                                                                            |
| `apps/web/src/app/Roteador.tsx`     | Rotas e guardas de perfil                                                                                                                                                             |
| `apps/web/src/features/`            | Páginas e chamadas por domínio                                                                                                                                                        |
| `apps/web/src/lib/api.ts`           | Cliente HTTP, cabeçalhos, erros e sessão expirada                                                                                                                                     |
| `apps/web/src/mocks/`               | MSW para demonstração e testes                                                                                                                                                        |
| `apps/api/src/app.ts`               | `criarApp({ prisma, agora? })`, sem abrir porta                                                                                                                                       |
| `apps/api/src/servidor.ts`          | Inicialização do servidor local                                                                                                                                                       |
| `apps/api/src/rotas/` e `servicos/` | HTTP/autorização e regras/transações, respectivamente                                                                                                                                 |
| `apps/api/prisma/`                  | Esquema, migrações SQL e seed                                                                                                                                                         |
| `packages/shared/src/`              | Schemas Zod, tipos, enums, datas, dinheiro e situação                                                                                                                                 |
| `e2e/`                              | Playwright com API/banco reais e capturas do manual                                                                                                                                   |
| `.github/workflows/`                | `ci.yml` (Node 22 e PostgreSQL 17: lint, tipos, testes, build e E2E), `migrar.yml` (manual, por ambiente) e `backup.yml` (noturno, criptografado)                                     |
| `netlify.toml` e `netlify/`         | Build, redirecionamento `/api/*` e política de publicação; `funcoes/` tem os pontos de entrada (só `export default`) e `nucleo/` a lógica, testada em `apps/api/test/netlify.test.ts` |
| `scripts/`                          | `backup.sh`, `restaurar-backup.md`, `empacotar-funcoes.mjs` (gera `netlify/functions`, ignorada pelo Git) e os dados de demonstração                                                  |

Monorepo com npm workspaces. Fluxo: navegador → `/api` na mesma origem → Express → serviços → Prisma 7 com adapter PostgreSQL. O Vite encaminha `/api` para a porta 3001; `API_URL` altera o destino. O front não acessa o banco diretamente.

## O que já existe

- Autenticação e autorização nos dois perfis.
- Aba **Usuários** (só proprietário): cadastro de auxiliares, alteração de nome, ativação e redefinição de senha. Desativar ou redefinir senha encerra as sessões do auxiliar; só existe um proprietário. **Minha conta** (ambos os perfis, pelo nome no alto): troca de nome e de senha.
- Cadastro/edição de mensalistas, veículo e contrato (com turno diurno/noturno); renovação, encerramento e histórico.
- Recebimentos com comprovante e idempotência, com **data do recebimento** (hoje ou passada; futura é recusada) e seletor do dia na lista.
- **Estorno** (só proprietário, com motivo) de recebimentos e despesas: nada é apagado; o lançamento fica marcado e sai das somas. Do recebimento só o mais recente ainda válido do contrato; o vencimento volta um passo.
- Despesas variáveis/fixas e recorrências com pausa/retomada.
- Serviço `gerarDespesasRecorrentes`, idempotente por competência, chamado pela função agendada `gerar-despesas` (`03:00 UTC`, em `netlify.toml`). **Só roda em deploy publicado (produção); nada foi publicado em produção, e a homologação é um deploy não produtivo, no qual ela não roda.**
- Painel, vencimentos e fluxo de caixa com filtros.
- Interface integrada à API por padrão, com mocks opcionais.
- Testes compartilhados, de interface, API e aceitação; capturas em `docs/manual/capturas/`.

A existência desses recursos e testes não significa validação presencial pelo proprietário.

## Permissões e segurança

Todas as rotas usam o prefixo `/api`.

| Acesso                       | Operações                                                                                                                                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Público                      | `GET /saude` (consulta o banco) e `POST /auth/login`                                                                                                                                                                                                       |
| Ambos os perfis autenticados | Sessão/logout; Minha conta (`PATCH /conta`, `POST /conta/senha`); consulta de mensalistas/detalhes; registro e consulta de pagamentos/comprovantes; lançamento e consulta de despesas; consulta de recorrências                                            |
| Somente proprietário         | Gestão de auxiliares (`/usuarios`); estorno de recebimentos e despesas (`POST /pagamentos/:id/estorno`, `POST /despesas/:id/estorno`); cadastro/edição de mensalistas; renovação/encerramento; painel, vencimentos e caixa; pausa/retomada de recorrências |

O proprietário inicia no Painel e vê sete abas (com Usuários). O auxiliar inicia em Recebimentos e vê Mensalistas, Recebimentos e Despesas. A matriz é exercitada em `apps/api/test/permissoes.test.ts`; esconder abas não substitui autorização.

Senhas usam Argon2id. Sessões ficam no PostgreSQL, com hash do token e expiração renovável de 12 horas sem uso. Cookie `estaciona_sessao`: `HttpOnly`, `Secure`, `SameSite=Lax`. Escritas, inclusive login, exigem `X-Estaciona-App: 1`.

Login admite cinco falhas por par login/IP em quinze minutos; não há limite por IP isolado. Na Netlify, a função liga `trust proxy` (`confiarNoProxy` em `criarApp`) e repassa o IP do cabeçalho da Netlify; sem isso todos pareceriam ter o IP do proxy. Manter HTTPS na implantação; hosts HTTP diferentes de localhost podem não aceitar o cookie seguro.

## Regras essenciais

1. Dinheiro: `NUMERIC(12,2)` no banco, texto decimal na API (`"255.00"`) e somas em centavos inteiros pelos helpers compartilhados.
2. Datas de negócio: `AAAA-MM-DD` e coluna `DATE`; hoje em `America/Sao_Paulo`.
3. Situação calculada: vencido antes de hoje; a vencer de hoje até sete dias; em dia depois. Não persistir situação.
4. Pagamento avança a partir do vencimento atual, mesmo atrasado: um mês no mensal ou sete dias no semanal. Dia inexistente é limitado ao último dia do mês.
5. `POST /pagamentos` exige `Idempotency-Key`. Pagamento, vencimento e histórico são atômicos; há lock `FOR UPDATE`. Replay devolve o pagamento existente sem duplicar receita; `novoVencimento` corresponde ao vencimento atual do contrato, podendo mudar após outro pagamento.
6. Renovação estende sem receita, exige proprietário e motivo. Hoje recebe `meses` e avança em meses mesmo em contrato semanal; confirmar intenção antes de alterar.
7. Caixa usa datas de recebimento/despesa e **exclui os estornados** (inclusive no Painel, nos totais das listas e nos últimos recebimentos). Filtros de tipo de contrato/categoria afetam somente receitas e tornam `resultado` nulo.
8. Encerramento preserva histórico e libera ocupação. Índices únicos parciais limitam um contrato ativo por veículo e um por vaga **e turno** (`diurno`/`noturno`): um noturno pode dividir a vaga de um diurno. Não existe turno integral; quem usa o mesmo carro de dia e de noite é um contrato só (hoje um diurno com valor combinado).
9. Despesa fixa cria lançamento inicial e recorrência numa transação. Recorrência/competência é única. A geração recupera atraso dentro do mês recebido, sem recompor automaticamente todos os meses anteriores.
10. A migração inicial contém SQL manual: índices parciais, `CHECK`s e RLS sem políticas em todas as tabelas. Revisar novas migrações e habilitar RLS em novas tabelas. RLS não substitui autorização da API.
11. **Estorno:** colunas `estornado_em`, `estornado_por` e `motivo_estorno` em `pagamentos` e `despesas` (CHECK: as três nulas ou as três preenchidas) e o evento de histórico `estornado`. O estorno de recebimento trava o contrato (`FOR UPDATE`), recusa se houver recebimento válido mais novo (`ESTORNO_FORA_DE_ORDEM`) ou se já estornado (`JA_ESTORNADO`) e devolve o vencimento com `vencimentoAnterior` (inversa de `proximoVencimento`). A despesa fixa estornada mantém a competência, então a geração mensal não a recria. **A regra segue a opção A do item 1 de `docs/decisoes-para-o-proprietario.md`; o proprietário ainda não respondeu.**

## Executar localmente

Usar Node 22, npm e PostgreSQL 17. Na raiz:

```bash
npm ci
cp .env.example .env
docker compose up -d
```

Para o Docker local, preencher no `.env`:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/estaciona_facil
DATABASE_URL_MIGRACAO=postgresql://postgres:postgres@localhost:5433/estaciona_facil
DATABASE_URL_TESTE=postgresql://postgres:postgres@localhost:5433/estaciona_teste
VITE_USAR_MOCKS=0
```

Credenciais exclusivas do Docker local. Não publicar `.env` nem reutilizá-las em produção. O script do container cria o banco de teste no primeiro uso do volume.

```bash
npm run gerar -w @estacionafacil/api
npm run migrar -w @estacionafacil/api
npm run semear -w @estacionafacil/api
npm run criar-proprietario -w @estacionafacil/api
# Opcional, também interativo
npm run criar-proprietario -w @estacionafacil/api -- --perfil=auxiliar
```

Não existe senha padrão: o script pede senha com no mínimo dez caracteres. Em dois terminais:

```bash
# Terminal 1
npm run dev -w @estacionafacil/api
# Terminal 2
npm run dev -w @estacionafacil/web
```

API: porta 3001 (`PORT` altera). Abrir a URL do Vite, normalmente `http://localhost:5173`.

Para demonstração sem API: `npm run dev:mocks -w @estacionafacil/web`. Variáveis exportadas prevalecem sobre o modo: remover `VITE_USAR_MOCKS=0` do ambiente do processo ou usar `1` se impedir os mocks.

## Verificar

```bash
npm run lint
npm run typecheck
npm test
npm run build -w @estacionafacil/web
```

Não existe build na raiz. O cliente Prisma em `apps/api/generated/prisma` é gerado antes de test/typecheck da API; não versioná-lo.

**Testes da API e E2E apagam dados.** Usar somente `DATABASE_URL_TESTE` com banco descartável cujo nome contenha `test`. Migrações de teste são automáticas.

```bash
npm run e2e
# Apenas aceitação
npx playwright test --project=aceitacao
```

Playwright sobe API em 3101 e front em 5174, com um worker. Fora do CI usa Edge; em Linux sem Edge, usar `CI=1 npx playwright test --project=aceitacao` após instalar Chromium (`npx playwright install chromium`) e suas dependências de sistema.

O projeto `capturas` roda depois da aceitação, recria o banco com dados de demonstração e regrava imagens versionadas. Não executá-lo apenas para validar documentação.

O CI executa `npm ci`, lint, typecheck e testes dos workspaces, o build do front (`npm run build -w @estacionafacil/web`) e das funções (`npm run funcoes`) e, num job à parte, o E2E com Chromium (`needs: verificar`).

## Pendências e continuação

A **Tarefa 18** está implementada. **Em 02/11/2026 foi implantada só a homologação** (veja abaixo); a **produção não foi publicada**:

1. Netlify: `netlify.toml`, função `api` (Express, função v2/ESM), redirecionamento `/api/*`, fallback do SPA e `trust proxy`. Publicação em produção **manual** (`[context.production] ignore = "exit 0"`).
2. Agendamento diário de recorrências: função `gerar-despesas` às `03:00 UTC`.
3. `migrar.yml` (manual, por ambiente) e `backup.yml` (noturno: `pg_dump`, criptografia com gpg e envio a um armazenamento S3 privado). A restauração foi testada **em PostgreSQL local**, com resultado em `docs/guia-de-instalacao.md` (seção 9); falta repetir com um backup real e no Supabase.
4. CI com build e E2E.
5. Manual do usuário, guia de instalação, README e `docs/api.md` atualizados; os diagramas UML ganharam uma nota, mas **não foram redesenhados**. O Documento de Visão 2.0 continua pendente. O diagrama exportado do esquema (RNF04) está em `docs/modelo-de-dados.md`.
6. Falta a validação com o proprietário, incluindo regras de negócio e renovação semanal. As respostas estão em `docs/respostas-do-proprietario.md` e as questões abertas em `docs/decisoes-para-o-proprietario.md`. Pontos principais: (a) ele pediu ausência de vermelho: esta revisão substitui o bordô por ocre, ainda sem aprovação visual dele; (b) o uso será principalmente por celular: a nova interface foi validada em navegador com diferentes larguras, mas falta o teste em aparelho físico; (c) o turno no contrato e a cobrança quando o mesmo carro usa os dois turnos ainda precisam de confirmação. As capturas do manual ainda não mostram o turno nem a reformulação visual. A dependência de internet foi respondida: há internet, e a nuvem está confirmada.

Pontos de atenção:

- **Funções da Netlify:** em `netlify/funcoes/*.mts` só pode haver `export default`. Um `handler` nomeado faz a Netlify tratar a função como v1 e empacotá-la em CommonJS, e o `import.meta.url` do cliente gerado do Prisma fica indefinido (a função cai ao iniciar). Funções v2 não passam pelo esbuild da Netlify, por isso `npm run funcoes` gera o bundle em `netlify/functions`. O teste `netlify.test.ts` cobre isso.
- **Homologação no ar (02/11/2026):** site da Netlify `estaciona-facil-homolog` (endereço `https://homologacao--estaciona-facil-homolog.netlify.app`) e projeto do Supabase `estaciona_facil`. É um _deploy_ com alias, feito da `main` pela Netlify CLI; o procedimento está na seção 7 do guia de instalação. O banco tem as 3 migrações aplicadas (`base_inicial`, `turno_no_contrato`, `estorno`), feitas **da máquina de um integrante**, porque o workflow _Migrar o banco_ travou no pooler (a execução fica 10 minutos em "Migrações pendentes" até o limite). A `DATABASE_URL` da Netlify é a do _Transaction pooler_, no mesmo valor para todos os escopos.
- **Verificado na homologação:** `/api/saude` responde `ok` (consulta o banco), o front abre, o bundle é o novo e as rotas novas exigem login (401). **Não foi testado por dentro** (login, telas, estorno, turno): quem fez o deploy não tinha as credenciais. Conferir antes de mostrar ao proprietário e confirmar se o banco de homologação já tem o usuário proprietário (`npm run criar-proprietario`).
- **A senha do banco foi redefinida** no Supabase para a migração. Confirmar que o segredo `DATABASE_URL_MIGRACAO` (GitHub, ambiente `homologacao`) foi atualizado; a `DATABASE_URL` da Netlify já foi. O `DATABASE_URL_BACKUP` é do banco de produção e não é afetado. Sintoma de senha velha: `/api/saude` dá 500 e o log da função diz `password authentication failed`.
- **Ainda não criados nem exercitados:** a produção (site e projeto do Supabase), o armazenamento do backup e o backup noturno. O guia de instalação indica os passos.
- `BACKUP_PASSPHRASE` precisa de cópia fora do GitHub; sem ela o backup não abre.

A spec prevê publicação manual após CI, aceitação, backup/restauração e validação do guia; merge não equivale a autorização de deploy.

## Fontes e validação desta análise

- [Design da Fase 1](docs/superpowers/specs/2026-10-26-estacionafacil-fase1-design.md): decisões e aceite; cabeçalho ainda registra revisão escrita pendente.
- [Plano](docs/superpowers/plans/2026-10-26-estacionafacil-fase1.md): Task 18 e sequência; checkboxes antigos não comprovam ausência de implementação.
- [API](apps/api/README.md), [E2E](e2e/README.md), [colaboração](CONTRIBUTING.md) e [instruções para assistentes](claude.md).

Ao retomar, conferir código, histórico e `git status`. A análise documental original foi feita sem dependências instaladas e com Node 20. Nesta revisão do frontend, as dependências foram instaladas, o Node 24 foi usado e os testes locais foram executados conforme o registro de validação no início deste handoff. As verificações antigas abaixo são históricas e não substituem a validação desta revisão.

Verificações da Tarefa 18 (27/10/2026; as contagens são dessa data e não foram refeitas após Usuários e Minha conta, que têm testes próprios em `usuarios.test.tsx`, `conta.test.tsx` e `usuarios.test.ts`, em máquina local com Node 24 e PostgreSQL 18): lint, tipos, testes (shared 56, web 195, API 256), build do front, `npm run funcoes` e E2E (14) passaram. As funções foram também empacotadas com o `@netlify/zip-it-and-ship-it` e executadas a partir do zip contra o banco, e a restauração do backup foi conferida tabela a tabela. O CI do PR (Node 22, PostgreSQL 17) é a confirmação independente; nada disso substitui a validação com o proprietário.
