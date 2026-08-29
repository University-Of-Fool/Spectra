# Build the frontend and backend from source.
FROM node:26-alpine AS frontend-build

WORKDIR /src

RUN npm install --global pnpm@11

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY web ./web
COPY src ./src
COPY vite.config.ts tsconfig.json tailwind.config.ts ./
RUN pnpm vite build


FROM rust:alpine AS backend-build

WORKDIR /src

RUN apk add --no-cache \
    build-base \
    git \
    pkgconfig

ENV SQLX_OFFLINE=true

COPY . .
COPY --from=frontend-build /src/web/dist ./web/dist

RUN cargo build --release --manifest-path backend/Cargo.toml


# Keep the runtime image small and free of build tools.
FROM alpine:3.22

RUN addgroup -S spectra \
    && adduser -S -D -H -G spectra spectra \
    && mkdir -p /var/lib/spectra/data \
    && chown -R spectra:spectra /var/lib/spectra

COPY --from=backend-build --chown=spectra:spectra \
    /src/target/release/Spectra /usr/local/bin/Spectra
COPY --chown=spectra:spectra container/config.toml /etc/spectra/config.toml

USER spectra:spectra

VOLUME ["/var/lib/spectra/data"]
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/Spectra", "--config", "/etc/spectra/config.toml"]
