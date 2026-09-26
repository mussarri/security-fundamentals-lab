# Vaka Analizi: HTTP Request Smuggling ve Interpretation Differentials

## 1. Neden Çalıştı / Neden Engellendi?

- **Zafiyetli Durumda:** Front-end proxy `Content-Length: 52` başlığına uyarak gövdenin tamamını tek bir istek olarak kabul etmiş ve arka uç sunucusuna iletmiştir. Arka uç ise `Transfer-Encoding: chunked` önceliğine sahip olduğundan `0\r\n\r\n` gördüğü anda ilk isteği sonlandırmış; gövdede kalan `POST /admin/delete-user` metnini bir sonraki HTTP isteğinin başlangıcı olarak yorumlamıştır.
- **Sıkılaştırılmış Durumda:** RFC 7230 Bölüm 3.3.3 uyarınca hem `Content-Length` hem de `Transfer-Encoding` içeren belirsiz istekler doğrudan `400 Bad Request` ile reddedilmiştir.

## 2. Root Cause

Dört temel zafiyet üst sınıfından **Interpretation Differential (Yorum Farklılığı)**. Farklı ağ katmanlarının (Proxy vs. Backend), veri sınırlarını (message boundary) belirleyen başlıkları farklı algoritmalarla çözümlemesi.

## 3. Smuggling Tipleri

- **CL.TE:** Ön yüz `Content-Length`, arka yüz `Transfer-Encoding` okur.
- **TE.CL:** Ön yüz `Transfer-Encoding`, arka yüz `Content-Length` okur.
- **TE.TE:** Her iki taraf da `Transfer-Encoding` destekler ancak başlık obfuscate edilerek (`Transfer-Encoding: xchunked`) taraflardan birinin başlığı görmezden gelmesi sağlanır.

## 4. Remediation (Mimari Çözüm)

1. **HTTP/2 Uçtan Uca (End-to-End HTTP/2):** HTTP/2 ikili (binary framing) paket yapısı kullandığından sınır karmaşasını ortadan kaldırır. (HTTP/2 to HTTP/1 downgrade yapılmamalıdır).
2. **Katı Parser Kuralı (Strict Rejection):** `Content-Length` ve `Transfer-Encoding` aynı anda bulunursa istek anında düşürülmelidir.
3. **Bağlantı Yeniden Kullanımının Kısıtlanması:** Riskli ortamlarda arka uç bağlantı havuzlarının (connection pooling) kullanıcılar arasında paylaşılmaması.

backendServer ve proxyServer dinamik boş portlarda kalkar (ECONNREFUSED riski yok).

İstemci proxy açıldığı anda otomatik bağlanır.

Arka uç terminal logunda:

İlk isteğin (POST /) başarıyla bittiğini,

Masum kullanıcının attığı ikinci istek yerine TCP borusunda bekleyen kaçırılmış isteğin (POST /admin/delete-user) yürütüldüğünü tek akışta göreceksin.
