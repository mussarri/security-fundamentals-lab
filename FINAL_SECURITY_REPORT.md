# 7-Haftalık Web Uygulama Güvenliği ve Savunma Mimarisi Raporu
Depo: security-fundamentals-lab
Yaklaşım: Defense-in-Depth & Architectural Remediation

## Kapsanan Zafiyetler ve Kesin Savunmalar
1. Client-Side (XSS & DOM XSS): Context-aware sanitization ve Strict Nonce-based CSP.
2. Request Forgery (CSRF & SSRF): SameSite çerezleri, Anti-CSRF belirteçleri, DNS Pinning ve Egress Filtering.
3. Kimlik ve Oturum (JWT, IDOR, Session Fixation): Algorithm whitelisting, nesne sahipliği denetimi (Object-Level Authorization) ve oturum kimliği yenileme (session.regenerate).
4. Veritabanı Katmanı (SQLi, UNION, Blind SQLi): Prepared Statements ile veri ve komut ayrımı, en az yetkili veritabanı rolleri.

Tüm çözümler fixed/ dizininde kaynak kod, tests/ altında otomatik regresyon scriptleri ve writeups/ altında 6 adımlı analiz şablonlarıyla belgelenmiştir.
