import json
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

from .exceptions import TemplateGenError


TEMP_BASE: Path = Path(__file__).parent.parent.parent / ".temp"
STATE_FILE: Path = TEMP_BASE / ".current_task.json"


@dataclass
class TaskState:
    task: str
    version: int
    updated_at: str

    def to_dict(self) -> dict:
        return {
            "task": self.task,
            "version": self.version,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "TaskState":
        return cls(
            task=data["task"],
            version=data["version"],
            updated_at=data["updated_at"],
        )


class TaskPaths:
    def __init__(self, task: str, version: int):
        self.task = task
        self.version = version

    @classmethod
    def find_latest_input_docx(cls) -> Optional[Path]:
        """Find the newest docx file in .temp/*/input/ directories."""
        if not TEMP_BASE.exists():
            return None
        
        candidates = []
        for task_dir in TEMP_BASE.iterdir():
            if task_dir.is_dir() and task_dir.name != ".current_task.json":
                input_dir = task_dir / "input"
                if input_dir.exists():
                    for docx_file in input_dir.glob("*.docx"):
                        candidates.append(docx_file)
        
        if not candidates:
            return None
        
        return max(candidates, key=lambda p: p.stat().st_mtime)

    @classmethod
    def from_latest_input(cls) -> "TaskPaths":
        """Create TaskPaths from the latest input docx file."""
        docx_path = cls.find_latest_input_docx()
        if docx_path is None:
            raise TemplateGenError(
                "No docx files found in .temp/*/input/. "
                "Run /generate-template with a docx file first."
            )
        task = docx_path.stem
        version = cls._get_latest_version(task)
        if version is None:
            version = 1
        return cls(task=task, version=version)

    @classmethod
    def get_current(cls) -> "TaskPaths":
        state = cls._read_state()
        if state is None:
            raise TemplateGenError(
                "No current task set. Run /generate-template with a docx file first."
            )
        return cls(task=state.task, version=state.version)

    @classmethod
    def create_or_next_version(cls, docx_path: str) -> "TaskPaths":
        source = Path(docx_path).resolve()
        if not source.exists():
            raise TemplateGenError(f"DOCX file not found: {docx_path}")

        task = source.stem
        version = cls._get_next_version(task)

        instance = cls(task=task, version=version)
        instance._ensure_directories()
        instance._copy_input_docx(source)

        cls._write_state(TaskState(
            task=task,
            version=version,
            updated_at=datetime.now().isoformat(timespec="seconds"),
        ))

        return instance

    @classmethod
    def set_current(cls, task: str, version: Optional[int] = None) -> "TaskPaths":
        task_dir = TEMP_BASE / task
        if not task_dir.exists():
            raise TemplateGenError(f"Task directory not found: {task_dir}")

        if version is None:
            version = cls._get_latest_version(task)
            if version is None:
                raise TemplateGenError(f"No versions found for task: {task}")

        instance = cls(task=task, version=version)

        cls._write_state(TaskState(
            task=task,
            version=version,
            updated_at=datetime.now().isoformat(timespec="seconds"),
        ))

        return instance

    @property
    def task_dir(self) -> Path:
        return TEMP_BASE / self.task

    @property
    def input_dir(self) -> Path:
        return self.task_dir / "input"

    @property
    def temp_dir(self) -> Path:
        return self.task_dir / f"temp-v{self.version}"

    @property
    def output_dir(self) -> Path:
        return self.task_dir / f"output-v{self.version}"

    @property
    def input_docx(self) -> Path:
        return self.input_dir / f"{self.task}.docx"

    @property
    def parsed_json(self) -> Path:
        return self.temp_dir / "parsed.json"

    @property
    def placeholders_json(self) -> Path:
        return self.temp_dir / "placeholders.json"

    @property
    def descriptions_json(self) -> Path:
        return self.temp_dir / "descriptions.json"

    @property
    def fill_data_json(self) -> Path:
        return self.temp_dir / "fill_data.json"

    @property
    def descriptions_csv(self) -> Path:
        return self.output_dir / "descriptions.csv"

    @property
    def template_docx(self) -> Path:
        return self.output_dir / "template.docx"

    @property
    def filled_docx(self) -> Path:
        return self.output_dir / "filled.docx"

    def _ensure_directories(self) -> None:
        self.input_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _copy_input_docx(self, source: Path) -> None:
        dest = self.input_docx
        if not dest.exists():
            shutil.copy2(source, dest)

    @classmethod
    def _read_state(cls) -> Optional[TaskState]:
        if not STATE_FILE.exists():
            return None
        try:
            data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            return TaskState.from_dict(data)
        except (json.JSONDecodeError, KeyError):
            return None

    @classmethod
    def _write_state(cls, state: TaskState) -> None:
        TEMP_BASE.mkdir(parents=True, exist_ok=True)
        STATE_FILE.write_text(
            json.dumps(state.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    @classmethod
    def _get_next_version(cls, task: str) -> int:
        task_dir = TEMP_BASE / task
        if not task_dir.exists():
            return 1

        versions = []
        for item in task_dir.iterdir():
            if item.is_dir() and item.name.startswith("temp-v"):
                try:
                    v = int(item.name[6:])
                    versions.append(v)
                except ValueError:
                    pass

        return max(versions, default=0) + 1

    @classmethod
    def _get_latest_version(cls, task: str) -> Optional[int]:
        task_dir = TEMP_BASE / task
        if not task_dir.exists():
            return None

        versions = []
        for item in task_dir.iterdir():
            if item.is_dir() and item.name.startswith("temp-v"):
                try:
                    v = int(item.name[6:])
                    versions.append(v)
                except ValueError:
                    pass

        return max(versions) if versions else None

    def __repr__(self) -> str:
        return f"TaskPaths(task={self.task!r}, version={self.version})"