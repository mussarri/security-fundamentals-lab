# DAY 7: SSRF v3 (Kapsamlı Savunma ve Doğrulama Mimarisi)

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** `http.get` istemciden gelen parametreyi doğrudan ağ soketine aktarmış, sunucunun yerel döngü (loopback) ve iç ağ ayrıcalıklarını kullanarak `/internal/metadata` içeriğini dışarı teslim etmiştir.
- **Sıkılaştırılmış Durumda:**
  1. Yalnızca `http:` ve `https:` şemalarına izin verilmiştir.
  2. Hedef alan adının tüm DNS kayıtları sorgulanmış ve IPv4/IPv6 aralıkları (RFC 1918, Loopback, Link-Local) doğrulanmıştır.
  3. Soket doğrudan çözümlenen ve doğrulanan IP'ye bağlanarak açılmış (**DNS Pinning**), alan adı yalnızca `Host` başlığında tutulmuştur.
  4. HTTP yönlendirmeleri (`Location`) yeni bir istek olarak ele alınarak boru hattının ilk adımından itibaren tekrar denetlenmiştir.

## 2. Root Cause
**Trust Boundary Failure.** Güvenilmeyen bir istemci girdisinin, sunucu uygulamasının yerel ağ ve altyapı yetkileriyle rastgele adreslere istek atmasına izin verilmesi.

## 3. Mimari ve Egress Savunma Stratejisi
Yazılım katmanındaki filtrelemeler tek başına yeterli kabul edilmemeli, derinlemesine savunma (Defense-in-Depth) kapsamında ağ çıkış kuralları (Egress Filtering) uygulanmalıdır:
- **Cloud Metadata Engeli:** Konteyner veya sanal makine düzeyinde `169.254.169.254/32` hedefine giden tüm çıkış paketleri `iptables` veya cloud security group ile DROP edilmelidir.
- **Dedicated Proxy:** Dış dünyadan veri indirmesi gereken servisler, iç ağdan tamamen izole edilmiş bir Egress Proxy üzerinden yönlendirilmelidir.

## 4. Remediation (Düzeltme Adımları)
1. Katı protokol denetimi uygula (`http/https` haricini reddet).
2. DNS çözümlemesini yazılım katmanında yönet ve doğrulanmış IP'ye soket aç.
3. Yönlendirmeleri körü körüne takip etme; her adımı yeniden doğrula.
4. Yanıt boyutu ve zaman aşımı limitlerini baştan belirle.

## 5. Doğrulama
```bash
./gap-closure-v2/day-07-ssrf-v3/test-suite.sh
