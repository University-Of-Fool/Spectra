#!/usr/bin/env bash
# seed_users.sh — 批量创建 Spectra 用户
#
# 用法：
#   ./scripts/seed_users.sh [BASE_URL] [ADMIN_EMAIL] [ADMIN_PASSWORD] [COUNT] [PREFIX]
#
# 参数（可选）：
#   BASE_URL       服务器地址，默认 http://localhost:3000
#   ADMIN_EMAIL    管理员邮箱，默认 admin@example.com
#   ADMIN_PASSWORD 管理员密码，默认 password
#   COUNT          创建数量，默认 20
#   PREFIX         用户名前缀，默认 user

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
ADMIN_EMAIL="${2:-admin@example.com}"
ADMIN_PASSWORD="${3:-1234567890}"
COUNT="${4:-20}"
PREFIX="${5:-user}"

if ! [[ "$COUNT" =~ ^[0-9]+$ ]]; then
    echo "COUNT must be a non-negative integer"
    exit 1
fi

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "Logging in as $ADMIN_EMAIL ..."
LOGIN_RESP=$(curl -s -c "$COOKIE_JAR" \
    -X POST "$BASE_URL/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

if ! echo "$LOGIN_RESP" | grep -q '"success":true'; then
    echo "Login failed: $LOGIN_RESP"
    exit 1
fi
echo "Login OK"

SUCCESS=0
FAIL=0
TS="$(date +%s)"

for i in $(seq 1 "$COUNT"); do
    if (( i % 10 == 0 )); then
        echo "Progress: $i / $COUNT  (ok=$SUCCESS fail=$FAIL)"
    fi

    NAME="${PREFIX}_$(printf "%03d" "$i")_${TS}"
    EMAIL="${NAME}@spectra.dummy"
    PASSWORD="${PREFIX}_pass_$(printf "%03d" "$i")"

    BODY=$(printf '{"name":"%s","email":"%s","password":"%s","descriptor":["Code","File","Link"],"avatar":null}' \
        "$NAME" "$EMAIL" "$PASSWORD")

    RESP=$(curl -s -b "$COOKIE_JAR" \
        -X POST "$BASE_URL/api/user" \
        -H "Content-Type: application/json" \
        -d "$BODY")

    if echo "$RESP" | grep -q '"success":true'; then
        (( SUCCESS++ )) || true
    else
        (( FAIL++ )) || true
        if (( FAIL <= 5 )); then
            echo "  FAIL at user $i: $RESP"
        fi
    fi
done

echo ""
echo "Done: $SUCCESS created, $FAIL failed (requested: $COUNT)"
