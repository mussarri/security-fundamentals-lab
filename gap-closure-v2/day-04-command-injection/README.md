# DAY 4: Command Injection & Process Execution Lab

## 1. Neden Çalıştı / Neden Engellendi?
- **Zafiyetli Durumda:** `child_process.exec` arkada bir `/bin/sh` kabuğu başlattığı için, kullanıcı girdisindeki `;` veya `|` karakterleri kabuk tarafından komut sonlandırıcı/bağlayıcı olarak yorumlandı ve orijinal `ping` komutundan sonra gelen `id` komutu çalıştırıldı.
- **Sıkılaştırılmış Durumda:**
  1. Girdi katı bir regex ile (`/^[a-zA-Z0-9.-]+$/`) sınırlandırıldı.
  2. `execFile` kullanılarak sistem kabuğu tamamen devre dışı bırakıldı; argümanlar doğrudan `execve` sistem çağrısıyla işletim sistemine aktarıldı (Argument Separation).

## 2. Root Cause
**Code / Data Separation Failure.** Kullanıcıdan gelen verinin, işletim sistemi kabuğunun komut sözdiziminden (syntax) ayrıştırılmadan tek bir string dizesi içinde çalıştırılması.

## 3. Yaygın Atlatma (Bypass) Vektörleri
- **Karakter filtreleri delme:**
  - Noktalı virgül engellendiyse: `|`, `||`, `&`, `&&`, Yeni Satır (`\n` / `%0a`)
  - Boşluk engellendiyse: `${IFS}`, `{cmd,arg}`, `<`
  - Tırnak engellendiyse: `$(printf '\x2f')`

## 4. Remediation (Düzeltme Adımları)
1. **Kabuktan Kaçın:** Kabuk çağıran API'leri (`exec`, `system`, `popen`) kesinlikle kullanma. Yerine doğrudan ikili dosyayı çalıştıran API'leri (`execFile`, `spawn`, `ProcessBuilder`) tercih et.
2. **Argümanları Array Olarak Geç:** Komut ve argümanları hiçbir zaman string birleştirme ile oluşturma.
3. **Allowlist Validasyonu:** Girdileri sadece izin verilen karakter kümesiyle sınırla.

## 5. Doğrulama
```bash
./gap-closure-v2/day-04-command-injection/test-suite.sh
