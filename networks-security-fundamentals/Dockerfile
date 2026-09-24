FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    tcpdump \
    netcat-openbsd \
    curl \
    iptables \
    iproute2 \
    procps \
    bind9-dnsutils \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /lab
COPY scripts/ /lab/scripts/
RUN chmod +x /lab/scripts/*.sh

CMD ["/bin/bash"]