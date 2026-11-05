#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js 20.19 or newer is required. Install Node.js LTS first.' >&2
  exit 1
fi
echo 'Open http://localhost:4174/ in your browser.'
exec node Larp_Multiplayer.cjs --html Larp_Factory_V3.html
