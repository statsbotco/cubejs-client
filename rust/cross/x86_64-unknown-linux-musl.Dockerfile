FROM rustembedded/cross:x86_64-unknown-linux-musl

RUN apt-get update && \
    apt-get install -y libssl1.1 libssl-dev curl
