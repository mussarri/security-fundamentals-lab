# Vaka Analizi: L4-L7 Paket Analizi (DNS, TCP 3-Way Handshake ve TLS 1.3)

## 1. Neden İncelendi?

Web güvenliğindeki pek çok zafiyet (SSRF, DNS Rebinding, Man-in-the-Middle, Session Hijacking), uygulama seviyesinden önce işletim sistemi ağ yığınında (L2-L4) şekillenir. Ağ katmanındaki paket bayraklarını ve el sıkışma aşamalarını okuyamayan bir güvenlik mühendisi, zafiyetin kök nedenini tam olarak anlayamaz.

## 2. Temel Kavramlar ve Paket Anatomisi

### A. TCP 3-Way Handshake

1. **SYN (Synchronize):** İstemci rastgele bir Sequence Number (`ISN_c`) belirler. Bağlantı istek bayrağıdır.
2. **SYN-ACK:** Sunucu isteği onaylar (`Ack = ISN_c + 1`) ve kendi Sequence Number'ını (`ISN_s`) döner.
3. **ACK (Acknowledge):** İstemci sunucunun dizisini onaylar (`Ack = ISN_s + 1`). Bağlantı kurulur (ESTABLISHED).

### B. TLS 1.2 vs TLS 1.3 Farkı

- **TLS 1.2:** 2 tam RTT (Round Trip Time) el sıkışma süresi gerektirir. Sertifika ve extension'lar şifrelenmeden açık metin gider.
- **TLS 1.3:** 1 RTT (veya 0-RTT resumption) süresine indirilmiştir. `ClientHello` haricindeki neredeyse tüm handshake paketleri (Sertifika, Extensions) şifrelenir. Güvensiz algoritmalar (MD5, SHA-1, RC4, DES, RSA key exchange) tamamen kaldırılmıştır; yalnızca Ephemeral Diffie-Hellman (DHE/ECDHE) zorunludur (Forward Secrecy).

### C. SNI (Server Name Indication) Sızıntısı

TLS el sıkışması IP adresi üzerinden başlar ancak tek bir IP'de birden fazla alan adı (Virtual Host) barınabilir.

- İstemci `ClientHello` paketinin içine bağlanmak istediği alan adını (`SNI`) **açık metin** olarak yazar.
- **Güvenlik Çıkarımı:** Ağ dinleyicisi (ISP, saldırgan, güvenlik duvarı) şifreli trafiğin içeriğini göremese bile kullanıcının hangi siteye bağlandığını SNI üzerinden net olarak okur. Bunu engellemek için modern standart **ECH (Encrypted Client Hello)**'dur.

## 3. Subnetting ve CIDR Notasyonu

- `/24` (255.255.255.0): 256 IP (254 kullanılabilir host). Klasik ofis/yerel ağ.
- `/16` (255.255.0.0): 65,536 IP. Büyük kurumsal ağlar ve bulut VPC blokları.
- `/32`: Tek bir host IP'si (Örn: `169.254.169.254/32`).
- **RFC 1918 Özel Bloklar:** `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. Bu bloklar internete doğrudan yönlendirilemez; NAT (Network Address Translation) gerektirir.

## 4. Savunma ve Doğrulama

- Ağ çıkış kontrollerinde (Egress Filtering) sadece port değil, CIDR bazlı kısıtlama zorunludur.
- Servislerin dışarıya açtığı portlarda eski TLS sürümleri (TLS 1.0, 1.1) tamamen devre dışı bırakılmalıdır.

Kısa ve net gerçek şudur: Express bir ağ sunucusu (web server) değildir; sadece gelen HTTP isteklerini yöneten bir yönlendirme ve middleware katmanıdır.

Aşağıdaki şema Express'in nerede durduğunu özetler:

Plaintext
[ Tarayıcı / İstemci ]
│
▼ (Tel / Ağ)
┌────────────────────────────────────────────────────────┐
│ 1. net.Socket (rawSocket) ──> L4: TCP Handshake │
├────────────────────────────────────────────────────────┤
│ 2. tls.TLSSocket ──> L7: TLS 1.3 / Şifre Çözme │ Node.js Çekirdeği
├────────────────────────────────────────────────────────┤
│ 3. http.Server ──> L7: HTTP Parser (\r\n) │
└───────────────────────────┬────────────────────────────┘
│ (req, res nesneleri üretilir)
▼
┌────────────────────────────────────────────────────────┐
│ 4. Express.js ──> Router, Middleware, JSON │ Uygulama Katmanı
└────────────────────────────────────────────────────────┘
Express Kodunda Bunu Nasıl Görürsün?
Klasik bir Express uygulamasında genellikle şu iki satırı yazarsın:

```JavaScript
const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
res.json({ user: 'Ahmet' });
});

app.listen(3000);
```

Arka planda app.listen(3000) çağrıldığında Express aslında şunu yapar:

```JavaScript
// Express kaynak kodundaki gerçek karşılığı:
const http = require('http');
const server = http.createServer(app); // 'app' aslında sadece bir callback fonksiyonudur!
server.listen(3000);
```

Ve o http.createServer ise arka planda Node.js'in net modülünü çağırarak bir net.Server (yani ham TCP soket dinleyicisi) başlatır.

HTTPS Kullandığında tlsSocket Nereye Oturur?
Express projesinde SSL/TLS terminasyonunu doğrudan Node.js içinde yapmak istediğinde https modülünü devreye sokarsın:

```JavaScript
const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();

const options = {
key: fs.readFileSync('server.key'),
cert: fs.readFileSync('server.crt')
};

// Burada Express'i HTTPS sunucusuna bağlıyorsun:
const server = https.createServer(options, app);
server.listen(443);
```

Bu kod çalıştığında akış sırasıyla şöyle işler:

net Katmanı: 443 portuna bir TCP SYN paketi gelir. rawSocket bağlantıyı kabul eder (TCP Handshake tamamlanır).

tls Katmanı: https.createServer, gelen bu rawSocket'i otomatik olarak bir tlsSocket nesnesi ile sarmalar. İstemciyle TLS 1.3 el sıkışması yapar.

http Katmanı: tlsSocket üzerinden şifresi çözülmüş ham HTTP metni (GET /api/users HTTP/1.1...) akar. Node.js'in C/C++ HTTP parser'ı bunu okur ve JavaScript nesnelerine (req, res) dönüştürür.

Express Katmanı: Express bu req ve res nesnelerini alır, yazdığın middleware'lerden ve rotalardan (app.get('/api/users')) geçirir.

Express İçinden Bu Soketlere Erişebilir misin?
Evet. Express route handler'ı içindeki req nesnesi, doğrudan alttaki soketlere referans taşır:

```JavaScript
app.get('/debug-socket', (req, res) => {
// req.socket aslında doğrudan o TLSSocket (veya raw net.Socket) nesnesidir!
const socket = req.socket;

console.log("İstemci IP/Port:", socket.remoteAddress, socket.remotePort);
console.log("Kullanılan Protokol:", socket.getProtocol ? socket.getProtocol() : "Düz HTTP");
console.log("Cipher Suite:", socket.getCipher ? socket.getCipher().name : "Şifreleme Yok");
console.log("SNI (Hangi domaine gelindi?):", socket.servername);

res.send("Soket incelendi.");
});
```

Özet: Express ile yazdığın bir controller'da req.body okurken, o verinin sana ulaşabilmesi için en altta net (rawSocket) baytları taşımış, tls (tlsSocket) şifreyi çözmüş, http başlıkları ayrıştırmış ve hazır bir nesne olarak Express'e teslim etmiştir.
