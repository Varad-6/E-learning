import asyncio
import json
import os
import tempfile
import threading
import time
from typing import Any, Dict, Set

_SYNC_FILE = os.path.join(tempfile.gettempdir(), "kaizen_live_sync_state.json")
_LOCK = threading.Lock()
_SUBSCRIBERS: Set[asyncio.Queue] = set()


class LiveSyncService:
    """Lightweight cross-worker state version bus and SSE pub/sub for immediate UI hot-sync."""

    @staticmethod
    def classify_topic(path: str) -> str:
        p = (path or "").lower()
        if any(seg in p for seg in ("/api/courses", "/courses", "/api/modules", "/api/contents", "/api/quizzes")):
            return "courses"
        if "/api/enrollments" in p or "/assign-course" in p:
            return "enrollments"
        if "/api/exams" in p:
            return "exams"
        if "/api/badges" in p:
            return "badges"
        if "/api/departments" in p:
            return "departments"
        if any(seg in p for seg in ("/api/admin", "/api/users", "/api/auth/profile")):
            return "users"
        if "/api/notifications" in p:
            return "notifications"
        return "all"

    @staticmethod
    def _default_state() -> Dict[str, Any]:
        return {
            "version": 1,
            "updated_at": time.time(),
            "last_topic": "all",
            "topics": {
                "courses": 1,
                "enrollments": 1,
                "exams": 1,
                "badges": 1,
                "departments": 1,
                "users": 1,
                "notifications": 1,
            },
        }

    @staticmethod
    def get_state() -> Dict[str, Any]:
        with _LOCK:
            try:
                if os.path.exists(_SYNC_FILE):
                    with open(_SYNC_FILE, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, dict) and "version" in data:
                            return data
            except Exception:
                pass
            state = LiveSyncService._default_state()
            LiveSyncService._write_state_unlocked(state)
            return state

    @staticmethod
    def _write_state_unlocked(state: Dict[str, Any]) -> None:
        tmp_path = f"{_SYNC_FILE}.{os.getpid()}.tmp"
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(state, f)
            os.replace(tmp_path, _SYNC_FILE)
        except Exception:
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass

    @staticmethod
    def publish_change(topic: str = "all") -> Dict[str, Any]:
        with _LOCK:
            state = None
            try:
                if os.path.exists(_SYNC_FILE):
                    with open(_SYNC_FILE, "r", encoding="utf-8") as f:
                        loaded = json.load(f)
                        if isinstance(loaded, dict) and "version" in loaded:
                            state = loaded
            except Exception:
                state = None

            if state is None:
                state = LiveSyncService._default_state()

            state["version"] = int(state.get("version", 0)) + 1
            state["updated_at"] = time.time()
            state["last_topic"] = topic
            topics = state.setdefault("topics", {})
            topics[topic] = int(topics.get(topic, 0)) + 1
            # Courses & enrollments also impact badges/dashboard views
            if topic == "enrollments":
                topics["badges"] = int(topics.get("badges", 0)) + 1
                topics["courses"] = int(topics.get("courses", 0)) + 1
            elif topic == "courses":
                topics["enrollments"] = int(topics.get("enrollments", 0)) + 1
            elif topic == "users":
                topics["departments"] = int(topics.get("departments", 0)) + 1

            LiveSyncService._write_state_unlocked(state)

        # Notify in-process SSE subscribers immediately
        for q in list(_SUBSCRIBERS):
            try:
                q.put_nowait(state)
            except asyncio.QueueFull:
                pass
            except Exception:
                pass
        return state

    @staticmethod
    def subscribe() -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=32)
        _SUBSCRIBERS.add(q)
        return q

    @staticmethod
    def unsubscribe(q: asyncio.Queue) -> None:
        _SUBSCRIBERS.discard(q)
