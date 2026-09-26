#!/usr/bin/env bash
set -euo pipefail
# set -euo pipefail, bash betiğinde hata ayıklamayı ve güvenliği artırmak için kullanılan bir ayardır.

echo "[*] Gün 3: SOP, CORS Güvenliği ve Çerez İzolasyonu Testi"

node   labs/server.js > /dev/null 2>&1 &
# API ve Saldırgan sunucuları başlat, dev/null nedir ? 
# dev/null, Unix sistemlerinde özel bir dosyadır ve genellikle "boş" veya "hiçbir şey" anlamına gelir. Çıkışları /dev/null'a yönlendirmek, çıktının terminale yazdırılmasını engeller ve sessiz bir şekilde çalışmasını sağlar. 2>&1 ise standart hata çıktısını (stderr) standart çıkışa (stdout) yönlendirir, böylece her iki tür çıktı da /dev/null'a gönderilir ve terminalde görünmez.
SERVER_PID=$!
trap 'kill $SERVER_PID > /dev/null 2>&1 || true' EXIT
# trap komutu, belirli bir sinyal alındığında veya betik sona erdiğinde belirtilen komutları çalıştırmak için kullanılır. Bu durumda, EXIT sinyali alındığında (betik sona erdiğinde), sunucu sürecini (SERVER_PID) öldürmek için kill komutu çalıştırılır. > /dev/null 2>&1 || true kısmı, kill komutunun çıktısını bastırır ve eğer süreç zaten bitmişse hata vermemesini sağlar.
sleep 1

API_URL="http://127.0.0.1:3017"
ATTACKER_ORIGIN="http://localhost:3018"
TRUSTED_ORIGIN="http://localhost:3017"

echo "[*] 1. Test: Zafiyetli uç noktada Arbitrary Origin yansıması..."
VULN_RESP_HEADERS=$(curl -s -I -H "Origin: $ATTACKER_ORIGIN" "$API_URL/api/vulnerable-data")

if echo "$VULN_RESP_HEADERS" | grep -qi "Access-Control-Allow-Origin: $ATTACKER_ORIGIN" && \
   echo "$VULN_RESP_HEADERS" | grep -qi "Access-Control-Allow-Credentials: true"; then
    echo "[!] ZAFİYET DOĞRULANDI: Saldırgan origin'ine kimlik doğrulamalı izin verildi!"
else
    echo "[-] Beklenen zafiyetli davranış alınamadı."
    exit 1
fi

echo "[*] 2. Test: Sıkılaştırılmış uç noktada yetkisiz Origin engellemesi..."
HARD_RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: $ATTACKER_ORIGIN" "$API_URL/api/hardened-data")
# HTTP durum kodunu almak için curl komutu kullanılır. -s sessiz modda çalıştırır, -o /dev/null çıktıyı bastırır ve -w "%{http_code}" HTTP durum kodunu yazdırır. Bu sayede sadece HTTP durum kodu alınır ve değişkene atanır.

if [ "$HARD_RESP_CODE" -eq 403 ]; then
    echo "[+] BAŞARILI: Yetkisiz Origin HTTP 403 ile reddedildi."
else
    echo "[-] HATA: Yetkisiz origin engellenemedi! HTTP Kodu: $HARD_RESP_CODE"
    exit 1
fi

echo "[*] 3. Test: Sıkılaştırılmış uç noktada Preflight OPTIONS doğrulaması..."
 
PREFLIGHT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: $TRUSTED_ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  "$API_URL/api/hardened-data")

if [ "$PREFLIGHT_CODE" -eq 204 ]; then
    echo "[+] BAŞARILI: Meşru Origin için Preflight OPTIONS onaylandı (HTTP 204)."
else
    echo "[-] HATA: Preflight isteği başarısız! HTTP Kodu: $PREFLIGHT_CODE"
    exit 1
fi

echo "[+] Gün 3 SOP & CORS testleri başarıyla tamamlandı."
