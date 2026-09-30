#!/usr/bin/env bash
set -euo pipefail

echo "[*] Gün 6: Multi-Tenant İzolasyonu, Nested IDOR ve RBAC Doğrulama Testi"

node server.js > /dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
sleep 1

API_URL="http://127.0.0.1:3021"

# Kimlik Belirteçleri:
# Bob -> Tenant B (Member)
# Alice -> Tenant A (Admin)
BOB_TOKEN="bob-token"
ALICE_TOKEN="alice-token"

echo "[*] 1. Test: Zafiyetli uç noktada Nested BOLA / Tenant Aşırtma..."
# Bob kendi tenant ve project URL yolunu kullanıyor, ancak başka tenant'ın doküman ID'sini (doc-alpha-secret) veriyor:
VULN_RESP=$(curl -s -H "Authorization: Bearer $BOB_TOKEN" \
  "$API_URL/api/vulnerable/tenants/tenant-b/projects/proj-b1/documents/doc-alpha-secret")

if echo "$VULN_RESP" | grep -q "Kritik Finansal Veriler"; then
    echo "[!] ZAFİYET TESPİT EDİLDİ: Bob (Tenant B), Alice'in (Tenant A) gizli dokümanını okudu!"
else
    echo "[-] Beklenen zafiyet davranışı alınamadı."
    exit 1
fi

echo "[*] 2. Test: Sıkılaştırılmış uç noktada Nested IDOR engellemesi..."
HARD_RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $BOB_TOKEN" \
  "$API_URL/api/hardened/tenants/tenant-b/projects/proj-b1/documents/doc-alpha-secret")

if [ "$HARD_RESP_CODE" -eq 404 ]; then
    echo "[+] BAŞARILI: Çapraz kiracı dokümanı 404 Not Found ile izole edildi (Scope Chaining devrede)."
else
    echo "[-] HATA: Kiracı izolasyonu aşıldı! HTTP Kodu: $HARD_RESP_CODE"
    exit 1
fi

echo "[*] 3. Test: Dikey Yetki (BFLA) denetimi - Standart üyenin (Bob) DELETE isteği..."
BFLA_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "Authorization: Bearer $BOB_TOKEN" \
  "$API_URL/api/hardened/tenants/tenant-b/projects/proj-b1/documents/doc-beta-public")

if [ "$BFLA_CODE" -eq 403 ]; then
    echo "[+] BAŞARILI: Standart üyenin silme yetkisi 403 Forbidden ile engellendi (BFLA Koruması)."
else
    echo "[-] HATA: Dikey yetki kısıtı çalışmadı! HTTP Kodu: $BFLA_CODE"
    exit 1
fi

echo "[*] 4. Test: Meşru Admin (Alice) kendi dokümanını okuyor..."
ALICE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ALICE_TOKEN" \
  "$API_URL/api/hardened/tenants/tenant-a/projects/proj-a1/documents/doc-alpha-secret")

if [ "$ALICE_CODE" -eq 200 ]; then
    echo "[+] BAŞARILI: Meşru admin erişimi sorunsuz çalıştı (HTTP 200)."
else
    echo "[-] HATA: Meşru erişim başarısız! HTTP Kodu: $ALICE_CODE"
    exit 1
fi

echo "[+] Gün 6 Multi-Tenancy ve Yetkilendirme testleri başarıyla geçti."
