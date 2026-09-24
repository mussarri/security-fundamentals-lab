# Vaka Analizi: Docker Multi-Tier Ağ Segmentasyonu ve Lateral Movement Önleme

## 1. Neden Çalıştı / Neden Engellendi?
- **Düz Ağda Neden Çalıştı?** Varsayılan User-Defined Bridge ağlarında çalışan tüm container'lar aynı alt ağ (`subnet`) içerisindedir. Docker'ın dahili DNS sunucusu (`127.0.0.11`) tüm container isimlerini çözer ve container-to-container trafiğinde herhangi bir güvenlik duvarı filtresi uygulanmaz.
- **İzole Ağda Neden Engellendi?** Ağlar `public-net` ve `secure-net` olarak ikiye ayrıldığında, Linux Network Namespace sınırları devreye girer. `c-frontend` yalnızca `public-net` köprüsüne bağlı olduğu için `secure-net` üzerindeki `c-database` adını çözemez (`bad address`). Ayrıca veritabanı ağı `internal: true` olarak tanımlandığında, Linux `iptables` FORWARD zincirinde dış dünyaya (WAN) giden paketler düşürülür (`Network unreachable`).

## 2. Root Cause (Kök Neden Analizi)
**Düz (Flat) Ağ Mimarisi ve Aşırı Güven Modeli (Excessive Trust).**
Mikroservis mimarilerinde dış dünyayla konuşan katman (Frontend / Nginx) ile en kritik veri katmanının (Database / Redis) aynı ağ segmentine konulması; uç noktadaki bir zafiyetin (SSRF, RCE) doğrudan veritabanına sıçramasına yol açar.

## 3. Platform / Framework Önlemleri
- Docker Compose üzerinde servis bazlı özel izole ağ tanımları (`networks:`).
- Hassas veri servisleri için `internal: true` direktifi ile internet bağlantısının kesilmesi.

## 4. Remediation / Hardening (Geliştirici & DevOps Düzeltmesi)
1. **Çok Katmanlı Ağ Tanımı:**
   - `frontend-net`: Yalnızca Nginx/Reverse Proxy ile API/Frontend konuşur.
   - `backend-net`: Yalnızca Backend ile Veritabanı/Redis konuşur.
2. **Internal Ağ Koruması:** `backend-net` için `internal: true` atanarak veritabanının dış internete bağlantısı çekirdek seviyesinde kesilir.
3. **Port Sızıntısını Önleme:** Veritabanı ve Redis için `docker-compose.yml` içinde `ports: "5432:5432"` satırı kaldırılır; iletişim sadece container ağı üzerinden yürütülür.

## 5. Doğrulama (Verification & Regression Testing)
1. Frontend katmanından veritabanının izole olduğunu doğrula:
   ```bash
   docker exec c-frontend ping -c 1 c-database
   # Beklenen Çıktı: ping: bad address 'c-database'
Veritabanının internete çıkamadığını doğrula:

Bash
docker exec c-database ping -c 1 8.8.8.8
# Beklenen Çıktı: ping: sendto: Network unreachable
6. Variant Analysis (Başka Nerede Karşımıza Çıkar?)
Bulut Mimarileri (AWS / GCP / Azure VPC): Public Subnet içinde çalışan bir web sunucusunun doğrudan RDS veritabanı ile aynı subnet veya kontrolsüz Security Group içinde bulunması.

Kubernetes Doğu-Batı Trafiği: NetworkPolicy tanımlanmadığında herhangi bir namespace'teki bir pod'un cluster içindeki tüm veritabanı ve ödeme servislerine doğrudan HTTP/TCP isteği atabilmesi.
EOF


