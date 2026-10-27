# @estacionafacil/api

API da Fase 1 (Express 5 + Prisma 7 + PostgreSQL). `criarApp()` monta o app sem abrir porta; o servidor local (`src/servidor.ts`) e, mais adiante, a função da Netlify usam a mesma função.

## Banco de testes

Os testes rodam contra um Postgres de verdade e **apagam os dados** dele. Use um banco só para isso:

```
createdb -U postgres estaciona_teste
```

Depois crie o `.env` na raiz do repositório (ele é ignorado pelo Git; o modelo é o `.env.example`):

```
DATABASE_URL_TESTE=postgresql://USUARIO:SENHA@localhost:5432/estaciona_teste
```

Os testes se recusam a rodar se o nome do banco não contiver "test". Antes do primeiro teste, as migrações são aplicadas sozinhas.

Sem um Postgres instalado, o `docker-compose.yml` da raiz sobe um (porta 5433).

## Comandos

```
npm test -w @estacionafacil/api            # testes (gera o cliente do Prisma antes)
npm run typecheck -w @estacionafacil/api
npm run dev -w @estacionafacil/api         # servidor local em http://localhost:3001/api
npm run migrar -w @estacionafacil/api      # aplica as migrações em DATABASE_URL_MIGRACAO
npm run semear -w @estacionafacil/api      # cria as 49 vagas
```

## Migrações: o que o Prisma não gera

O esquema (`prisma/schema.prisma`) não expressa tudo. Ficam escritos à mão no fim da migração `20261027120000_base_inicial`:

- no máximo um contrato ativo por veículo (placa) e por vaga (índices únicos parciais);
- `CHECK` de valor maior que zero e de dia do mês entre 1 e 31;
- `ENABLE ROW LEVEL SECURITY` em todas as tabelas, sem nenhuma política.

O Prisma não conhece esses itens, mas na versão 7.10.1 o `prisma migrate diff` não propõe removê-los (conferido contra o banco, com resultado vazio). Mesmo assim, ao criar uma migração nova, **leia o SQL gerado** antes de aplicar. Tabelas novas precisam do `ENABLE ROW LEVEL SECURITY` na própria migração; o teste `banco.test.ts` falha se alguma ficar sem.

## O cliente do Prisma

O cliente é gerado em `generated/prisma` (ignorado pelo Git) por `prisma generate`, que roda sozinho antes de `test` e `typecheck`. O Prisma 7 não carrega o `.env` por conta própria; `prisma.config.ts` e `src/ambiente.ts` cuidam disso.

## Autenticação

- **Primeiro usuário:** não existe senha padrão. Com o banco de desenvolvimento criado (`DATABASE_URL` no `.env`), aplique as migrações e crie o usuário, que o script pede a senha na hora (mínimo de 10 caracteres, sem aparecer na tela):

  ```
  npm run migrar -w @estacionafacil/api
  npm run criar-proprietario -w @estacionafacil/api
  npm run criar-proprietario -w @estacionafacil/api -- --perfil=auxiliar
  ```

- **Senhas:** hash `argon2id`, com sal. Login sem diferenciar maiúsculas de minúsculas.
- **Sessão:** guardada no Postgres (tabela `sessoes`), então "Sair" a invalida de verdade. O cookie `estaciona_sessao` é `HttpOnly`, `Secure` e `SameSite=Lax`, e o banco guarda só o hash do token. A sessão expira depois de 12 horas **sem uso**; cada uso renova o prazo.
- **CSRF:** toda requisição que altera dados (POST, PATCH, PUT, DELETE) precisa do cabeçalho `X-Estaciona-App: 1`, inclusive o login. Sem ele, 403.
- **Permissões:** `exigirLogin` (401) e `exigirPerfil(...)` (403) em cada rota; o front só esconde as abas por conforto. `test/permissoes.test.ts` tem a matriz das rotas da spec, e cada tarefa de API acrescenta as suas.

### Limite de tentativas de login

5 falhas a cada 15 minutos, contadas na tabela `tentativas_login` (e não na memória, porque a função serverless pode ter várias instâncias). Decisões:

- A contagem é **por par login + IP**. Uma pessoa errando a senha não trava o login para os outros IPs, e quem erra com um login não trava os demais.
- **Só falhas contam**, e entrar com a senha certa zera a contagem do par. Quem está bloqueado não gera novas falhas, então o bloqueio não se prolonga sozinho.
- O 429 traz `Retry-After` em segundos.
- Login inexistente e usuário desativado dão a mesma resposta que senha errada, e quase no mesmo tempo (o servidor confere a senha contra um hash falso; numa medição informal, 60 ms contra 56 ms).
- **O IP vem de `req.ip`.** Atrás de um proxy, o Express só o enxerga direito com `trust proxy` configurado; sem isso todos aparecem com o IP do proxy e o limite vale por login. A configuração para a Netlify fica para a tarefa de empacotamento.
- Limitação conhecida: não há limite por IP sozinho, então um mesmo IP pode testar uma senha em muitos logins diferentes.
