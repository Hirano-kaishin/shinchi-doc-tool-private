import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List


def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


class ProjectStore:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.path = self.data_dir / "projects.json"
        if not self.path.exists():
            self.path.write_text("{}", encoding="utf-8")

    def _load(self) -> Dict[str, Any]:
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    def _save(self, data: Dict[str, Any]) -> None:
        self.path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def list(self) -> List[Dict[str, Any]]:
        data = self._load()
        items = []
        for pid, payload in data.items():
            items.append(
                {
                    "id": pid,
                    "name": payload.get("koji_gaiyo", {}).get("koji_mei", "(名称未設定)"),
                    "updated_at": payload.get("updated_at", ""),
                }
            )
        items.sort(key=lambda x: x["updated_at"], reverse=True)
        return items

    def get(self, pid: str) -> Dict[str, Any]:
        return self._load().get(pid, {})

    def upsert(self, payload: Dict[str, Any], pid: str | None = None) -> Dict[str, Any]:
        data = self._load()
        pid = pid or uuid.uuid4().hex[:12]
        payload["updated_at"] = _now_iso()
        payload.setdefault("id", pid)
        data[pid] = payload
        self._save(data)
        return payload

    def delete(self, pid: str) -> bool:
        data = self._load()
        if pid not in data:
            return False
        del data[pid]
        self._save(data)
        return True
