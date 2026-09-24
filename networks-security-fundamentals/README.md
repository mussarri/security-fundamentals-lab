# Week 02: Networking Fundamentals & Packet Analysis

This module covers network primitives across Transport Layer (Layer 4) and Application Layer (Layer 7), operating system kernel network stack behaviors, firewall filtering dynamics (`DROP` vs `REJECT`), and cryptographic transitions (TLS 1.3 vs Plaintext).

---

## 1. Core Networking Invariants

- **TCP 3-Way Handshake Synchronization:**
  - **SYN (`[S]`):** Client initiates synchronization with an Initial Sequence Number ($ISN_{client}$). Length is 0; no application data travels until state transition completes.
  - **SYN-ACK (`[S.]`):** Server acknowledges by responding with $Ack = ISN_{client} + 1$ and supplies its own $ISN_{server}$.
  - **ACK (`[.]`):** Client completes transition to `ESTABLISHED` by acknowledging $Ack = ISN_{server} + 1$.

- **Closed Port Kernel Behavior (`RST`):**
  - When a TCP SYN hits an active network stack without an application in `LISTEN` state, the kernel immediately generates a `RST-ACK` (`Flags [R.]`) with $Win=0$.
  - Port scanners identify `Closed` ports instantly ($< 1$ ms) due to this active kernel refusal.

- **Firewall Dynamics (`REJECT` vs `DROP`):**
  - **`REJECT` (`--reject-with tcp-reset`):** Explicit refusal via kernel RST packet. Scan duration remains negligible ($< 1$ ms).
  - **`DROP` (Blackhole):** Silent discard. The client undergoes exponential retransmissions until socket timeout ($~2000$ ms).
  - **Product Security Impact:** Enforcing `DROP` at edge infrastructure dramatically increases adversary reconnaissance duration and cost.

- **Layer 7 Plaintext Vulnerabilities:**
  - Unencrypted protocols (HTTP) transmit headers directly across raw TCP segments.
  - Local processes with `CAP_NET_RAW` can passively sniff authentication secrets (`Authorization: Bearer <TOKEN>`) using ASCII packet decodes (`tcpdump -A`).

- **DNS & UDP 53 Mechanics:**
  - UDP is connectionless; requests carry a 16-bit **Transaction ID** ($0-65535$) to correlate queries with answers.
  - **Vulnerabilities:** Susceptible to Cache Poisoning (Kaminsky attack via transaction ID/port prediction) and DNS Amplification DDoS due to large request-to-response amplification ratios. Mitigated by EDNS0 Cookies and DNSSEC.

- **TLS 1.3 Handshake Dynamics:**
  - Replaces plaintext Layer 7 transmission immediately following TCP Handshake.
  - **ClientHello:** Advertises supported cipher suites and provides Diffie-Hellman key share parameters.
  - **ServerHello:** Selects the cryptographic algorithm and returns server key share. Unlike TLS 1.2 (2-RTT), TLS 1.3 achieves encryption in 1-RTT, encrypts certificates on the wire, and enforces Perfect Forward Secrecy (PFS).

---

## 2. Experimental Verification & Artifacts

| Test Case              | Tooling              | Protocol Signature                                 | Latency / Behavior                   |
| ---------------------- | -------------------- | -------------------------------------------------- | ------------------------------------ |
| **TCP Handshake**      | `tcpdump`, `nc`      | `[S]` $\to$ `[S.]` $\to$ `[.]`                     | Real-time connection establishment   |
| **Closed Port**        | `nc`, `tcpdump`      | `Flags [R.]`, $Win=0$                              | Sub-millisecond kernel rejection     |
| **Firewall REJECT**    | `iptables`, `nc`     | Netfilter generated `[R.]`                         | Instant termination ($\approx 1$ ms) |
| **Firewall DROP**      | `iptables`, `nc`     | Packet silence $\to$ Retransmit $\to$ Timeout      | Blocking delay ($\approx 2000$ ms)   |
| **L7 Cleartext Token** | `curl`, `tcpdump -A` | Plaintext `Authorization: Bearer` exposed          | Passive credential sniffing          |
| **DNS Resolution**     | `dig`, `tcpdump -vv` | UDP 53 `19491+ [1au] A?` $\to$ `19491$`            | Transaction ID validation            |
| **TLS 1.3 Handshake**  | `curl`, `tcpdump`    | `ClientHello` (517 B) $\to$ `ServerHello` (3991 B) | 1-RTT cryptographic transition       |

---

## 3. Included Automation Scripts

- `scripts/capture-handshake.sh`: Automates TCP 3-way handshake verification and captures kernel closed-port RST responses.
- `scripts/test-firewall-behavior.sh`: Evaluates iptables filtering policies, benchmarking `REJECT` against `DROP` timeouts.
- `scripts/sniff-http-payload.sh`: Simulates passive credential harvesting over unencrypted HTTP streams.
- `scripts/trace-dns-transaction.sh`: Inspects UDP 53 packets, demonstrating Transaction ID matching and EDNS0 security flags.
- `scripts/trace-tls-handshake.sh`: Traces the transition from TCP Layer 4 to TLS 1.3 encrypted application records.# Week 02: Networking Fundamentals & Packet Analysis

This module covers network primitives across Transport Layer (Layer 4) and Application Layer (Layer 7), operating system kernel network stack behaviors, firewall filtering dynamics (`DROP` vs `REJECT`), and cryptographic transitions (TLS 1.3 vs Plaintext).

---

## 1. Core Networking Invariants

- **TCP 3-Way Handshake Synchronization:**
  - **SYN (`[S]`):** Client initiates synchronization with an Initial Sequence Number ($ISN_{client}$). Length is 0; no application data travels until state transition completes.
  - **SYN-ACK (`[S.]`):** Server acknowledges by responding with $Ack = ISN_{client} + 1$ and supplies its own $ISN_{server}$.
  - **ACK (`[.]`):** Client completes transition to `ESTABLISHED` by acknowledging $Ack = ISN_{server} + 1$.

- **Bayrak,tcpdump Kodu,Tam Adı,Ne İşe Yarar?**
  - **SYN,S,Synchronize,Bağlantı başlatma ve Sequence numaralarını eşitleme.**
  - **ACK,. (nokta),Acknowledgment,Gelen veriyi/paketi onaylama.**
  - **PSH,P,Push,"Veriyi tamponda (buffer) bekletme, anında uygulamaya ilet."**
  - **RST,R,Reset,Bağlantıyı anında zorla kopar veya reddet (örn. kapalı port).**
  - **FIN,F,Finish,"Bağlantıyı kibarca/düzgünce sonlandır (""Benim gönderecek verim bitti"")."**
  - **URG,U,Urgent,Acil veri; paketin öncelikli işlenmesi gerektiğini belirtir.**

  - [S]: Sadece SYN aktif (Handshake 1. adım).

  - [S.]: SYN + ACK aktif (Handshake 2. adım).

  - [.]: Sadece ACK aktif (Handshake 3. adım veya sadece onay paketi).

  - [P.]: PUSH + ACK aktif (Veri taşıyan HTTP/TLS paketi).

  - [F.]: FIN + ACK aktif (Bağlantı kapatılırken "Son verini aldım, ben de kapatıyorum").

  - [R.]: RST + ACK aktif (Kapalı porta çarptığında gelen ret cevabı).

  - **Initial Sequence Number (ISN) Katman 4 (TCP)**
    - Hangi Katmanda? Transport Layer (TCP - Taşıma Katmanı).Boyutu: 32-bit ($0 \text{ ile } 4.294.967.295$ arası).
    - Nerede Gördün? TCP 3-way handshake yaparken:PlaintextClient -> Server: Flags [S], seq 2219076938
      Buradaki 2219076938, istemcinin ürettiği ISN değeridir.Görevi Nedir?TCP güvenilir (reliable) bir protokoldür. Gönderilen verilerin sırasını takip etmek için her bayta bir numara verir.İstemci bağlantıyı başlatırken "Benim başlangıç numaram $X$" der (ISN).Karşı taraf "Senin $X$ numaralı paketini aldım, bir sonraki bayt olan $X+1$'i bekliyorum" (Ack = ISN + 1) der.

    - Güvenlik Açısından Neden Önemli? (TCP Hijacking & Spoofing)Eski işletim sistemlerinde ISN tahmin edilebilir bir sırayla artıyordu (örneğin her saniye +1000 artması gibi).Saldırı: Saldırgan, sunucunun üreteceği ISN'i tahmin edebilirse, sunucu ile istemci arasındaki bağlantıyı görmeden bile araya sahte veri enjekte edebiliyordu (TCP Blind Connection Hijacking).Savunma: Modern işletim sistemi çekirdekleri (Linux RFC 6528 standardı), ISN'i kriptografik olarak rastgele (CSPRNG) üretir; tahmin edilmesi imkansızdır.

  **Transaction ID — Katman 7 (DNS / Uygulama)**
  Hangi Katmanda? Application Layer (DNS - UDP üzerinden çalışan uygulama katmanı).Boyutu: 16-bit ($0 \text{ ile } 65.535$ arası).
  Nerede Gördün? DNS sorgusu atıp tcpdump çıktısını aldığında:
  Plaintext172.17.0.4.44656 > 8.8.8.8.53: 21721+ A? example.com 8.8.8.8.53 > 172.17.0.4.44656: 21721$ example.com A 172.66.147.243
  Giden sorgudaki 21721+ ve gelen yanıttaki 21721$ değerleri Transaction ID'dir.
  - Görevi Nedir?
    UDP bağlantısızdır (connectionless); yani TCP gibi el sıkışma, seq ya da ack mekanizması yoktur.Aynı anda 10 farklı web sitesi için DNS sorgusu attığını düşün. Yanıtlar sunucudan karışık sırada dönebilir.İstemci her sorgu paketinin içine rastgele 16-bit bir fiş numarası (Transaction ID) koyar.Dönen yanıttaki fiş numarasına bakar: "Bu cevap az önce sorduğum example.com sorgusunun cevabı" diyerek doğru eşleştirmeyi yapar.

  - Güvenlik Açısından Neden Önemli?
    (DNS Cache Poisoning / Kaminsky Saldırısı)UDP paketlerinde IP adresini taklit etmek (IP spoofing) çok kolaydır.Saldırı: Sen 8.8.8.8'e "example.com nerede?" diye sorduğunda, kötü niyetli biri 8.8.8.8 kılığına girip sana sahte bir IP yanıtı yollayabilir.İstemcinin bu sahte cevabı yutması için tek engel: Transaction ID'yi doğru tutturmaktır.Transaction ID sadece 16-bit olduğu için toplamda yalnızca 65.536 ihtimal vardır. Saldırgan binlerce sahte paketi hızla yağdırırsa (brute-force), gerçek yanıttan önce doğru Transaction ID'yi tutturup senin DNS önbelleğini zehirleyebilir (DNS Spoofing).

- **Closed Port Kernel Behavior (`RST`):**
  - When a TCP SYN hits an active network stack without an application in `LISTEN` state, the kernel immediately generates a `RST-ACK` (`Flags [R.]`) with $Win=0$.
  - Port scanners identify `Closed` ports instantly ($< 1$ ms) due to this active kernel refusal.

- **Firewall Dynamics (`REJECT` vs `DROP`):**
  - **`REJECT` (`--reject-with tcp-reset`):** Explicit refusal via kernel RST packet. Scan duration remains negligible ($< 1$ ms).
  - **`DROP` (Blackhole):** Silent discard. The client undergoes exponential retransmissions until socket timeout ($~2000$ ms).
  - **Product Security Impact:** Enforcing `DROP` at edge infrastructure dramatically increases adversary reconnaissance duration and cost.

- **Layer 7 Plaintext Vulnerabilities:**
  - Unencrypted protocols (HTTP) transmit headers directly across raw TCP segments.
  - Local processes with `CAP_NET_RAW` can passively sniff authentication secrets (`Authorization: Bearer <TOKEN>`) using ASCII packet decodes (`tcpdump -A`).

- **DNS & UDP 53 Mechanics:**
  - UDP is connectionless; requests carry a 16-bit **Transaction ID** ($0-65535$) to correlate queries with answers.
  - **Vulnerabilities:** Susceptible to Cache Poisoning (Kaminsky attack via transaction ID/port prediction) and DNS Amplification DDoS due to large request-to-response amplification ratios. Mitigated by EDNS0 Cookies and DNSSEC.

- **TLS 1.3 Handshake Dynamics:**
  - Replaces plaintext Layer 7 transmission immediately following TCP Handshake.
  - **ClientHello:** Advertises supported cipher suites and provides Diffie-Hellman key share parameters.
  - **ServerHello:** Selects the cryptographic algorithm and returns server key share. Unlike TLS 1.2 (2-RTT), TLS 1.3 achieves encryption in 1-RTT, encrypts certificates on the wire, and enforces Perfect Forward Secrecy (PFS).

---

## 2. Experimental Verification & Artifacts

| Test Case              | Tooling              | Protocol Signature                                 | Latency / Behavior                   |
| ---------------------- | -------------------- | -------------------------------------------------- | ------------------------------------ |
| **TCP Handshake**      | `tcpdump`, `nc`      | `[S]` $\to$ `[S.]` $\to$ `[.]`                     | Real-time connection establishment   |
| **Closed Port**        | `nc`, `tcpdump`      | `Flags [R.]`, $Win=0$                              | Sub-millisecond kernel rejection     |
| **Firewall REJECT**    | `iptables`, `nc`     | Netfilter generated `[R.]`                         | Instant termination ($\approx 1$ ms) |
| **Firewall DROP**      | `iptables`, `nc`     | Packet silence $\to$ Retransmit $\to$ Timeout      | Blocking delay ($\approx 2000$ ms)   |
| **L7 Cleartext Token** | `curl`, `tcpdump -A` | Plaintext `Authorization: Bearer` exposed          | Passive credential sniffing          |
| **DNS Resolution**     | `dig`, `tcpdump -vv` | UDP 53 `19491+ [1au] A?` $\to$ `19491$`            | Transaction ID validation            |
| **TLS 1.3 Handshake**  | `curl`, `tcpdump`    | `ClientHello` (517 B) $\to$ `ServerHello` (3991 B) | 1-RTT cryptographic transition       |

---

## 3. Included Automation Scripts

- `scripts/capture-handshake.sh`: Automates TCP 3-way handshake verification and captures kernel closed-port RST responses.
- `scripts/test-firewall-behavior.sh`: Evaluates iptables filtering policies, benchmarking `REJECT` against `DROP` timeouts.
- `scripts/sniff-http-payload.sh`: Simulates passive credential harvesting over unencrypted HTTP streams.
- `scripts/trace-dns-transaction.sh`: Inspects UDP 53 packets, demonstrating Transaction ID matching and EDNS0 security flags.
- `scripts/trace-tls-handshake.sh`: Traces the transition from TCP Layer 4 to TLS 1.3 encrypted application records.
