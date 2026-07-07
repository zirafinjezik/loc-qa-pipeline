#!/usr/bin/env python3
"""Change a language code in a TMX file.

Rewrites srclang, adminlang, and xml:lang attributes whose value matches
--from, leaving everything else byte-for-byte identical. Same behavior as
the browser tool in index.html. No dependencies.

Usage:
    python scripts/convert_language_code.py input.tmx output.tmx --from en-US --to en-GB
"""

import argparse
import re
import sys

ATTRS = ("srclang", "adminlang", "xml:lang")


def convert_language_code(content, src, dst):
    """Return (converted_text, replacement_count)."""
    count = 0
    out = content

    def repl(m):
        nonlocal count
        count += 1
        return m.group(1) + m.group(2) + dst + m.group(2)

    for attr in ATTRS:
        pattern = re.compile(
            r"(" + re.escape(attr) + r"\s*=\s*)([\"'])" + re.escape(src) + r"\2"
        )
        out = pattern.sub(repl, out)

    return out, count


def main(argv=None):
    p = argparse.ArgumentParser(description="Change a language code in a TMX file.")
    p.add_argument("input", help="input TMX file")
    p.add_argument("output", help="output TMX file")
    p.add_argument("--from", dest="src", required=True, metavar="CODE", help="code to replace, e.g. en-US")
    p.add_argument("--to", dest="dst", required=True, metavar="CODE", help="replacement code, e.g. en-GB")
    args = p.parse_args(argv)

    if args.src == args.dst:
        p.error("--from and --to are the same, nothing to change")

    with open(args.input, "r", encoding="utf-8") as f:
        content = f.read()

    out, count = convert_language_code(content, args.src, args.dst)

    if count == 0:
        print(f"No instances of {args.src} found in {', '.join(ATTRS)}. Nothing written.", file=sys.stderr)
        return 1

    with open(args.output, "w", encoding="utf-8", newline="") as f:
        f.write(out)

    print(f"Changed {count} attribute(s). Saved as: {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
