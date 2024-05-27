{
  description = "alphabetworkersunion.org";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }@attrs:
    let
      forAllSystems = function:
        nixpkgs.lib.genAttrs [
          "x86_64-linux"
          "aarch64-linux"
        ] (system: function (import nixpkgs { inherit system; }));
    in {
      # Shell enviornment with useful tools available.
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          buildInputs = [pkgs.nodejs_20 pkgs.wrangler];
        };
      });
  };
}
