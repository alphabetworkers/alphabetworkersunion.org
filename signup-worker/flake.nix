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
          buildInputs = [
            # This is a JS app so need Node/NPM
            pkgs.nodejs_20
            # Wrangler from NPM doesn't work directly under NixOS. see
            # https://github.com/cloudflare/workerd/issues/1482
            pkgs.nodePackages.wrangler
            # Wrangler needs runtime access to a CA cert bundle, make sure it
            # is installed
            pkgs.cacert];
          shellHook = ''
            # Tell Wrangler where to find the CA cert bundle.
            export SSL_CERT_FILE=$NIX_SSL_CERT_FILE
          '';
        };
      });
  };
}
