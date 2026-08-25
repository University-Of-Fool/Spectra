FROM alpine:3.22

RUN addgroup -S spectra \
    && adduser -S -D -H -G spectra spectra \
    && mkdir -p /var/lib/spectra/data \
    && chown -R spectra:spectra /var/lib/spectra

COPY --chown=spectra:spectra target/x86_64-unknown-linux-musl/release/Spectra /usr/local/bin/Spectra
COPY --chown=spectra:spectra container/config.toml /etc/spectra/config.toml

USER spectra:spectra

VOLUME ["/var/lib/spectra/data"]
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/Spectra", "--config", "/etc/spectra/config.toml"]
