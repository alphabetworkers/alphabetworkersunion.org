{
  description = "alphabetworkersunion.org";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.05";
    unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs, unstable }@attrs:
    let
      forAllSystems = function:
        nixpkgs.lib.genAttrs [
          "x86_64-linux"
          "aarch64-linux"
        ] (system: function (import unstable { inherit system; }));
    in {
      # Shell enviornment with useful tools available.
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          buildInputs = [pkgs.nodejs_20];
        };
      });
  };
}
