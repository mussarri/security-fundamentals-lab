# Vaka Analizi: HTTP Cookie Güvenlik Bayrakları (HttpOnly, Secure, SameSite)

## 1. Neden Çalıştı / Neden Engellendi?

- **Bayraksız Çerez:** `document.cookie` üzerinden doğrudan okunabildiği için XSS veya kötü niyetli 3. parti script'ler tarafından kolayca sızdırılabilir.
- **HttpOnly Çerez:** Tarayıcı motoru tarafından DOM bağlamından gizlenir. JavaScript ile erişilemez, ancak arka plandaki HTTP ağ isteklerinde otomatik olarak `Cookie:` başlığına eklenir.

## 2. Root Cause

Hassas oturum anahtarlarının ve JWT'lerin istemci tarafında okunabilir bellek veya depolama alanlarında (`localStorage`, bayraksız Cookie) tutulması.

## 3. Platform Kontrolleri

RFC 6265 spesifikasyonu; tarayıcıların `HttpOnly` çerezleri script erişimine kapatmasını, `Secure` çerezleri düz HTTP üzerinden iletmemesini şart koşar.

## 4. Remediation (Düzeltme)

Oturum yönetiminde çerezler daima şu bayraklarla set edilmelidir:
`Set-Cookie: session=xyz; HttpOnly; Secure; SameSite=Lax; Path=/; Domain=.kargaa.com`

## 5. Doğrulama

```bash
curl -I http://localhost:3000/
# Set-Cookie başlığında HttpOnly, Secure ve SameSite bayraklarının varlığını doğrula.
```

# 6. Variant Analysis

localStorage içinde saklanan JWT'lerin DOM XSS ile ele geçirilmesi.

SameSite=None kullanılıp Secure bayrağının unutulması sonucu çerezlerin düz metin ağda iletilmesi.
