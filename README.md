# Spectra

Spectrum of online tools

## Development

Before continuing, make sure you have these installed:

- Rust toolchain
- Node.js & pnpm
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
sqlx database create
sqlx migrate run
```

Finally run the command below to run the project under development mode:

```bash
pnpm dev
```
