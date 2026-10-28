# Restaurar um backup

O backup noturno (`.github/workflows/backup.yml`, que chama `scripts/backup.sh`) gera um arquivo
`estaciona-AAAAMMDD-HHMMSS.dump.gpg`: um dump do PostgreSQL em formato _custom_, **criptografado com
AES-256**. Sem a senha (`BACKUP_PASSPHRASE`) ele não abre. Guarde uma cópia da senha **fora do GitHub**
(gerenciador de senhas ou papel num cofre): se o GitHub e a senha se perderem juntos, os backups viram
lixo.

Faça este roteiro **num banco novo e vazio**, nunca por cima do banco em uso, a menos que você tenha
certeza de que quer substituir tudo.

## O que você precisa

- O cliente do PostgreSQL **na mesma versão do servidor ou mais novo** (`pg_restore`, `psql`, `createdb`).
  Servidor Supabase em 17, cliente 17 ou 18.
- `gpg` (GnuPG).
- O arquivo `.dump.gpg` baixado do armazenamento privado.
- A senha do backup.

## Passo a passo

```bash
# 1. Descriptografar (pede a senha). O resultado é o dump em texto claro: apague-o ao terminar.
gpg --output restaurar.dump --decrypt estaciona-AAAAMMDD-HHMMSS.dump.gpg

# 2. Criar um banco novo (local, para teste; ou um projeto novo do Supabase)
createdb -U postgres estaciona_restaurado

# 3. Restaurar. --exit-on-error para na primeira falha em vez de seguir com um banco incompleto.
pg_restore -U postgres --dbname estaciona_restaurado --no-owner --exit-on-error restaurar.dump

# 4. Apagar o dump em texto claro
rm restaurar.dump
```

Em PowerShell, use `Remove-Item restaurar.dump` no passo 4. Para um banco remoto, troque `-U postgres`
por `--dbname "postgresql://usuario:senha@host:5432/banco"` (use o pooler em modo **sessão**).

## Conferir que deu certo

O `pg_restore` sem erro já é um bom sinal. Para ter certeza, compare o banco restaurado com o original
(quando o original ainda existe) ou, ao menos, olhe se os números fazem sentido:

```sql
SELECT 'mensalistas' AS tabela, count(*) FROM mensalistas
UNION ALL SELECT 'contratos', count(*) FROM contratos
UNION ALL SELECT 'pagamentos', count(*) FROM pagamentos
UNION ALL SELECT 'despesas', count(*) FROM despesas
UNION ALL SELECT 'vagas', count(*) FROM vagas;          -- deve dar 49

-- O Postgres deve ter voltado com as proteções do esquema:
SELECT count(*) FROM pg_tables
 WHERE schemaname = 'public' AND rowsecurity AND tablename <> '_prisma_migrations';   -- RLS ligado
SELECT indexname FROM pg_indexes WHERE indexname LIKE 'contratos_um_ativo%';          -- 2 índices
```

## Usar o banco restaurado no lugar do de produção

1. Pare de usar o sistema (avise quem usa: ninguém deve lançar nada durante a troca).
2. Aponte a variável `DATABASE_URL` do site na Netlify para o banco restaurado.
3. Faça um novo _deploy_ (veja o guia de instalação, "Publicar") para a função pegar a nova variável.
4. Entre no sistema e confira o Painel e a lista de mensalistas.

## Se a senha do backup se perder

Não há como recuperar: a criptografia é feita para isso. Troque o segredo `BACKUP_PASSPHRASE` no GitHub
por uma senha nova **e guarde-a em dois lugares**. Os backups antigos continuam exigindo a senha antiga.
