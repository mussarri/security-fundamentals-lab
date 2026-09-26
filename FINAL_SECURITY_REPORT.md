# 7-Haftalık Web Uygulama Güvenliği ve Savunma Mimarisi Raporu

Depo: security-fundamentals-lab
Yaklaşım: Defense-in-Depth & Architectural Remediation

## Kapsanan Zafiyetler ve Kesin Savunmalar

1. Client-Side (XSS & DOM XSS): Context-aware sanitization ve Strict Nonce-based CSP.
2. Request Forgery (CSRF & SSRF): SameSite çerezleri, Anti-CSRF belirteçleri, DNS Pinning ve Egress Filtering.
3. Kimlik ve Oturum (JWT, IDOR, Session Fixation): Algorithm whitelisting, nesne sahipliği denetimi (Object-Level Authorization) ve oturum kimliği yenileme (session.regenerate).
4. Veritabanı Katmanı (SQLi, UNION, Blind SQLi): Prepared Statements ile veri ve komut ayrımı, en az yetkili veritabanı rolleri.


# 7-Haftalık Web Uygulama Güvenliği ve Savunma Mimarisi Raporu

Depo: security-fundamentals-lab
Yaklaşım: Defense-in-Depth & Architectural Remediation
Veri ile Talimatın Ayrıştırılamaması (Code-Data Separation Failure): Tarayıcıda (XSS), sunucuda (SSRF) veya veritabanında (SQLi) kullanıcıdan gelen ham verinin bir komut veya sözdizimi kuralı gibi çalıştırılması.Yetki ve Güven Sınırlarının İhlali (Trust Boundary Failure): Kullanıcının beyanına (JWT Header, ID parametresi) körü körüne güvenilmesi veya sunucu kimliğinin iç ağlara kalkan yapılması (SSRF, CSRF).

Hafta,Kapsanan Konular,Kök Neden (Root Cause),Saldırganın Kazancı,Nihai Mimari Savunma
Hafta 1-3,"Ağ, Linux Temelleri, HTTP/TLS ve Recon","Açık portlar, güvensiz ciphersuite'ler, banner sızıntısı","Ağ haritalama, MiTM dinlemesi","TLS 1.3 zorunluluğu, HSTS, minimal attack surface"
Hafta 4,"Reflected XSS, DOM XSS, Güvensiz Sink'ler",HTML/DOM parser'ına güvenilmeyen girdi aktarımı,"Session hijacking, tuş kaydedici (keylogger), defacement","Context-aware encoding, güvenli sink'ler (textContent), Strict Nonce-based CSP"
Hafta 5,"CSRF, SSRF, Cloud Metadata, DNS Rebinding","Ambient Authority (çerezlerin istemsiz taşınması), iç ağ kör güveni","İstem dışı durum değişikliği, AWS/GCP IAM kimlik hırsızlığı","SameSite=Lax/Strict + Anti-CSRF Token, IP/CIDR Whitelist + DNS Pinning + Egress Filtering"
Hafta 6,"JWT alg: none, Key Confusion, IDOR, Session Fixation","İstemci kontrolündeki şifreleme parametreleri, eksik nesne yetkilendirmesi","Admin hesabı sahteciliği, yatay veri sızıntısı, oturum çalma","Algorithm Whitelisting, Veri Sahipliği Denetimi, session.regenerate() + HttpOnly"
Hafta 7,"SQL Injection (Auth Bypass, UNION, Blind SQLi)","Dinamik SQL dizelerinde string birleştirme, eksik AST izolasyonu","Veritabanı dökümü, bypass ile tam yetki, gizli kayıt sızıntısı","Prepared Statements (Parametreli Sorgular), En Az Yetki (Least Privilege) DB rolleri"

┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. ALTYAPI & AĞ KATMANI (Network / Host) │
│ - Strict Egress Filtering: 169.254.169.254, 10.0.0.0/8, 127.0.0.0/8 DROP │
│ - Kubernetes NetworkPolicy / Docker Isolated Bridge Networks │
│ - HSTS (HTTP Strict Transport Security) & TLS 1.3 Zorunluluğu │
└──────────────────────────────────────┬──────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. HTTP & PLATFORM SINIRI (Gateway / Reverse Proxy / Headers) │
│ - Content-Security-Policy (CSP): script-src 'nonce-...' (XSS Katili) │
│ - Cookie Security: HttpOnly, Secure, SameSite=Lax │
│ - Rate Limiting & Aggressive Anomaly Detection (Blind SQLi & Brute-Force) │
└──────────────────────────────────────┬──────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. UYGULAMA & MANTIK KATMANI (Application / API Gateway) │
│ - JWT: Katı Algoritma Whitelist (Sadece ['HS256'] veya ['RS256']) │
│ - Anti-CSRF: State-changing (POST/PUT/DELETE) isteklerde senkronize token │
│ - Object-Level Authorization (IDOR): WHERE id = :id AND user_id = :auth_id │
│ - SSRF Koruması: DNS Pinning (Tek IP çöz, doğrula, IP üzerinden soket aç) │
└──────────────────────────────────────┬──────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. VERİ DEPOLAMA KATMANI (Database Engine) │
│ - Prepared Statements / Parameterized Queries (AST İzolasyonu) │
│ - Veritabanı Kullanıcı Yetkileri: Yalnızca DML (SELECT, INSERT, UPDATE) │
│ - Hata Maskeleme: SQL syntax hatalarının kullanıcıya sızdırılmaması │
└─────────────────────────────────────────────────────────────────────────────┘
