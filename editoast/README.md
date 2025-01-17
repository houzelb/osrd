# OSRD's backend

This service allow to edit an infrastructure using railjson schema.
It will apply modification and update generated data such as object geometry.

# Developer installation

## Requirements

For both tests or run:

- [rustup](https://rustup.rs/)
- [libpq](https://www.postgresql.org/docs/current/libpq.html) (may be packaged as `libpq-dev`)
- [openssl](https://www.openssl.org)
- [libgeos](https://libgeos.org/usage/install/) (may be packaged as `libgeos-dev`)
- A properly initialized postgresql database and a valkey server: `docker compose up --no-build --detach postgres valkey`

## Steps

```sh
# apply database migration
$ cargo install diesel_cli --no-default-features --features postgres
$ diesel migration run
# Build and run
$ cargo build
$ cargo run -- runserver
# Test server is up
$ curl -f http://localhost:8090/health
```

## Tests

To avoid thread conflicts while accessing the database, use serial_test

```rust
#[test]
#[serial_test::serial]
```

```sh
cargo test -- --test-threads=4
```

# Debugging

:warning: For improving compilation time and therefore the developer experience, the project
choose to strip out debug information by default, resulting in [about 20%
shorter compilation time](https://github.com/OpenRailAssociation/osrd/pull/8579).

If you need to debug the project, you might want to activate the `dev-for-debug` profile
which will build with debug information.

```
cargo build --profile dev-for-debug
```

## Useful tools

Here a list of components to help you in your development (see CI jobs if necessary):

- [rustfmt](https://github.com/rust-lang/rustfmt): Format the whole code `cargo fmt`
- [taplo](https://taplo.tamasfe.dev/): Format the TOML files with `taplo fmt`
- [clippy](https://github.com/rust-lang/rust-clippy): Run a powerful linter `cargo clippy --all-features --all-targets -- -D warnings`
- [grcov](https://github.com/mozilla/grcov): Check code coverage (see documentation on GitHub)

To install `rustfmt` and `clippy`, simply run:

```sh
rustup component add rustfmt clippy
```

To install `taplo`, run:

```sh
cargo install --locked taplo-cli
```

To setup `grcov`, please see [its documentation](https://github.com/mozilla/grcov#how-to-get-grcov)

## For M1 MacOS users

Our `docker-compose.yml` at the root of the project uses the `postgis` image by default.
For M1 macs, it requires emulation since it's not compiled for arm platforms, which results
in a significant slowdown. Define this variable in your environment or in a `.env` file somewhere:

```sh
export OSRD_POSTGIS_IMAGE='nickblah/postgis:16-postgis-3'
```

## OpenApi generation

We have to keep the OpenApi of the service statically in the repository.
To make sure it is always valid a CI check has been set up. To update the
OpenApi when a change has been made to an endpoint, run the following command:

```sh
cargo run openapi > openapi.yaml
```

## Working with `editoast_derive`

We define some custom procedural macros in the `editoast_derive` crate. These rely on snapshot testing library [`insta`](https://insta.rs/). It basically works like this:

1. Change the output of a macro
2. Run the tests using `cargo test`
3. Since the output has changed, the test will fail, showing a diff of the old vs. new snapshot content. The new snapshot will be saved to disk with the extension `*.snap.new`.
4. If the new snapshot is correct, rename it to `*.snap` and commit it.

> [!TIP]
> You can use [`cargo-insta`](https://insta.rs/docs/cli/) to review pending snapshots and accept them conveniently.
> ```sh
> $ cargo insta review
> ```

For more information, visit the [`insta` documentation](https://insta.rs/docs/).
