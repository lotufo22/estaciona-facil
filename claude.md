# Instruções — EstacionaFácil

## Começar

Leia [handoff.md](handoff.md), [CONTRIBUTING.md](CONTRIBUTING.md) e a [spec](docs/superpowers/specs/2026-10-26-estacionafacil-fase1-design.md). Confira `git status`, histórico e arquivos envolvidos; preserve alterações locais do usuário.

**PHP não será utilizado.** A stack vigente é TypeScript com React/Vite/Tailwind, Express/Prisma e PostgreSQL. README e documentos acadêmicos ainda mencionam PHP/MySQL/XAMPP: essas referências estão desatualizadas. Verifique comportamento no código e nos testes e explicite divergências com a spec.

Este arquivo foi solicitado como `claude.md`. Ferramentas que exijam `CLAUDE.md` para descoberta automática devem carregar este arquivo explicitamente; não presumir reconhecimento em sistemas sensíveis a maiúsculas.

## Organização e convenções

- Monorepo npm workspaces: `apps/web`, `apps/api`, `packages/shared`. Comandos na raiz; selecionar workspace com `-w`.
- TypeScript, módulos ESM e nomes/mensagens em português, conforme os padrões existentes.
- Schemas Zod, tipos e regras comuns no pacote shared; evitar duplicação entre API, front e mocks.
- Rotas validam/autorizam; serviços concentram regras e transações. `criarApp` recebe Prisma e relógio; só o servidor local abre porta.
- Front organizado por `features`; reutilizar `components/ui`, `lib/api.ts` e TanStack Query, invalidando consultas após mutações.
- Preservar carregamento, vazio, erro, sessão expirada, foco visível e situação com texto. Interface e mensagens em pt-BR, adequadas a usuários com pouca experiência digital.
- Fase 1: mensalistas, contratos, recebimentos, vencimentos, despesas e caixa. Avulsos/estadias/turnos são Fase 2.

## Invariantes

- Dinheiro: decimal no banco, texto com duas casas na API e cálculo em centavos inteiros pelos helpers compartilhados.
- Datas de negócio em `AAAA-MM-DD`; hoje em `America/Sao_Paulo`. Reutilizar helpers e relógio injetável.
- Situação calculada: vencido antes de hoje; a vencer de hoje até sete dias; em dia depois. Não persistir.
- Pagamento avança a partir do vencimento atual: um mês ou sete dias. Preservar transação, histórico, lock e `Idempotency-Key`. Replay não cria receita; devolve pagamento existente e vencimento atual do contrato.
- Renovação é sem receita, exclusiva do proprietário, com motivo. O código atual avança em meses inclusive para semanal; confirmar intenção antes de mudar.
- Encerramento lógico preserva histórico. Respeitar unicidade de contrato ativo por veículo/vaga.
- Caixa usa regime de caixa; filtro de categoria/tipo afeta receitas e oculta resultado (`null`).
- Recorrências únicas por competência; limitar dia ao fim do mês. Geração cobre o mês recebido; agendamento ainda não existe.

## Segurança e banco

- Autorizar no servidor; guardas de interface são complementares. Conferir `apps/api/test/permissoes.test.ts` ao alterar rotas.
- Preservar Argon2id, sessão no banco, hash do token, prazo por inatividade, cookie seguro e `X-Estaciona-App: 1` em escritas, inclusive login.
- Não expor segredos, URLs reais do banco, tokens ou dados pessoais em logs/front/documentação. Usar exemplos fictícios; não existe senha padrão de produção.
- Revisar SQL de migrações: índices parciais, CHECKs e RLS não aparecem integralmente no schema Prisma. Habilitar RLS em tabelas novas.
- Criar novas migrações para mudanças de esquema; não reescrever migrações já aplicadas.
- Não versionar `.env`, `apps/api/generated/`, dependências ou relatórios de testes.
- Testes da API/E2E apagam dados. Usar banco descartável com nome contendo `test`; nunca produção ou banco com dados úteis.

## Execução e verificação

Usar Node 22, como no CI. Preparação do banco e variáveis em [handoff.md](handoff.md).

```bash
npm ci
npm run gerar -w @estacionafacil/api
npm run migrar -w @estacionafacil/api
npm run semear -w @estacionafacil/api
npm run criar-proprietario -w @estacionafacil/api
# Servidores em terminais separados
npm run dev -w @estacionafacil/api
npm run dev -w @estacionafacil/web
# Alternativa de demonstração sem API
npm run dev:mocks -w @estacionafacil/web
```

Vite fala com a API real por padrão; proxy para porta 3001. `VITE_USAR_MOCKS=1` ativa dados fictícios; variáveis do processo prevalecem sobre o modo.

```bash
npm run lint
npm run typecheck
npm test
npm run build -w @estacionafacil/web
# Verificações direcionadas
npm test -w @estacionafacil/shared
npm test -w @estacionafacil/api -- pagamentos
npm test -w @estacionafacil/web
# Com banco descartável e navegador disponíveis
npx playwright test --project=aceitacao
```

Não existe build na raiz. CI atual: lint, tipos e testes, sem build/E2E. Fora do CI, Playwright seleciona Edge; detalhes para Linux em `handoff.md`.

Para mudanças funcionais, executar verificações pertinentes e cobertura da regra afetada. Para documentação, revisar comandos, referências e diff. Não executar capturas que regravam imagens sem necessidade. Informar verificações não executadas.

## Entrega

Criar branch de tarefa (`docs/`, `feature/`, `fix/`), Conventional Commits e PR para `main`, conforme CONTRIBUTING. Incluir somente mudanças solicitadas. Conferir diff/checks antes do merge e respeitar proteções do GitHub e autorização do usuário.

Próxima etapa: Task 18 do [plano](docs/superpowers/plans/2026-10-26-estacionafacil-fase1.md), com Netlify, agendador, migrações em CI, backup criptografado, restauração e documentação. Não afirmar que recursos planejados já estão implantados nem executar deploy apenas porque houve merge.

Atualizar o handoff após trabalho relevante, distinguindo implementação, testes executados e validação com o proprietário.