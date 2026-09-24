## Amaç
Sunucu üzerindeki `.env` ve gizli anahtar dosyalarının `chmod 600` ile korunmasını, farklı UID'lere sahip süreçlerin yetkisiz erişim denemelerinin DAC tarafından nasıl reddedildiğini doğrulamak.

## Adımlar
1. Test dizini ve dosyası oluştur:
   ```bash
   touch /tmp/test-secret.env
   echo "API_KEY=super_secret_123" > /tmp/test-secret.env
İzinleri sıkılaştır:

Bash
chmod 600 /tmp/test-secret.env
ls -la /tmp/test-secret.env
# Beklenen: -rw-------
Başka bir yetkisiz kullanıcı veya container ile okumayı dene (Permission denied).
```bash