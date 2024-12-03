{
  description = "A Nix flake for OSRD dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    flake-compat.url = "https://flakehub.com/f/edolstra/flake-compat/1.tar.gz";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      fenix,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        pythonPackages = ps: (import ./nix/python_env.nix { inherit ps; });

        fixedNode = pkgs.nodejs_20;
        fixedNodePackages = pkgs.nodePackages.override {
          nodejs = fixedNode;
        };

        rustVer = fenix.packages.${system}.stable;
        rustChan = rustVer.withComponents [
          "cargo"
          "clippy"
          "rust-src"
          "rustc"
          "rustfmt"
          "rust-analyzer"
        ];

        osrd-dev-scripts = pkgs.callPackage ./nix/scripts.nix { };
      in
      with pkgs;
      {
        devShells.default = mkShell {
          buildInputs =
            [
              # Rust
              rustChan

              # Libs
              geos
              openssl
              pkg-config
              postgresql

              # Tools & Libs
              diesel-cli
              cargo-watch
              osmium-tool
              taplo

              # API
              (python311.withPackages pythonPackages)
              ruff-lsp

              # Core
              gradle
              jdk17

              # Front
              fixedNodePackages.create-react-app
              fixedNodePackages.eslint
              fixedNode

              # Nix formatter
              nixfmt-rfc-style
              nixd

              # OSRD dev scripts
              osrd-dev-scripts
              jq

            ]
            # Section added only on Linux systems
            ++ lib.optionals (!stdenv.isDarwin) [
              # Linker
              mold-wrapped
            ]
            # Section added only on Darwin (macOS) systems
            ++ lib.optionals stdenv.isDarwin (
              with pkgs.darwin.apple_sdk.frameworks;
              [
                CoreFoundation
                SystemConfiguration
                libiconv
              ]
            );

          RUSTFLAGS = if stdenv.isDarwin then "" else "-C link-arg=-fuse-ld=mold";
        };
      }
    );
}
