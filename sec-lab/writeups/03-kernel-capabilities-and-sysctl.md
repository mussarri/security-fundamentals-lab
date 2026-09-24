# Vaka Analizi: Linux Capabilities, Seccomp ve Sysctl İzolasyonu

## 1. Neden Çalıştı / Neden Engellendi?

- **`date` Neden Engellendi?** Sistem saatini değiştirmek `clock_settime()` sistem çağrısını tetikler. Linux çekirdeği bu çağrı için `CAP_SYS_TIME` capability'sini şart koşar. Docker varsayılan olarak bu yetkiyi vermediği için root kullanıcısı dahi `Operation not permitted` hatası alır.
- **`ping` Neden `--cap-drop=ALL` Verilmesine Rağmen Çalıştı?** Modern Linux çekirdeklerinde yetkisiz kullanıcıların ICMP paketi atabilmesi için `net.ipv4.ping_group_range` sysctl parametresi geliştirilmiştir. Docker bu parametreyi varsayılan olarak `0 2147483647` (tüm GID'ler) şeklinde açar. Dolayısıyla Alpine BusyBox `CAP_NET_RAW` olmasa bile `SOCK_DGRAM` üzerinden unprivileged ICMP soketi açar.
- **Tam İzolasyon Nasıl Sağlandı?** `--sysctl net.ipv4.ping_group_range="1 0"` verildiğinde çekirdek yetkisiz ICMP soketi açılmasını da yasaklamış ve `ping: permission denied` ile tam izolasyon sağlanmıştır.

## 2. Root Cause (Kök Neden Analizi)

**Container İçi Root İllüzyonu ve Çekirdek Varsayılanları.**
Container içindeki `root` host üzerindeki gerçek `root` değildir; yetkileri Linux Capabilities ve Seccomp ile sınırlandırılmıştır. Ancak varsayılan Docker konfigürasyonu geriye dönük uyumluluk adına `CAP_NET_RAW` ve geniş `ping_group_range` gibi bazı gereksiz yetkileri açık bırakır.

## 3. Platform / Framework Önlemleri

- Docker Seccomp varsayılan profili ile ~44 tehlikeli sistem çağrısının engellenmesi.
- Varsayılan 40 capability'den yalnızca 14 tanesinin aktif edilmesi.

## 4. Remediation / Hardening (Geliştirici & DevOps Düzeltmesi)

Uygulama servislerinde "En Düşük Yetki" (Principle of Least Privilege) kuralı uygulanmalıdır:

```yaml
services:
  backend:
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    sysctls:
      - net.ipv4.ping_group_range=1 0
```

5. Doğrulama (Verification & Regression Testing)
   Sıkılaştırılmış container içinde raw paket ve ICMP soketi açılamadığını doğrula:

```Bash
# ICMP ping testi:
docker exec backend ping -c 1 8.8.8.8
# Beklenen Çıktı: ping: permission denied
```

```bash
# Ham paket yakalama (Sniffing) testi:
docker exec backend tcpdump -i eth0
# Beklenen Çıktı: Attempt to create packet socket failed - CAP_NET_RAW may be required
```

# 6. Variant Analysis (Başka Nerede Karşımıza Çıkar?)

Kubernetes Pod Security Standards: restricted profilinde capabilities.drop: ["ALL"] uygulanmadığında saldırganın pod içinde ARP Spoofing ve DNS Poisoning gerçekleştirmesi.

Linux SUID İkili Dosyaları: Host sistemlerde yetkisiz kullanıcıların SUID veya Linux Capabilities (setcap) tanımlı dosyalar üzerinden yerel yetki yükseltmesi (Privilege Escalation).
