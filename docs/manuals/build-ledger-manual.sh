#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
docker run --rm \
  -v "${SCRIPT_DIR}:/work" \
  -w /work \
  texlive/texlive:latest \
  sh -lc 'lualatex -interaction=nonstopmode ledger-operations-manual.tex && lualatex -interaction=nonstopmode ledger-operations-manual.tex'
