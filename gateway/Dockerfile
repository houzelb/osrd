# syntax=docker/dockerfile:1

##############
# Cargo chef #
##############
FROM lukemathwalker/cargo-chef:0.1.68-rust-1.82-alpine3.20 AS chef
WORKDIR /gateway

#######################
# Cargo chef : Recipe #
#######################
FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

######################
# Cargo chef : build #
######################
FROM chef AS run_builder
RUN apk add --no-cache musl-dev build-base jemalloc-dev openssl-dev mold
ENV RUSTFLAGS="-C link-arg=-fuse-ld=mold"
COPY --from=planner /gateway/recipe.json recipe.json
ARG CARGO_PROFILE=release
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/gateway/target \
    cargo chef cook --profile ${CARGO_PROFILE} --recipe-path recipe.json
COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/gateway/target \
    cargo install --profile ${CARGO_PROFILE} --locked --path .

#######################
# Running env : build #
#######################
FROM alpine:3.20 AS running_env
RUN apk add --no-cache curl ca-certificates bind-tools
COPY --from=run_builder /usr/local/cargo/bin/osrd_gateway /usr/local/bin/osrd_gateway

ARG OSRD_GIT_DESCRIBE
ENV OSRD_GIT_DESCRIBE=${OSRD_GIT_DESCRIBE}

CMD ["/usr/local/bin/osrd_gateway"]
