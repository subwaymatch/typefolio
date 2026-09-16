#!/usr/bin/env bash
#
# Copies the publishable part of the repository into a directory.
#
# The template has no build step, so this is a copy rather than a build. It
# exists so the deployed site contains only what a visitor needs: the tests,
# the workflows and the package manifests stay out of it.
#
# Usage: .github/scripts/assemble-site.sh <destination>

set -euo pipefail

dest="${1:?usage: assemble-site.sh <destination>}"

rm -rf "$dest"
mkdir -p "$dest"

cp -R ./*.html "$dest"/
cp -R css js fonts images "$dest"/

# Without this, GitHub Pages runs the output through Jekyll, which skips files
# and directories whose names begin with an underscore.
touch "$dest/.nojekyll"

# _headers is configuration for Cloudflare Pages and Netlify. GitHub Pages
# cannot set custom headers, so publishing it would only expose a config file.
rm -f "$dest/_headers"

echo "Assembled $(find "$dest" -type f | wc -l) files into $dest"
