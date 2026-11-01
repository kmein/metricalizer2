{
  description = "metricalizer2: rule-based German meter analysis";

  inputs = {
    nixpkgs.url = "https://channels.nixos.org/nixpkgs-unstable/nixexprs.tar.zst";
  };

  outputs =
    inputs:
    let
      src =
        pkgs:
        pkgs.lib.fileset.toSource {
          root = ./.;
          fileset = pkgs.lib.fileset.unions [
            ./deno.json
            ./src
            ./web
            ./tests
            ./fixtures
          ];
        };
    in
    {
      packages = builtins.mapAttrs (system: pkgs: {
        default = pkgs.writeShellApplication {
          name = "metricalizer2";
          runtimeInputs = [ pkgs.deno ];
          text = ''exec deno run --no-prompt --allow-read --config ${src pkgs}/deno.json ${src pkgs}/src/cli.ts "$@"'';
        };
        site = pkgs.runCommand "metricalizer2-site" { nativeBuildInputs = [ pkgs.esbuild ]; } ''
          mkdir -p $out
          esbuild ${src pkgs}/web/main.ts --bundle --format=esm --outfile=$out/app.js
          cp ${src pkgs}/web/index.html ${src pkgs}/web/style.css $out/
        '';
      }) inputs.nixpkgs.legacyPackages;

      checks = builtins.mapAttrs (system: pkgs: {
        test = pkgs.runCommand "metricalizer2-test" { nativeBuildInputs = [ pkgs.deno ]; } ''
          export HOME=$TMPDIR DENO_DIR=$TMPDIR/deno
          cd ${src pkgs}
          deno test --no-prompt tests/
          touch $out
        '';
      }) inputs.nixpkgs.legacyPackages;

      devShells = builtins.mapAttrs (system: pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.deno
            pkgs.esbuild
          ];
        };
      }) inputs.nixpkgs.legacyPackages;
    };
}
