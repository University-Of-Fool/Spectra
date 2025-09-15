# Spectra

Spectrum of online tools

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
