# Practical Application & Container Security Engineering Lab

Bu repo; üretim ortamlarında karşılaşılan güvenlik zafiyetlerinin, Linux çekirdek kısıtlamalarının (Namespaces, Capabilities, Sysctl, Cgroups), container izolasyon mimarilerinin ve web güvenliği temellerinin uygulamalı olarak analiz edildiği ve sıkılaştırıldığı (hardening) pratik mühendislik deposudur.

Tüm vaka çalışmaları **6 Adımlı Güvenlik Mühendisliği Metodolojisi** ile incelenir:
1. **Neden çalıştı / Neden engellendi?** (Exploit & Execution Analysis)
2. **Root cause ne?** (Kök Neden Analizi)
3. **Framework / Platform bunu nasıl önleyebilirdi?** (Platform Controls)
4. **Developer / DevOps olarak nasıl düzeltirdim?** (Remediation & Hardening)
5. **Fix'i nasıl test ederim?** (Verification & Regression Testing)
6. **Başka nerede aynı pattern olabilir?** (Variant Analysis)

---

## 📂 Dizin Mimarisi

```text
.
├── README.md
├── labs/              # Adım adım laboratuvar adımları ve senaryo talimatları
├── notes/             # Çekirdek, ağ ve container güvenlik mimari notları
├── vulnerable/        # Bilerek hatalı/zafiyetli bırakılmış konfigürasyonlar
├── fixed/             # Üretim standardında sıkılaştırılmış çözümler
├── tests/             # Otomatize güvenlik ve izolasyon doğrulama scriptleri
└── writeups/          # 6 adımlı analiz şablonuna göre yazılmış vaka raporları
```

---

## 🧪 Tamamlanan ve Planlanan Modüller

### Modül 1: Container & Infrastructure Security
- [x] **Linux Capabilities & Kernel Sysctl Isolation:** `CAP_SYS_TIME`, `CAP_NET_RAW` ve `net.ipv4.ping_group_range` çekirdek parametrelerinin analizi.
- [x] **Container Escape (Docker Socket Leak):** `/var/run/docker.sock` montajı ile host root dosya sistemine kaçış analizi.
- [x] **Docker Multi-Tier Network Segmentation:** Bridge vs Internal ağlar, Lateral Movement engelleme ve veritabanı yalıtımı.
- [x] **Production Non-Root Hardening:** Host UID eşleşmesi (UID 1001), salt-okunur secret bağlama ve metadata sızıntısı önleme.

### Modül 2: Web Security Fundamentals (Sıradaki Modül)
- [ ] **SOP & CORS Deep-Dive:** Simple vs Preflighted requests, `Access-Control-Allow-Origin: *` tuzakları.
- [ ] **Cookie Security Flags:** `HttpOnly`, `Secure`, `SameSite` (Strict vs Lax vs None) ve token saklama stratejileri.
- [ ] **XSS & Content Security Policy (CSP):** Reflected/Stored XSS mitigasyonu ve nonce-based CSP.
- [ ] **SSRF & Cloud Metadata Access:** AWS/GCP metadata uç noktalarına erişim ve iç ağ pivoting.