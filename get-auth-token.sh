#!/usr/bin/env bash
# get-auth-token.sh — Mint a Mattermost session token for the Skyramp Testbot.
#
# Workflow:
#   1. Wait for the server to be live (GET /api/v4/system/ping → 200).
#   2. Create the bootstrap sysadmin via POST /api/v4/users (idempotent —
#      a 400 on the second run means the user already exists, which is fine).
#   3. POST /api/v4/users/login with the credentials and capture the `Token`
#      response header. Mattermost returns the session ID there; the body
#      holds the user object.
#   4. Print the bare token to stdout. The Skyramp executor prefixes it
#      according to the workspace.yml authType + authScheme, producing:
#          Authorization: Bearer <token>
#
# Override defaults via env vars:
#   MATTERMOST_HOST            (default: http://localhost:8065)
#   MATTERMOST_ADMIN_USERNAME  (default: sysadmin)
#   MATTERMOST_ADMIN_PASSWORD  (default: Sys@dmin-sample1)
#   MATTERMOST_ADMIN_EMAIL     (default: sysadmin@sample.mattermost.com)
#
# These defaults match e2e-tests/playwright/lib/src/test_config.ts so the same
# admin works for both the testbot and the existing Playwright suite.

set -euo pipefail

HOST="${MATTERMOST_HOST:-http://localhost:8065}"
USERNAME="${MATTERMOST_ADMIN_USERNAME:-sysadmin}"
PASSWORD="${MATTERMOST_ADMIN_PASSWORD:-Sys@dmin-sample1}"
EMAIL="${MATTERMOST_ADMIN_EMAIL:-sysadmin@sample.mattermost.com}"

# ---------- 1. Wait for the server ----------
deadline=$(( $(date +%s) + 300 ))
until curl -sf -o /dev/null "${HOST}/api/v4/system/ping"; do
  if [[ $(date +%s) -ge $deadline ]]; then
    echo "ERROR: Mattermost did not become ready at ${HOST} within 300s" >&2
    exit 1
  fi
  sleep 5
done

# ---------- 2. Create the bootstrap admin (idempotent) ----------
REG_BODY=$(cat <<JSON
{"email":"${EMAIL}","username":"${USERNAME}","password":"${PASSWORD}"}
JSON
)

REG_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "${HOST}/api/v4/users" \
  -H 'Content-Type: application/json' \
  -d "${REG_BODY}" || echo 000)

case "${REG_STATUS}" in
  2??) ;;   # Created on first run
  400) ;;   # Already exists on subsequent runs — expected
  *) echo "WARN: user registration returned HTTP ${REG_STATUS}" >&2 ;;
esac

# ---------- 3. Login and capture the Token response header ----------
TOKEN=""
auth_deadline=$(( $(date +%s) + 120 ))
while [[ -z "${TOKEN}" ]]; do
  if [[ $(date +%s) -ge $auth_deadline ]]; then
    echo "ERROR: Could not obtain Mattermost session token within 120s" >&2
    exit 1
  fi

  TOKEN=$(curl -sf -D - -o /dev/null \
    -X POST "${HOST}/api/v4/users/login" \
    -H 'Content-Type: application/json' \
    -d "{\"login_id\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}" \
    | awk 'BEGIN{IGNORECASE=1} /^Token:[[:space:]]/ { sub(/\r$/,"",$2); print $2; exit }' \
    || true)

  if [[ -z "${TOKEN}" ]]; then
    sleep 3
  fi
done

# ---------- 4. Print the raw token ----------
echo "${TOKEN}"
