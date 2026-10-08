#!/usr/bin/env bash
# Compare this grammar's parses of a mozilla-central checkout's XPIDL files
# (those in moz.build files' XPIDL_SOURCES) with xpidl.py's, the
# authoritative parser: their interfaces, members (and their kinds, names,
# parameter counts, ...), includes, natives, typedefs, and webidl
# declarations should be identical.
#
# usage: script/compare-with-xpidl-py.sh MOZILLA_CENTRAL
set -euo pipefail
GRAMMAR=$(cd "$(dirname "$0")/.." && pwd)
cd "$1"
OUT=$(mktemp -d)
python3 - > "$OUT/sources.txt" <<'PY'
import os, re
out = set()
for root, dirs, files in os.walk('.'):
    if 'moz.build' not in files or '/third_party/' in root or root.startswith('./obj'):
        continue
    s = open(os.path.join(root, 'moz.build'), errors='replace').read()
    for m in re.finditer(r'XPIDL_SOURCES\s*\+?=\s*\[(.*?)\]', s, re.S):
        for name in re.findall(r'["\']([^"\']+\.idl)["\']', m.group(1)):
            path = os.path.normpath(os.path.join(root, name))
            if os.path.exists(path):
                out.add(path)
for path in sorted(out):
    print(path)
PY
echo "$(wc -l < "$OUT/sources.txt") XPIDL files"
python3 "$GRAMMAR/script/dump-xpidl-py.py" < "$OUT/sources.txt" > "$OUT/xpidl-py.tsv"
(cd "$GRAMMAR" && cargo build -q --release --example dump)
"$GRAMMAR/target/release/examples/dump" < "$OUT/sources.txt" > "$OUT/tree-sitter.tsv"
if diff "$OUT/xpidl-py.tsv" "$OUT/tree-sitter.tsv"; then
    echo "Identical: $(wc -l < "$OUT/tree-sitter.tsv") declarations"
else
    echo "Differences above (in $OUT)"
    exit 1
fi
