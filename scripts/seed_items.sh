#!/usr/bin/env bash
# seed_items.sh — 快速在 Spectra 服务器上批量创建条目
# 用法：./scripts/seed_items.sh [BASE_URL] [EMAIL] [PASSWORD] [COUNT]
#   BASE_URL  服务器地址，默认 http://localhost:3000
#   EMAIL     管理员邮箱，默认 admin@example.com
#   PASSWORD  密码，默认 1234567890
#   COUNT     要创建的条目数，默认 500

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
EMAIL="${2:-admin@example.com}"
PASSWORD="${3:-1234567890}"
COUNT="${4:-500}"

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

# --- 登录 ---
echo "Logging in as $EMAIL ..."
LOGIN_RESP=$(curl -s -c "$COOKIE_JAR" \
    -X POST "$BASE_URL/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if ! echo "$LOGIN_RESP" | grep -q '"success":true'; then
    echo "Login failed: $LOGIN_RESP"
    exit 1
fi
echo "Login OK."

# --- 批量创建 ---
TYPES=("Link" "Code")
LINK_TARGETS=(
    "https://example.com"
    "https://github.com"
    "https://developer.mozilla.org"
    "https://docs.rs"
    "https://crates.io"
)
CODE_SNIPPETS=(
    'fn main() { println!("Hello, Spectra!"); }'
    'const greet = (name) => \`Hello, \${name}!\`;'
    'print("Hello from Python")'
    'echo "Hello from shell"'
    'console.log("seed item")'
)

SUCCESS=0
FAIL=0

for i in $(seq 1 "$COUNT"); do
    # 每 50 条打印一次进度
    if (( i % 50 == 0 )); then
        echo "Progress: $i / $COUNT  (ok=$SUCCESS fail=$FAIL)"
    fi

    TYPE="Link"

    if [[ "$TYPE" == "Link" ]]; then
        TARGET="${LINK_TARGETS[$(( RANDOM % ${#LINK_TARGETS[@]} ))]}"
        BODY="{\"item_type\":\"Link\",\"data\":\"$TARGET\",\"expires_at\":null,\"extra_data\":null,\"max_visits\":0,\"password\":null,\"encryption\":false}"
    else
        SNIPPET="${CODE_SNIPPETS[$(( RANDOM % ${#CODE_SNIPPETS[@]} ))]}"
        # extra_data 用于语言标识
        LANGS=("rust" "javascript" "python" "bash" "typescript")
        LANG="${LANGS[$(( RANDOM % ${#LANGS[@]} ))]}"
        # JSON 转义单引号/反引号等由 printf 处理
        BODY=$(printf '{"item_type":"Code","data":"%s","expires_at":null,"extra_data":"%s","max_visits":0,"password":null,"encryption":false}' \
            "$(echo "$SNIPPET" | sed 's/"/\\"/g')" "$LANG")
    fi

    RESP=$(curl -s -b "$COOKIE_JAR" \
        -X POST "$BASE_URL/api/item/__RANDOM__" \
        -H "Content-Type: application/json" \
        -d "$BODY")

    if echo "$RESP" | grep -q '"success":true'; then
        (( SUCCESS++ )) || true
    else
        (( FAIL++ )) || true
        # 仅在前 5 次失败时打印详情，避免刷屏
        if (( FAIL <= 5 )); then
            echo "  FAIL at item $i: $RESP"
        fi
    fi
done

echo ""
echo "Done: $SUCCESS created, $FAIL failed (total requested: $COUNT)"
