<h1 align="center">Spectra</h1>
<p align="center">
    <img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/University-Of-Fool/Spectra/main.yml">
    <img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/University-Of-Fool/Spectra">
    <img alt="GitHub License" src="https://img.shields.io/github/license/University-Of-Fool/Spectra">
</p>
<p align="center">Spectrum of online tools</p>
<img align="center" src="/assets/screenshot.png" alt="Spectra Screenshot">

## Quickstart

1. Head to the [releases page](https://github.com/University-Of-Fool/Spectra/releases).
2. Download the latest release for your platform.
3. Extract the archive to somewhere like `/opt/spectra`.
4. Go to the directory where you extracted the archive.
5. Run `./Spectra init` to generate the configuration file.
6. Edit the configuration file to your liking.
7. Run `./Spectra` to start the server.

## Linux Deployment

On Linux distros, you can use the systemd unit file to manage the service. Spectra provides a command for generating the
unit file.

```bash
sudo ./Spectra systemd
sudo systemctl daemon-reload
```

After that you can enable and start the service:

```bash
sudo systemctl enable --now spectra
```

> [!IMPORTANT]
> For security reasons, it is highly recommended to run the server as a non-root user like `spectra`.
> This is not required and can be ignored, but you'll take risks.

You can add `spectra` user like this:

```bash
sudo useradd -M -U spectra
# don't forget to replace /opt/spectra with your own path
sudo chown -R spectra:spectra /opt/spectra 
```

And then uncomment the `User` line in the unit file created above:

```diff
- # User=spectra
+ User=spectra
```

## Reverse Proxy

Spectra itself **does not** support SSL. Using a reverse proxy software like Nginx is recommended.

Sample configuration block for nginx:

```nginx
server {
    listen       443 ssl http2;
    listen       [::]:443 ssl http2;
    server_name  spectra.example.com;

    ssl_certificate "/path/to/cert.pem";
    ssl_certificate_key "/path/to/key.pem;
    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout  10m;
    ssl_ciphers PROFILE=SYSTEM;
    ssl_prefer_server_ciphers on;
    include /etc/nginx/default.d/*.conf;

    location / {
        proxy_pass http://127.0.0.1:3000/;
        client_max_body_size 1024M;
    }
}
```

## Development

Before continuing, make sure you have these installed:

- Rust toolchain
- Node.js & pnpm (it would be better if your pnpm is installed using npm)
- Windows Terminal

Then create a `.env` under the root directory.

Write the content below:

```dotenv
DATABASE_URL=sqlite:./data.db
```

You can name the database file whatever you want, but make sure it is an SQLite URL.

And run the command below:

```bash
pnpm install
cargo install sqlx-cli
sqlx database setup
```

Finally run the command below to run the project under development mode:

```bash
pnpm dev
```

### Note for building on Windows

Cargo might fail to locate the `cmake` binary on Windows.

You can find its path by running the command below in "Developer PowerShell for VS 20xx":

```powershell
where.exe cmake
```

Then add the path to `spectra/.cargo/config.toml` like below:

```toml
[env]
CMAKE = "C:\\path\\to\\cmake.exe"
```
