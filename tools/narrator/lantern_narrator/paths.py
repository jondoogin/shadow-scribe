"""Where the narrator keeps models, job state and output. All overridable by env."""
from __future__ import annotations

import os
from pathlib import Path


def home() -> Path:
    return Path(os.environ.get("LANTERN_NARRATOR_HOME", Path.home() / ".lantern-narrator"))


def models_dir() -> Path:
    return home() / "models"


def jobs_dir() -> Path:
    return home() / "jobs"
