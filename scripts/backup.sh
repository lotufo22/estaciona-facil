#!/usr/bin/env bash
# Faz o backup do banco: dump -> confere o dump -> criptografa. NÃO envia a lugar nenhum
# (o envio é feito pelo workflow `.github/workflows/backup.yml`, ou por você, à mão).
#
# Variáveis de ambiente:
#   DATABASE_URL_BACKUP  URL do banco (no Supabase, o pooler em modo sessão)
#   BACKUP_PASSPHRASE    senha da criptografia (guarde-a fora do GitHub também: sem ela o backup não abre)
#   BACKUP_PASTA         pasta de saída (padrão: ./backups)
#
# Imprime, na última linha, o caminho do arquivo criptografado (.dump.gpg).
# Para restaurar, veja scripts/restaurar-backup.md.
set -euo pipefail

: "${DATABASE_URL_BACKUP:?Defina DATABASE_URL_BACKUP}"
: "${BACKUP_PASSPHRASE:?Defina BACKUP_PASSPHRASE}"
PASTA="${BACKUP_PASTA:-./backups}"
mkdir -p "$PASTA"

CARIMBO="$(date -u +%Y%m%d-%H%M%S)"
DUMP="$PASTA/estaciona-$CARIMBO.dump"
CRIPTOGRAFADO="$DUMP.gpg"

# Formato "custom": comprimido e restaurável por partes com pg_restore.
# --no-owner/--no-privileges: o dump não depende dos papéis do banco de origem.
pg_dump --format=custom --no-owner --no-privileges --file "$DUMP" "$DATABASE_URL_BACKUP"

# Um dump vazio ou corrompido não pode virar "backup": confere que o pg_restore consegue lê-lo
# e que ele contém tabelas.
TABELAS="$(pg_restore --list "$DUMP" | grep -cE ' TABLE public ' || true)"
if [ "$TABELAS" -lt 1 ]; then
  echo "O dump não tem nenhuma tabela; abortando." >&2
  rm -f "$DUMP"
  exit 1
fi

# Criptografia simétrica (AES-256) ANTES de o arquivo sair desta máquina. A senha entra por stdin
# (não aparece na lista de processos).
printf '%s' "$BACKUP_PASSPHRASE" | gpg --batch --yes --pinentry-mode loopback \
  --passphrase-fd 0 --symmetric --cipher-algo AES256 --output "$CRIPTOGRAFADO" "$DUMP"
rm -f "$DUMP" # o dump em texto claro não fica no disco

echo "Backup criptografado: $TABELAS tabelas, $(wc -c <"$CRIPTOGRAFADO" | tr -d ' ') bytes" >&2
echo "$CRIPTOGRAFADO"
