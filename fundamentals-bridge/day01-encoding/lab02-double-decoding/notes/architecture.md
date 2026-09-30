# Double URL Decoding & Path Normalization

Reverse Proxy (Nginx) katmanında:
- `location /admin` bloğu ile erişim kısıtlanır.
- Nginx `$request_uri` (ham, decode edilmemiş) veya `$uri` (normalleştirilmiş ve 1 kez decode edilmiş) üzerinde kural işletir.
- İstek backend'e `proxy_pass http://backend:5000$request_uri` şeklinde iletildiğinde ham URI iletilir.
- Eğer Nginx tek kat decode edip engellemezse (`%252e%252e%252f` -> `%2e%2e%2f`), backend (WSGI / Framework) bir kez daha decode eder (`%2e%2e%2f` -> `../`).
- Sonuç: Proxy `/public/` zannederken backend `/admin` route'unu çalıştırır.
