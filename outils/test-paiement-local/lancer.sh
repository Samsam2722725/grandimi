#!/usr/bin/env bash
# Test du parcours de paiement sur une copie LOCALE : Postgres jetable,
# serveur Go du depot, webhooks Whop signes avec un secret local.
# Ne touche ni Supabase, ni Whop, ni Render.
#
#   bash outils/test-paiement-local/lancer.sh
#
# schema-base.sql reconstitue les tables users, subscriptions et
# predictions, qui n'existent que dans Supabase (aucune migration ne les
# cree) ; les migrations du depot sont appliquees par-dessus.
set -euo pipefail
cd "$(dirname "$0")/../.."
ICI=outils/test-paiement-local
PGB=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
DONNEES=/var/lib/postgresql/grandimi-test-$$
TRAVAIL=$(mktemp -d)

su postgres -c "$PGB/initdb -D $DONNEES -A trust -U postgres >/dev/null && $PGB/pg_ctl -D $DONNEES -o '-p 5433 -k /tmp' -l $DONNEES.log start >/dev/null"
trap 'kill $(cat $TRAVAIL/pid) 2>/dev/null; su postgres -c "$PGB/pg_ctl -D $DONNEES stop -m fast >/dev/null"; rm -rf $DONNEES $DONNEES.log $TRAVAIL' EXIT
sleep 2
P="psql -h /tmp -p 5433 -U postgres -q"
$P -c "create database grandimi"
$P -d grandimi -f $ICI/schema-base.sql
for f in migrations/0*.sql; do $P -d grandimi -f "$f" >/dev/null; done

go build -o $TRAVAIL/server ./cmd/server
DATABASE_URL="postgres://postgres@localhost:5433/grandimi?sslmode=disable&host=/tmp" \
AUTH_SECRET=secret-local-de-test-0123456789abcdef \
WHOP_WEBHOOK_SECRET=whsec_local PORT=8099 \
WHOP_PLAN_ID_M1=plan_M1 WHOP_PLAN_ID_M3=plan_M3 WHOP_PLAN_ID_VIE=plan_VIE \
WHOP_PLAN_ID_M1_NORMAL=plan_M1N WHOP_PLAN_ID_M3_NORMAL=plan_M3N WHOP_PLAN_ID_VIE_NORMAL=plan_VIEN \
  $TRAVAIL/server > $TRAVAIL/server.log 2>&1 &
echo $! > $TRAVAIL/pid
sleep 2

python3 $ICI/scenarios.py || { echo; echo "--- journal du serveur ---"; grep -a "\[whop\]\|\[paiement\]\|\[montee\]" $TRAVAIL/server.log | tail -20; exit 1; }
