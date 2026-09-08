#!/usr/bin/env python3

import argparse
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schema" / "finding.schema.json"
FINDINGS_DIR = ROOT / "content" / "findings"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "files",
        nargs="*",
        help="検証するFindingのJSONファイル。省略時はcontent/findings配下を全件検証する。",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema, format_checker=FormatChecker())

    if args.files:
        files = [Path(path) for path in args.files]
    else:
        files = sorted(FINDINGS_DIR.glob("*.json")) if FINDINGS_DIR.exists() else []

    failed = False

    for path in files:
        if not path.is_file():
            print(f"{path}: ファイルが存在しません。", file=sys.stderr)
            failed = True
            continue

        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"{path}: JSONとして読み込めません: {exc}", file=sys.stderr)
            failed = True
            continue

        errors = sorted(validator.iter_errors(data), key=lambda error: list(error.path))
        if not errors:
            continue

        failed = True
        for error in errors:
            location = ".".join(str(part) for part in error.path) or "<root>"
            print(f"{path}:{location}: {error.message}", file=sys.stderr)

    if failed:
        return 1

    print(f"{len(files)}件のFindingがスキーマに適合しています。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
