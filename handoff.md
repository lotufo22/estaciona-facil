# Handoff — EstacionaFácil

Atualizado em 27/10/2026. Referência: `main` no commit `8f305b5` mais a Tarefa 18 (Netlify, backup, migrações em CI e documentação), que foi acrescentada depois por este PR. Este retrato descreve o código, sem certificar implantação ou aceitação pelo proprietário.

## Contexto e stack

Gestão de um estacionamento no Centro de Taubaté: 49 vagas (35 carros e 14 motos), com clientela predominantemente mensalista. A Fase 1 cobre mensalistas, contratos, recebimentos, vencimentos, despesas e fluxo de caixa. Perfis: `proprietario` e `auxiliar`.

**PHP não será utilizado.** A stack atual é TypeScript, React, Express, Prisma e PostgreSQL. As referências a PHP/MySQL/XAMPP e a “desenvolvimento não iniciado” no README são desatualizadas.

Avulsos, cálculo de estadia e vagas por turno pertencem à Fase 2.

## Mapa do projeto

| Caminho | Responsabilidade |
| --- | --- |
| `apps/web/` | React 19, Vite 8, Tailwind 4, Router, TanStack Query, Hook Form e Recharts |
| `apps/web/src/app/Roteador.tsx` | Rotas e guardas de perfil |
| `apps/web/src/features/` | Páginas e chamadas por domínio |
| `apps/web/src/lib/api.ts` | Cliente HTTP, cabeçalhos, erros e sessão expirada |
| `apps/web/src/mocks/` | MSW para demonstração e testes |
| `apps/api/src/app.ts` | `criarApp({ prisma, agora? })`, sem abrir porta |
| `apps/api/src/servidor.ts` | Inicialização do servidor local |
| `apps/api/src/rotas/` e `servicos/` | HTTP/autorização e regras/transações, respectivamente |
| `apps/api/prisma/` | Esquema, migrações SQL e seed |
| `packages/shared/src/` | Schemas Zod, tipos, enums, datas, dinheiro e situação |
| `e2e/` | Playwright com API/banco reais e capturas do manual |
| `.github/workflows/` | `ci.yml` (Node 22 e PostgreSQL 17: lint, tipos, testes, build e E2E), `migrar.yml` (manual, por ambiente) e `backup.yml` (noturno, criptografado) |
| `netlify.toml` e `netlify/` | Build, redirecionamento `/api/*` e política de publicação; `funcoes/` tem os pontos de entrada (só `export default`) e `nucleo/` a lógica, testada em `apps/api/test/netlify.test.ts` |
| `scripts/` | `backup.sh`, `restaurar-backup.md`, `empacotar-funcoes.mjs` (gera `netlify/functions`, ignorada pelo Git) e os dados de demonstração |

Monorepo com npm workspaces. Fluxo: navegador → `/api` na mesma origem → Express → serviços → Prisma 7 com adapter PostgreSQL. O Vite encaminha `/api` para a porta 3001; `API_URL` altera o destino. O front não acessa o banco diretamente.

## O que já existe

- Autenticação e autorização nos dois perfis.
- Cadastro/edição de mensalistas, veículo e contrato; renovação, encerramento e histórico.
- Recebimentos com comprovante e idempotência.
- Despesas variáveis/fixas e recorrências com pausa/retomada.
- Serviço `gerarDespesasRecorrentes`, idempotente por competência, chamado pela função agendada `gerar-despesas` (`03:00 UTC`, em `netlify.toml`). **Só roda em deploy publicado, e nada foi publicado.**
- Painel, vencimentos e fluxo de caixa com filtros.
- Interface integrada à API por padrão, com mocks opcionais.
- Testes compartilhados, de interface, API e aceitação; capturas em `docs/manual/capturas/`.

A existência desses recursos e testes não significa validação presencial pelo proprietário.

## Permissões e segurança

Todas as rotas usam o prefixo `/api`.

| Acesso | Operações |
| --- | --- |
| Público | `GET /saude` (consulta o banco) e `POST /auth/login` |
| Ambos os perfis autenticados | Sessão/logout; consulta de mensalistas/detalhes; registro e consulta de pagamentos/comprovantes; lançamento e consulta de despesas; consulta de recorrências |
| Somente proprietário | Cadastro/edição de mensalistas; renovação/encerramento; painel, vencimentos e caixa; pausa/retomada de recorrências |

O proprietário inicia no Painel e vê seis abas. O auxiliar inicia em Recebimentos e vê Mensalistas, Recebimentos e Despesas. A matriz é exercitada em `apps/api/test/permissoes.test.ts`; esconder abas não substitui autorização.

Senhas usam Argon2id. Sessões ficam no PostgreSQL, com hash do token e expiração renovável de 12 horas sem uso. Cookie `estaciona_sessao`: `HttpOnly`, `Secure`, `SameSite=Lax`. Escritas, inclusive login, exigem `X-Estaciona-App: 1`.

Login admite cinco falhas por par login/IP em quinze minutos; não há limite por IP isolado. Na Netlify, a função liga `trust proxy` (`confiarNoProxy` em `criarApp`) e repassa o IP do cabeçalho da Netlify; sem isso todos pareceriam ter o IP do proxy. Manter HTTPS na implantação; hosts HTTP diferentes de localhost podem não aceitar o cookie seguro.

## Regras essenciais

1. Dinheiro: `NUMERIC(12,2)` no banco, texto decimal na API (`"255.00"`) e somas em centavos inteiros pelos helpers compartilhados.
2. Datas de negócio: `AAAA-MM-DD` e coluna `DATE`; hoje em `America/Sao_Paulo`.
3. Situação calculada: vencido antes de hoje; a vencer de hoje até sete dias; em dia depois. Não persistir situação.
4. Pagamento avança a partir do vencimento atual, mesmo atrasado: um mês no mensal ou sete dias no semanal. Dia inexistente é limitado ao último dia do mês.
5. `POST /pagamentos` exige `Idempotency-Key`. Pagamento, vencimento e histórico são atômicos; há lock `FOR UPDATE`. Replay devolve o pagamento existente sem duplicar receita; `novoVencimento` corresponde ao vencimento atual do contrato, podendo mudar após outro pagamento.
6. Renovação estende sem receita, exige proprietário e motivo. Hoje recebe `meses` e avança em meses mesmo em contrato semanal; confirmar intenção antes de alterar.
7. Caixa usa datas de recebimento/despesa. Filtros de tipo de contrato/categoria afetam somente receitas e tornam `resultado` nulo.
8. Encerramento preserva histórico e libera ocupação. Índices únicos parciais limitam um contrato ativo por veículo e por vaga.
9. Despesa fixa cria lançamento inicial e recorrência numa transação. Recorrência/competência é única. A geração recupera atraso dentro do mês recebido, sem recompor automaticamente todos os meses anteriores.
10. A migração inicial contém SQL manual: índices parciais, `CHECK`s e RLS sem políticas em todas as tabelas. Revisar novas migrações e habilitar RLS em novas tabelas. RLS não substitui autorização da API.

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

A **Tarefa 18** está implementada, mas **nada foi implantado**:

1. Netlify: `netlify.toml`, função `api` (Express, função v2/ESM), redirecionamento `/api/*`, fallback do SPA e `trust proxy`. Publicação em produção **manual** (`[context.production] ignore = "exit 0"`).
2. Agendamento diário de recorrências: função `gerar-despesas` às `03:00 UTC`.
3. `migrar.yml` (manual, por ambiente) e `backup.yml` (noturno: `pg_dump`, criptografia com gpg e envio a um armazenamento S3 privado). A restauração foi testada **em PostgreSQL local**, com resultado em `docs/guia-de-instalacao.md` (seção 9); falta repetir com um backup real e no Supabase.
4. CI com build e E2E.
5. Manual do usuário, guia de instalação, README e `docs/api.md` atualizados; os diagramas UML ganharam uma nota, mas **não foram redesenhados**. O Documento de Visão 2.0 continua pendente.
6. Falta a validação com o proprietário, incluindo regras de negócio, renovação semanal e dependência de internet.

Pontos de atenção:

- **Funções da Netlify:** em `netlify/funcoes/*.mts` só pode haver `export default`. Um `handler` nomeado faz a Netlify tratar a função como v1 e empacotá-la em CommonJS, e o `import.meta.url` do cliente gerado do Prisma fica indefinido (a função cai ao iniciar). Funções v2 não passam pelo esbuild da Netlify, por isso `npm run funcoes` gera o bundle em `netlify/functions`. O teste `netlify.test.ts` cobre isso.
- Netlify, Supabase, o armazenamento do backup e os segredos do GitHub **ainda não foram criados nem exercitados**. O guia de instalação indica os passos, e a primeira execução real vai confirmar os detalhes das telas desses serviços.
- `BACKUP_PASSPHRASE` precisa de cópia fora do GitHub; sem ela o backup não abre.

A spec prevê publicação manual após CI, aceitação, backup/restauração e validação do guia; merge não equivale a autorização de deploy.

## Fontes e validação desta análise

- [Design da Fase 1](docs/superpowers/specs/2026-10-26-estacionafacil-fase1-design.md): decisões e aceite; cabeçalho ainda registra revisão escrita pendente.
- [Plano](docs/superpowers/plans/2026-10-26-estacionafacil-fase1.md): Task 18 e sequência; checkboxes antigos não comprovam ausência de implementação.
- [API](apps/api/README.md), [E2E](e2e/README.md), [colaboração](CONTRIBUTING.md) e [instruções para assistentes](claude.md).

Ao retomar, conferir código, histórico e `git status`. Não foram executados testes locais nesta análise: checkout sem `node_modules` e WSL com Node 20, enquanto o CI usa Node 22. Consultar o CI do PR destes documentos para a validação automatizada da entrega.

Verificações da Tarefa 18 (27/10/2026, em máquina local com Node 24 e PostgreSQL 18): lint, tipos, testes (shared 56, web 195, API 256), build do front, `npm run funcoes` e E2E (14) passaram. As funções foram também empacotadas com o `@netlify/zip-it-and-ship-it` e executadas a partir do zip contra o banco, e a restauração do backup foi conferida tabela a tabela. O CI do PR (Node 22, PostgreSQL 17) é a confirmação independente; nada disso substitui a validação com o proprietário.