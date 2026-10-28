# Guia de instalação do EstacionaFácil

Este guia leva do zero (nenhuma conta criada) até o sistema no ar, com backup funcionando. Foi escrito
para quem tem conhecimento técnico básico e vai instalar pela primeira vez. Cada seção diz **o que fazer**,
**como saber que deu certo** e **o que fazer se não deu**.

> **Estado da validação:** o código, as migrações, as funções empacotadas e o backup com restauração foram
> testados em máquina local (seção 9). **A publicação na Netlify e o banco no Supabase ainda não foram
> exercitados de ponta a ponta**: os passos 2 a 4 abaixo seguem a documentação dos serviços e as
> configurações do repositório, mas é o primeiro uso real que vai confirmar os detalhes das telas deles.
> Siga o guia na homologação antes de repetir na produção (e anote qualquer divergência aqui).

## 1. Visão geral

```
Navegador ──► Netlify (CDN: o front React)
                 └─► /api/*  ──► função "api" (Express) ──► Supabase (PostgreSQL)
              função agendada "gerar-despesas" (03:00 UTC) ──► Supabase
GitHub Actions: CI, migrações (manual) e backup noturno ──► armazenamento privado (criptografado)
```

- **Um domínio só:** a Netlify serve o front e envia `/api/*` para a função. O cookie de sessão funciona
  sem configuração extra e não há CORS.
- **Banco:** PostgreSQL no Supabase. Migrações **nunca** rodam sozinhas ao subir a função: você as aplica
  pelo GitHub Actions.
- **Publicação em produção é manual** (seção 7). Cada publicação de produção gasta créditos da Netlify.

### Ambientes

| Ambiente | Para quê | Banco | Dados |
|---|---|---|---|
| Local | desenvolver | PostgreSQL local | fictícios |
| Homologação | validar com o proprietário | projeto Supabase gratuito nº 1 | fictícios |
| Produção | uso real | projeto Supabase nº 2, criado na entrega | reais |

## 2. Contas e ferramentas

| O quê | Para quê | Custo |
|---|---|---|
| GitHub (já existe: `lotufo22/estaciona-facil`) | código, CI, migrações, backup | grátis |
| [Supabase](https://supabase.com) | banco PostgreSQL | grátis (veja os limites abaixo) |
| [Netlify](https://www.netlify.com) | hospedagem do front e das funções | grátis (veja os limites abaixo) |
| Um armazenamento privado compatível com S3, como [Cloudflare R2](https://developers.cloudflare.com/r2/) ou Backblaze B2 | guardar os backups criptografados | grátis nas cotas pequenas |
| Node.js 22 e Git na sua máquina | rodar os scripts de instalação | grátis |

**Limites a conhecer** (confirme os valores atuais nos sites dos serviços):

- **Netlify gratuita:** 300 créditos por mês, e cada *deploy* de produção custa 15. Se os créditos
  acabam, **todos os sites da conta são pausados** até o mês seguinte. *Deploys* de prévia (por Pull
  Request) não consomem créditos.
- **Supabase gratuito:** **não tem backup automático** (por isso existe o backup deste repositório) e o
  projeto é **pausado após uma semana sem uso**. Na produção, o plano Pro (backup diário de 7 dias, sem
  pausa) é o recomendado; o backup do repositório continua como segunda cópia.

## 3. Banco de dados (Supabase)

1. Crie um projeto no Supabase (um para homologação; outro, depois, para produção). Anote a senha do banco.
2. No painel do projeto, abra **Connect** e copie duas *connection strings*:
   - **Transaction pooler** (porta `6543`): é a que o **site** usa → vira `DATABASE_URL`.
   - **Session pooler** (porta `5432`): serve às **migrações e ao backup** → vira `DATABASE_URL_MIGRACAO`
     e `DATABASE_URL_BACKUP`.
   - Use os *poolers*: a conexão direta do Supabase é só IPv6, e o GitHub Actions não a alcança.
   - Na URL do **Transaction pooler**, acrescente `?pgbouncer=true&connection_limit=1`.
3. Aplique as migrações. Opção A, pelo GitHub (recomendada): veja a seção 6. Opção B, da sua máquina:

   ```bash
   # .env na raiz (nunca vai para o Git): DATABASE_URL_MIGRACAO=<Session pooler>
   npm ci
   npm run migrar -w @estacionafacil/api
   ```

4. Crie as 49 vagas (35 de carro, 14 de moto). É seguro repetir:

   ```bash
   npm run semear -w @estacionafacil/api
   ```

5. Crie o **primeiro usuário**. Não existe senha padrão: o script pergunta a senha na hora (mínimo de
   10 caracteres) e ela não aparece na tela.

   ```bash
   npm run criar-proprietario -w @estacionafacil/api
   npm run criar-proprietario -w @estacionafacil/api -- --perfil=auxiliar   # um login de Auxiliar
   ```

**Como saber que deu certo:** no Supabase, em *Table Editor*, aparecem 12 tabelas, a tabela `vagas` tem
49 linhas e `usuarios` tem o seu usuário.
**Se der erro de conexão:** confira a porta (5432 para migrar, 6543 para o site), a senha e se está usando
o *pooler* e não a conexão direta.

## 4. Site na Netlify

1. Em *Add new site > Import an existing project*, escolha o repositório do GitHub. A Netlify lê o
   `netlify.toml`, que já define o comando de build, a pasta publicada (`apps/web/dist`), as funções, o
   redirecionamento `/api/*` e o agendamento. Não preencha esses campos à mão.
2. Em *Site configuration > Environment variables*, crie:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | o **Transaction pooler** da seção 3, com `?pgbouncer=true&connection_limit=1` |

   É a única variável do site. Os segredos ficam só aqui: o repositório contém apenas o `.env.example`.
3. Em *Deploys > Build settings*, ative **Stop auto publishing** (impede que o site de produção seja
   publicado sozinho a cada alteração). O `netlify.toml` já cancela os *builds* automáticos de produção
   (`[context.production] ignore = "exit 0"`), mas confirme também no painel.

**Como saber que deu certo:** um *deploy* de prévia (abra um Pull Request de teste) termina verde, e a
página de prévia abre a tela de entrada. Abra `https://<prévia>/api/saude`: deve responder
`{"status":"ok"}`.
**Se `/api/saude` der erro 500:** olhe *Logs > Functions*; quase sempre é `DATABASE_URL` ausente ou errada.
A Netlify guarda esse histórico por apenas 24 h no plano gratuito.

### A função agendada

`gerar-despesas` roda todos os dias às `03:00 UTC` (meia-noite em Brasília) e lança a despesa fixa do mês
para quem já chegou ao dia. É segura para repetir: não duplica lançamentos, e se um dia falhar, o dia
seguinte recupera. **Só roda em *deploy* publicado**; não roda em prévia.

## 5. Dados de demonstração (homologação)

Para validar com o proprietário sem dados reais, popule a homologação com dados fictícios: mensalistas
vencidos, a vencer e em dia, cinco meses de pagamentos e despesas. O script de demonstração só
**acrescenta** dados; ele é usado pelos testes de ponta a ponta (`e2e/preparar-banco.ts --demo`) e exige
um banco com "test" no nome, para nunca rodar por engano na produção. Para a homologação, a forma mais
simples é cadastrar alguns mensalistas pela própria interface.

## 6. Migrações pelo GitHub Actions

O workflow **Migrar o banco** (`.github/workflows/migrar.yml`) é **manual**:

1. No GitHub, crie dois *Environments* (*Settings > Environments*): `homologacao` e `producao`. Em
   `producao`, ative *Required reviewers* para exigir uma segunda pessoa.
2. Em cada um, crie o segredo `DATABASE_URL_MIGRACAO` (o **Session pooler**).
3. *Actions > Migrar o banco > Run workflow*, escolha o ambiente.

**Antes de migrar a produção:** leia o SQL da migração e confira que há um backup recente (seção 8).

## 7. Publicar

A **publicação em produção é manual** e só acontece quando **todos** os critérios abaixo forem cumpridos:

- [ ] O CI está verde na `main` (lint, tipos, testes, *build* e o roteiro de aceitação).
- [ ] A validação com o proprietário, em homologação, foi concluída e os ajustes pedidos foram feitos.
- [ ] O roteiro de aceitação passa de ponta a ponta (`npm run e2e`).
- [ ] O backup foi executado e a **restauração foi testada** com sucesso (seção 9).
- [ ] Este guia foi seguido do zero, sem passos faltando.

Cumpridos os critérios, publique de uma máquina com a Netlify CLI logada (`npx netlify login`):

```bash
npx netlify deploy --build --prod
```

Meta: poucas publicações em produção durante o semestre, muito abaixo do limite de 20 por mês. A Netlify
avisa por e-mail aos 50%, 75% e 100% dos créditos.

**Fazer o merge na `main` não publica nada.**

## 8. Backup noturno

O workflow **Backup do banco** (`.github/workflows/backup.yml`) roda todo dia às `05:30 UTC`: faz o
`pg_dump`, confere o arquivo, **criptografa antes de sair do GitHub** (AES-256) e envia a um armazenamento
privado. Ele não usa "artefatos" do Actions, porque em repositório público qualquer pessoa os lê.

1. Crie um *bucket* **privado** (R2, B2…) e uma chave de acesso com permissão de escrita.
   Configure no *bucket* a retenção (por exemplo, apagar o que tem mais de 30 dias).
2. Em *Settings > Environments > producao*, crie os segredos:

   | Segredo | O que é |
   |---|---|
   | `DATABASE_URL_BACKUP` | Session pooler do banco de produção |
   | `BACKUP_PASSPHRASE` | senha da criptografia, longa e aleatória. **Guarde uma cópia fora do GitHub** |
   | `BACKUP_S3_BUCKET` | nome do *bucket* |
   | `BACKUP_S3_ENDPOINT` | endereço S3 do provedor |
   | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | chave do *bucket* |

3. *Actions > Backup do banco > Run workflow* para rodar uma vez agora e ver o arquivo aparecer no *bucket*.

Observações: o GitHub **desativa agendamentos de repositórios sem atividade por 60 dias**; se o projeto
ficar parado, reative o workflow. Se faltar algum segredo, o workflow falha com a lista do que falta.

Para fazer um backup manual da sua máquina: `bash scripts/backup.sh` (veja o cabeçalho do script).

## 9. Teste de restauração (critério 8 da spec)

O backup só vale se restaurar. O roteiro está em [`scripts/restaurar-backup.md`](../scripts/restaurar-backup.md).

**Teste realizado em 27/10/2026**, de ponta a ponta, em máquina local com PostgreSQL 18 (banco de origem
com os dados de demonstração):

| Passo | Resultado |
|---|---|
| `scripts/backup.sh` (dump + conferência + criptografia) | arquivo `.dump.gpg` de ~8,8 KB; 12 tabelas no dump; nenhum dump em texto claro sobrou no disco |
| Abrir com a **senha errada** | recusado |
| Abrir com a senha certa e `pg_restore` num banco novo, com `--exit-on-error` | concluído sem erro |
| Contagem de linhas, tabela a tabela | **12 de 12 tabelas idênticas** (49 vagas, 12 mensalistas, 12 contratos, 60 pagamentos, 19 despesas, 3 recorrências…) |
| Soma dos pagamentos e hash dos contratos | idênticos (R$ 13.325,00 nos dois bancos) |
| Proteções do esquema no banco restaurado | RLS ligado em 11 de 11 tabelas; 2 índices únicos parciais; 2 `CHECK` |

**O que esse teste não cobre:** ele usou PostgreSQL local, não o Supabase, e não passou pelo envio ao
armazenamento privado nem pelo agendamento do GitHub. Repita o roteiro com um backup **real** da
homologação (ou da produção) antes de publicar, e registre aqui a data e o resultado.

## 10. Rodar na sua máquina

```bash
npm ci
# .env na raiz: DATABASE_URL e DATABASE_URL_MIGRACAO do seu banco local; DATABASE_URL_TESTE para os testes
npm run migrar -w @estacionafacil/api && npm run semear -w @estacionafacil/api
npm run criar-proprietario -w @estacionafacil/api

npm run dev -w @estacionafacil/api    # API em http://localhost:3001/api
npm run dev -w @estacionafacil/web    # interface em http://localhost:5173  (use "localhost", não 127.0.0.1)
```

Para ver a interface com dados de exemplo, sem API nem banco: `npm run dev:mocks -w @estacionafacil/web`
(login `dono` ou `auxiliar`, senha `teste123`).

Testes: `npm test` (unidade e API; apaga o banco de `DATABASE_URL_TESTE`), `npm run e2e` (roteiro de
aceitação com navegador) e `npm run funcoes` (gera as funções da Netlify em `netlify/functions`).

## 11. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Tela de entrada diz "Sua sessão expirou" | cookie de 12 h de inatividade | entre de novo |
| "Muitas tentativas" no login | 5 erros em 15 minutos | aguarde 15 minutos |
| `/api/saude` dá 500 no site | `DATABASE_URL` ausente ou errada na Netlify | corrija a variável e faça novo *deploy* |
| Migração falha por rede no Actions | URL da conexão direta (IPv6) | use o **Session pooler** (porta 5432) |
| Site "pausado" na Netlify | créditos do mês acabaram | aguarde o mês seguinte ou assine o plano pago |
| Primeira abertura do dia demora | função "fria" (partida a frio) | normal; as seguintes são rápidas |
| Supabase "pausado" | uma semana sem uso no plano gratuito | reative no painel do Supabase |
| Login não funciona localmente | abrindo por `127.0.0.1` | use `http://localhost:5173` |
