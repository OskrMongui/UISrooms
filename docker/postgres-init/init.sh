#!/bin/bash
set -e

# init.sh
# This script runs inside the official postgres image initialization phase.
# It ensures that the database named in $POSTGRES_DB exists. It will only
# run when the database cluster is first initialized (i.e., when the data
# directory is empty). It is safe to include and will skip creation if the
# database already exists.

echo ">>> postgres-init: checking environment variables"
echo "POSTGRES_DB=${POSTGRES_DB:-<not set>}"
echo "POSTGRES_USER=${POSTGRES_USER:-<not set>}"

if [ -z "${POSTGRES_DB}" ]; then
   echo "POSTGRES_DB is not set, skipping initialization script." >&2
   exit 0
fi

echo ">>> postgres-init: ensuring database \"${POSTGRES_DB}\" exists"

# The official postgres image runs init scripts while a temporary server is
# available. To be robust, try connecting as POSTGRES_USER first; if that
# fails (user may not yet exist), fall back to the 'postgres' superuser.
try_psql() {
   psql -v ON_ERROR_STOP=1 --username "$1" --dbname "postgres" -c "$2" >/dev/null 2>&1
   return $?
}

SQL_CHECK="SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}';"

if try_psql "$POSTGRES_USER" "$SQL_CHECK"; then
   echo ">>> postgres-init: database ${POSTGRES_DB} already exists (checked as ${POSTGRES_USER}), skipping creation"
else
   echo ">>> postgres-init: check with ${POSTGRES_USER} failed or DB not found; trying as postgres superuser"
   if try_psql "postgres" "$SQL_CHECK"; then
      echo ">>> postgres-init: database ${POSTGRES_DB} already exists (checked as postgres), skipping creation"
   else
      echo ">>> postgres-init: database ${POSTGRES_DB} not found, creating now as postgres superuser..."
      psql -v ON_ERROR_STOP=1 --username "postgres" --dbname "postgres" -c "CREATE DATABASE \"${POSTGRES_DB}\";"
   fi
fi

echo ">>> postgres-init: done"
