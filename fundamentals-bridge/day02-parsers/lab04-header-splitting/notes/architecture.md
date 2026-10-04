# Header Splitting & Delimiter Inconsistencies

HTTP/1.1 Spesifikasyonu (RFC 7230 / RFC 9112):
- Başlık satırları kesin olarak CRLF (`\r\n`) ile sonlandırılmalıdır.
- Başlık adı ile iki nokta (`:`) arasında boşluk olamaz; iki nokta ile değer arasında isteğe bağlı whitespace bulunabilir.

Ayrıştırıcı Uyuşmazlıkları (Differential Parsing):
1. Bare LF (`\n`) veya Bare CR (`\r`):
   - Bazı modern sunucular katı CRLF ararken, toleranslı ayrıştırıcılar tekil `\n` veya `\r` gördüğünde yeni bir başlık satırı başlatır.
   - Eğer güvenlik filtresi yalnızca `\r\n` arıyorsa, saldırgan `\nSet-Cookie: admin=true` göndererek filtreyi atlatabilir.
2. Delimiter Injection:
   - Başlık değerine enjekte edilen CRLF (`%0d%0a`), ayrıştırıcıya iki ardışık satır sonu sağlarsa (`\r\n\r\n`), başlık bloğu biter ve HTTP Yanıt Gövdesi (Body) başlar.
   - Bu durum HTTP Response Splitting, Cache Poisoning ve XSS ile sonuçlanır.
