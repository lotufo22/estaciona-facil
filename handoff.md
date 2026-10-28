# Handoff — EstacionaFácil

Atualizado em 27/10/2026. Referência: `main` no commit `25ce64c` (PR #24, integração com API real e E2E). Este retrato descreve o código, sem certificar implantação ou aceitação pelo proprietário.

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
| `.github/workflows/ci.yml` | Node 22 e PostgreSQL 17; lint, tipos e testes |

Monorepo com npm workspaces. Fluxo: navegador → `/api` na mesma origem → Express → serviços → Prisma 7 com adapter PostgreSQL. O Vite encaminha `/api` para a porta 3001; `API_URL` altera o destino. O front não acessa o banco diretamente.

## O que já existe

- Autenticação e autorização nos dois perfis.
- Cadastro/edição de mensalistas, veículo e contrato; renovação, encerramento e histórico.
- Recebimentos com comprovante e idempotência.
- Despesas variáveis/fixas e recorrências com pausa/retomada.
- Serviço `gerarDespesasRecorrentes`, idempotente por competência, **ainda sem agendamento operacional**.
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

Login admite cinco falhas por par login/IP em quinze minutos; não há limite por IP isolado. A configuração de `trust proxy` depende da futura infraestrutura. Manter HTTPS na implantação; hosts HTTP diferentes de localhost podem não aceitar o cookie seguro.

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

O CI atual executa `npm ci`, lint, typecheck e testes dos workspaces; **não executa build nem Playwright**, apesar do escopo maior previsto na spec.

## Pendências e continuação

A próxima etapa do plano é a **Task 18**, ausente nesta referência:

1. Empacotamento Netlify: função Express, redirecionamento de API, fallback SPA e proxy confiável.
2. Agendamento diário de recorrências; o plano prevê `03:00 UTC`.
3. Workflows de migração e backup criptografado para armazenamento privado; restauração testada e documentada em banco descartável.
4. Ampliar CI com build e, conforme infraestrutura, E2E.
5. Manual com capturas existentes e guia de instalação; atualizar README, `docs/api.md`, notas UML e Documento de Visão para a stack vigente.
6. Validação com proprietário, incluindo regras de negócio, renovação semanal e dependência de internet da implantação planejada.

Netlify/Supabase são destinos planejados, sem implantação confirmada. Não existem `netlify.toml`, funções nem workflows de backup/migração na referência. A spec prevê publicação manual após CI, aceitação, backup/restauração e validação do guia; merge não equivale a autorização de deploy.

## Fontes e validação desta análise

- [Design da Fase 1](docs/superpowers/specs/2026-10-26-estacionafacil-fase1-design.md): decisões e aceite; cabeçalho ainda registra revisão escrita pendente.
- [Plano](docs/superpowers/plans/2026-10-26-estacionafacil-fase1.md): Task 18 e sequência; checkboxes antigos não comprovam ausência de implementação.
- [API](apps/api/README.md), [E2E](e2e/README.md), [colaboração](CONTRIBUTING.md) e [instruções para assistentes](claude.md).

Ao retomar, conferir código, histórico e `git status`. Não foram executados testes locais nesta análise: checkout sem `node_modules` e WSL com Node 20, enquanto o CI usa Node 22. Consultar o CI do PR destes documentos para a validação automatizada da entrega.