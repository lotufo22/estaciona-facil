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
