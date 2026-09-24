# Linux Çekirdeği İzolasyon Mekanizmaları: Namespaces, Capabilities ve Sysctl

Container sistemleri bağımsız bir işletim sistemi çekirdeğine (kernel) veya sanal donanıma sahip değildir. Bir container, host çekirdeği üzerinde çalışan sınırlandırılmış bir Linux sürecidir (process). İzolasyon üç temel sütun üzerinde yükselir:

---

## 1. Linux Namespaces (Görünürlük Katmanı)

Namespace mekanizması, bir process'e sanallaştırılmış sistem kaynakları sunar.

| Namespace | Linux Bayrağı | İzole Ettiği Kaynak | Güvenlik Etkisi |
| :--- | :--- | :--- | :--- |
| **PID** | `CLONE_NEWPID` | Süreç Kimlikleri (Process IDs) | Container içindeki process kendini PID 1 görür; host'taki diğer süreçleri listeleyemez veya `kill` edemez. |
| **NET** | `CLONE_NEWNET` | Ağ Arayüzleri, Routing, Portlar | Container'a bağımsız `eth0`, `lo` ve routing tablosu atanır; host ağ soketlerine doğrudan müdahale edemez. |
| **MNT** | `CLONE_NEWNS` | Dosya Sistemi Mount Noktaları | Container'ın root (`/`) dosya sistemi host'tan ayrılır (`pivot_root`). |
| **IPC** | `CLONE_NEWIPC` | Paylaşımlı Bellek (POSIX/SysV IPC) | Süreçler arası paylaşımlı bellek ve mesaj kuyrukları ayrı tutulur. |
| **UTS** | `CLONE_NEWUTS` | Hostname ve Domain Adı | Container'a bağımsız bir ana makine adı atanır. |
| **USER** | `CLONE_NEWUSER`| Kullanıcı ve Grup Kimlikleri (UID/GID) | Container içindeki `UID 0` (root), host makinede `UID 10001` gibi yetkisiz bir kullanıcıya haritalanabilir (Rootless Docker). |

---

## 2. Linux Capabilities (Ayrıcalıkların Parçalanması)

Geleneksel Linux sistemlerindeki ikili model (Root vs Non-root), güvenlik açısından kritik zafiyetlere yol açar. Linux kernel 2.2 ile birlikte gelen Capabilities mekanizması, `root` yetkisini yaklaşık 40 bağımsız parçaya bölmüştür.

### Standart Docker Davranışı
Docker bir container'ı `root` (UID 0) olarak başlatsa dahi, varsayılan olarak yalnızca **14 yetkiyi** tanır. Diğerlerini `drop` eder.

* **`CAP_CHOWN`**: Dosya sahipliğini değiştirebilme.
* **`CAP_NET_BIND_SERVICE`**: 1024'ten küçük ayrıcalıklı portları (80, 443) dinleyebilme.
* **`CAP_NET_RAW`**: Ham ağ soketleri (`SOCK_RAW`) açabilme (Varsayılan olarak açıktır, ağ sniffing riski barındırır).
* **`CAP_SYS_ADMIN`**: "Yarı-root" yetkisi. Dosya sistemlerini mount etme, kernel parametrelerini düzenleme (Docker varsayılanında **KAPALIDIR**).
* **`CAP_SYS_TIME`**: Sistem saatini değiştirebilme (Docker varsayılanında **KAPALIDIR**).

### Laboratuvarda Gözlemlenen Özel Durum: `net.ipv4.ping_group_range`
Container'a `--cap-drop=ALL` verilmesine rağmen `ping` komutunun çalışması, Linux çekirdeğindeki sysctl ayarından kaynaklanır:

```text
/proc/sys/net/ipv4/ping_group_range -> "0 2147483647"
```

* Modern Linux çekirdeklerinde yetkisiz process'ler, raw socket (`SOCK_RAW`) açmadan datagram soketi (`SOCK_DGRAM`, `IPPROTO_ICMP`) üzerinden ICMP paketi gönderebilir.
* Tam bir ağ soketi izolasyonu için hem capabilities budanmalı (`--cap-drop=ALL`), hem de sysctl kısıtlanmalıdır:
  `--sysctl net.ipv4.ping_group_range="1 0"`

---

## 3. Üretim Seviyesi Sıkılaştırma (Hardening) Standartları

1. **Least Privilege Capabilities:**
   ```yaml
   cap_drop:
     - ALL
   cap_add:
     - NET_BIND_SERVICE # Yalnızca 80/443 gerekiyorsa
   ```
2. **Yetki Yükseltme Koruması:**
   ```yaml
   security_opt:
     - no-new-privileges:true # Process'in setuid bitlerini kullanarak yetki artırmasını engeller
   ```
3. **Non-Root Kullanıcı:**
   Container içinde asla UID 0 kullanılmamalı; süreç host'taki servis kullanıcısı (ör. `UID 1001`) ile çalıştırılmalıdır.