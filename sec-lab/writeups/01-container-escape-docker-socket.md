# Vaka Analizi: Docker Socket Sızıntısı ile Host Ele Geçirme (Container Escape)

## 1. Neden Çalıştı? (Execution / Exploit Analysis)
Container içine `/var/run/docker.sock` dosyası bind-mount edildiğinde, container içerisindeki bir süreç doğrudan host üzerinde `root` yetkisiyle çalışan Docker Daemon (`dockerd`) ile Unix IPC soketi üzerinden iletişim kurabilir.
Saldırgan container içinde Docker CLI veya ham HTTP çağrısı (`curl --unix-socket`) kullanarak Docker daemon'a şu talimatı verir:
*"Host makinenin tüm kök dosya sistemini (`/`) yeni bir container içine `/host` olarak bağla ve bana bir kabuk aç."*
Daemon bu isteği yerine getirdiği anda saldırgan host'un `/etc/shadow`, `/root/.ssh` ve tüm disk alanına tam okuma/yazma (root) erişimi sağlar.

## 2. Root Cause (Kök Neden Analizi)
**Control Plane (Altyapı Yönetim Arayüzü) ile Data Plane (Uygulama Veri Akışı) Güvenlik Sınırlarının Kaldırılması.**
Web uygulamaları ve iş mantığı servisleri veri işlemek içindir. Altyapıyı yöneten kontrol soketinin uygulamanın çalışma alanına dahil edilmesi, en zayıf web açığında dahi tüm altyapının anahtarlarını saldırgana teslim eder.

## 3. Platform / Framework Önlemleri
- **Rootless Docker:** Docker daemon root yerine unprivileged user namespace içinde çalıştırıldığında host dosya sistemine doğrudan sıçrama yapılamaz.
- **Strict Mount Restrictions:** Container ortamlarında yönetim soketlerinin bağlanması varsayılan olarak engellenmelidir.

## 4. Remediation / Hardening (Geliştirici & DevOps Düzeltmesi)
1. Uygulama ve servis container'larına `/var/run/docker.sock` kesinlikle bağlanmamalıdır.
2. İzleme, metrik toplama veya CI/CD gereksinimleri nedeniyle Docker API zorunluysa, araya bir **Docker Socket Proxy** (`tecnativa/docker-socket-proxy`) konulmalıdır:
   - `CONTAINERS=1` (Sadece `GET /containers/json` listeleme izni ver)
   - `POST=0` (Yeni container oluşturmayı engelle)
   - `EXEC=0` (Container içi komut çalıştırmayı engelle)
   - `VOLUMES=0` (Host diski bağlamayı engelle)

## 5. Doğrulama (Verification & Regression Testing)
Container ayağa kalktığında soket dosyasının olmadığını teyit et:
```bash
docker exec backend ls -la /var/run/docker.sock
# Beklenen Çıktı: ls: /var/run/docker.sock: No such file or directory
Container içinden docker komutunun çalışmadığını doğrula:

Bash
docker exec backend docker ps
# Beklenen Çıktı: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
6. Variant Analysis (Başka Nerede Karşımıza Çıkar?)
Kubernetes Pod Misconfiguration: Pod tanımlarına aşırı yetkili ServiceAccount atanması; ele geçirilen pod'un /var/run/secrets/kubernetes.io/serviceaccount/token üzerinden Kubernetes API Server'a erişip tüm cluster'ı ele geçirmesi.

CI/CD Self-Hosted Runners: GitLab Runner veya GitHub Actions runner container'larına Docker-in-Docker çalıştırmak için soket verilmesi; PR açan bir saldırganın runner host'una root olarak sızması.
