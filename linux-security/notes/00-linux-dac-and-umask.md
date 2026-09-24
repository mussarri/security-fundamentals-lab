# Linux Discretionary Access Control (DAC) ve Dosya Güvenliği

## 1. Linux İzin Modeli (rwx ve Sayısal Karşılıkları)
Linux dosya sistemi izinleri 3 kullanıcı sınıfına ayrılır: **User (u)**, **Group (g)**, **Others (o)**.
- `r` (Read - 4): Dosyayı okuma / Dizini listeleme (`ls`).
- `w` (Write - 2): Dosyayı değiştirme / Dizine dosya ekleme-silme.
- `x` (Execute - 1): İkili/script çalıştırma / Dizine girme (`cd`).

## 2. Hassas Dosyalar İçin İzin Matrisi
- `.env` / Özel Anahtarlar (`id_rsa`): `chmod 600` (Yalnızca sahip okur ve yazar: `rw-------`).
- SSH Dizini (`~/.ssh`): `chmod 700` (`rwx------`).
- Ortak Yapılandırmalar: `chmod 644` (`rw-r--r--`).

## 3. Umask Mekanizması
Yeni oluşturulan dosya/dizinlerin varsayılan izin kısıtlamasını belirler.
- Varsayılan dosya tabanı: `666`
- Standart `umask 022` $\to$ Yeni dosya `644` olur (Grup ve diğerleri okuyabilir).
- Güvenli sistemlerde `umask 077` $\to$ Yeni dosya doğrudan `600` açılır.
