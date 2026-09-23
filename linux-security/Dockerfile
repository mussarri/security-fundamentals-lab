FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    netcat-openbsd \
    iproute2 \
    libcap2-bin \
    procps \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# İki ayrı yetki seviyesinde kullanıcı
RUN useradd -m -s /bin/bash appuser && \
    useradd -m -s /bin/bash attacker

WORKDIR /lab
COPY scripts/ /lab/scripts/
RUN chmod +x /lab/scripts/*.sh

CMD ["/bin/bash"]