from pathlib import Path
import itertools
from typing import Iterable

def print_with_numbers(path: Path, start: int, end: int):
    lines = path.read_text().splitlines()
    for idx in range(start - 1, min(end, len(lines))):
        print(f"{idx + 1}: {lines[idx]}")

if __name__ == "__main__":
    path = Path('hireops/frontend/app/(dashboards)/manager/page.tsx')
    total = len(path.read_text().splitlines())
    print_with_numbers(path, 1, min(total, 200))
