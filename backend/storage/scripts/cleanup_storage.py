import argparse
import json
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
STORAGE_DIR = BACKEND_DIR / "storage"


def parse_args():
    parser = argparse.ArgumentParser(description="Limpa uploads/resultados antigos do storage local.")
    parser.add_argument("--older-than-days", type=int, default=7)
    parser.add_argument("--uploads-dir", type=Path, default=STORAGE_DIR / "uploads")
    parser.add_argument("--results-dir", type=Path, default=STORAGE_DIR / "results")
    parser.add_argument("--jobs-dir", type=Path, default=STORAGE_DIR / "jobs")
    parser.add_argument("--delete", action="store_true", help="Executa a remocao. Sem isso, roda em dry-run.")
    return parser.parse_args()


def ensure_inside_storage(path: Path) -> Path:
    resolved = path.resolve()
    storage_root = STORAGE_DIR.resolve()
    if resolved != storage_root and storage_root not in resolved.parents:
        raise ValueError(f"Caminho fora de backend/storage: {resolved}")
    return resolved


def collect_old_job_dirs(base_dir: Path, cutoff: datetime) -> list[dict]:
    base_dir = ensure_inside_storage(base_dir)
    if not base_dir.exists():
        return []

    old_dirs = []
    for child in base_dir.iterdir():
        if not child.is_dir():
            continue

        modified_at = datetime.fromtimestamp(child.stat().st_mtime, timezone.utc)
        if modified_at < cutoff:
            old_dirs.append(
                {
                    "path": str(child),
                    "modified_at": modified_at.isoformat(),
                    "size_bytes": directory_size(child),
                }
            )

    return old_dirs


def directory_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def main() -> None:
    args = parse_args()
    cutoff = datetime.now(timezone.utc) - timedelta(days=args.older_than_days)
    candidates = {
        "uploads": collect_old_job_dirs(args.uploads_dir, cutoff),
        "results": collect_old_job_dirs(args.results_dir, cutoff),
        "jobs": collect_old_job_dirs(args.jobs_dir, cutoff),
    }

    if args.delete:
        for group in candidates.values():
            for item in group:
                shutil.rmtree(item["path"])

    print(
        json.dumps(
            {
                "mode": "delete" if args.delete else "dry-run",
                "older_than_days": args.older_than_days,
                "cutoff": cutoff.isoformat(),
                "candidates": candidates,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
