# Docker Ağ Mimarisi ve İzolasyon Modelleri

Container ağ güvenliğinde en büyük risk, servislerin varsayılan bridge ağında birbirinin tüm açık portlarına kontrolsüz erişebilmesidir (**Lateral Movement / Yanal İlerleme**).

---

## 1. Ağ Modelleri Karşılaştırması

| Ağ Türü                                | DNS Çözümleme       | Dış Dünya (WAN)    | İzolasyon Seviyesi    | Kullanım Amacı                                        |
| :------------------------------------- | :------------------ | :----------------- | :-------------------- | :---------------------------------------------------- |
| **Default Bridge (`docker0`)**         | Hayır (Sadece IP)   | Açık (NAT)         | Düşük                 | Varsayılan; kurumsal mimaride kullanılmamalı.         |
| **User-Defined Bridge**                | Evet (`127.0.0.11`) | Açık (NAT)         | Orta                  | Servislerin isimle (`backend`, `redis`) haberleşmesi. |
| **Host Network (`--net=host`)**        | Yok (Host DNS)      | Açık               | Sıfır (Host ile aynı) | Çok yüksek performans gereken edge servisler.         |
| **Internal Bridge (`internal: true`)** | Evet                | **Tamamen Kapalı** | Yüksek                | Veritabanı, cache ve hassas depolama katmanı.         |

---

## 2. Mimari Riskler ve Karşı Tedbirler

### Risk 1: Veritabanı Portunun Host'a Bağlanması (`ports:` vs `expose:`)

- **Hatalı Uygulama:** `ports: - "5432:5432"` yazıldığında Docker, host'un `0.0.0.0` IP'sinde port açar ve `iptables` zincirine doğrudan `PREROUTING` kuralı yazar. Host'ta UFW veya güvenlik duvarı olsa dahi Docker bunu bypass edebilir.
- **Doğru Uygulama:** İç servislerde `ports:` kullanılmaz. Yalnızca aynı bridge ağında olan servisler veritabanı container'ının `5432` portuna erişebilir.

### Risk 2: Çok Katmanlı İzolasyon Eksikliği (Segmentasyon)

Aynı ağda çalışan Frontend ve Database container'larında; frontend'de oluşacak bir SSRF (Server-Side Request Forgery) veya RCE açığı doğrudan veritabanına erişim sağlar.

```text
               [ Internet ]
                    │
               Port 80/443
                    │
              ┌───────────┐
              │  Frontend │  (public-net)
              └─────┬─────┘
                    │
              ┌─────┴─────┐
              │  Backend  │  (public-net & internal-net)
              └─────┬─────┘
                    │
        ┌───────────┴───────────┐
        │                       │
  ┌─────┴─────┐           ┌─────┴─────┐
  │  Database │           │   Redis   │  (internal-net / No WAN)
  └───────────┘           └───────────┘
```

### Risk 3: Internal Ağ ile Veri Kaçırma (Data Exfiltration) Engelleme

`internal: true` tanımlandığında Docker çekirdekteki `FORWARD` ve `POSTROUTING` tablolarına kural yazmaz. Container içinden dış dünyaya giden tüm TCP/UDP/ICMP paketleri `Network unreachable` ile çekirdek seviyesinde reddedilir.
