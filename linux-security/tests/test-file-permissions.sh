#!/usr/bin/env bash
set -euo pipefail

TEST_FILE="/tmp/sec_test_file.env"
echo "SECRET_TOKEN=xyz987" > "$TEST_FILE"
chmod 600 "$TEST_FILE"

PERMS=$(stat -c "%a" "$TEST_FILE" 2>/dev/null || stat -f "%Lp" "$TEST_FILE") #bu komut, dosya izinlerini kontrol eder ve hem Linux hem de macOS sistemlerinde çalışacak şekilde uyarlanmıştır. Linux'ta `stat -c "%a"` kullanılırken, macOS'ta `stat -f "%Lp"` kullanılır.

if [ "$PERMS" = "600" ]; then
    echo "[+] SUCCESS: File permission is correctly locked to 600 (Owner read/write only)."
else
    echo "[-] FAILED: Insecure file permission: $PERMS"
    rm -f "$TEST_FILE"
    exit 1
fi

rm -f "$TEST_FILE"
