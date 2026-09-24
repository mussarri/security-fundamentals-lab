# Lab 03: Multi-Tier Network Segmentasyonu ve Internal Ağlar

## Amaç
Frontend, backend ve veritabanı servislerini farklı ağ katmanlarına bölerek lateral movement (yanal ilerleme) saldırılarını DNS ve paket filtreleme seviyesinde engellemek.

## Adımlar
1. Dış ve iç ağları oluştur:
   ```bash
   docker network create public-net
   docker network create --internal secure-net
İzole container'ları ayağa kaldır:

Bash
docker run -d --name c-frontend --network public-net alpine:latest sleep 1000
docker run -d --name c-database --network secure-net alpine:latest sleep 1000
docker run -d --name c-backend --network public-net alpine:latest sleep 1000
docker network connect secure-net c-backend
İzolasyonu test et:

Frontend veritabanını çözememeli (ping: bad address 'c-database').

Backend her iki ağa da erişebilmeli.

Database internete paket atamamalı (Network unreachable).