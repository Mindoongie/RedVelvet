"""Server FastAPI — stateless: nhận event, lưu SQLite, phục vụ API đọc +
SSE cho dashboard. KHÔNG giữ bất kỳ state phân tích nào theo tài xế — chỉ lưu
trữ sự kiện đã được edge tính toán xong và mức rủi ro nền do dashboard đặt.
"""
from __future__ import annotations

import asyncio
import base64
import json
import sqlite3
import threading
from collections import deque
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from pydantic import BaseModel

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"


def _load_server_config() -> dict[str, Any]:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        full = yaml.safe_load(f)
    return full["server"]


_cfg = _load_server_config()
DB_PATH = Path(_cfg["db_path"])
CONTEXT_FILE = Path(_cfg["context_file"])
EVIDENCE_DIR = DB_PATH.parent / "evidence_server"

DB_PATH.parent.mkdir(parents=True, exist_ok=True)
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

_db_lock = threading.Lock()
_conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
_conn.execute(
    """
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        xe_id TEXT,
        tai_xe_id TEXT,
        ts REAL,
        muc INTEGER,
        perclos REAL,
        ngap_phut REAL,
        gat_phut REAL,
        ear REAL,
        image_path TEXT,
        loai TEXT
    )
    """
)
_conn.commit()


def _dam_bao_cot(ten_cot: str, kieu_sql: str) -> None:
    """Migration nhẹ: thêm cột nếu DB cũ (v1) chưa có — data/ là local/gitignored
    nhưng vẫn tôn trọng DB đã tồn tại thay vì ép người dùng xoá tay."""
    cols = [row[1] for row in _conn.execute("PRAGMA table_info(events)").fetchall()]
    if ten_cot not in cols:
        _conn.execute(f"ALTER TABLE events ADD COLUMN {ten_cot} {kieu_sql}")
        _conn.commit()


_dam_bao_cot("loai", "TEXT")

app = FastAPI(title="Server canh bao hanh vi mat an toan (demo, stateless)")

_subscribers: list[asyncio.Queue] = []
_subscribers_lock = threading.Lock()

# Nhịp đo định kỳ NHẸ (không ảnh, không phải "sự kiện cảnh báo") để dashboard vẽ
# đồ thị PERCLOS theo thời gian. Giữ trong bộ nhớ (ring buffer) — đây là dữ liệu
# hiển thị tức thời, không phải state phân tích per-driver dài hạn.
_telemetry: deque = deque(maxlen=1000)
_telemetry_lock = threading.Lock()


class ChiSo(BaseModel):
    perclos: float | None = None
    ngap_phut: float | None = None
    gat_phut: float | None = None
    ear: float | None = None


class EventIn(BaseModel):
    xe_id: str
    tai_xe_id: str
    ts: float
    muc: int
    chi_so: ChiSo
    anh_minh_chung: str | None = None
    loai: str = "canh_bao_hanh_vi"  # "canh_bao_hanh_vi" | "mat_mat_sau_chui_dau"


class ContextIn(BaseModel):
    muc: str


class TelemetryIn(BaseModel):
    xe_id: str
    ts: float
    muc: int
    perclos: float | None = None
    ngap_phut: float | None = None
    gat_phut: float | None = None
    ear: float | None = None
    layer1_latency_ms: float | None = None
    kha_dung: bool | None = None
    nguon_tin_hieu: str | None = None
    profile: str | None = None
    coverage: float | None = None


def _doc_context_hien_tai() -> str:
    try:
        if CONTEXT_FILE.exists():
            data = json.loads(CONTEXT_FILE.read_text(encoding="utf-8"))
            muc = data.get("muc")
            if muc in ("binh_thuong", "cao"):
                return muc
    except Exception:
        pass
    return "binh_thuong"


def _ghi_context(muc: str) -> None:
    CONTEXT_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONTEXT_FILE.write_text(json.dumps({"muc": muc}), encoding="utf-8")


async def _broadcast(payload: dict[str, Any]) -> None:
    message = json.dumps(payload, ensure_ascii=False)
    with _subscribers_lock:
        queues = list(_subscribers)
    for q in queues:
        await q.put(message)


@app.post("/api/event")
async def nhan_event(ev: EventIn):
    """Nhận một sự kiện đã được Lớp 2 quyết định (mức >= 2). Ghi JSONL/SQLite,
    lưu ảnh minh chứng nếu có, phát realtime cho dashboard qua SSE."""
    image_path = None
    if ev.anh_minh_chung:
        try:
            raw = base64.b64decode(ev.anh_minh_chung)
            filename = f"evidence_{int(ev.ts * 1000)}.jpg"
            image_path = str(EVIDENCE_DIR / filename)
            Path(image_path).write_bytes(raw)
        except Exception:
            image_path = None

    with _db_lock:
        cur = _conn.execute(
            "INSERT INTO events (xe_id, tai_xe_id, ts, muc, perclos, ngap_phut, gat_phut, ear, image_path, loai) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                ev.xe_id, ev.tai_xe_id, ev.ts, ev.muc,
                ev.chi_so.perclos, ev.chi_so.ngap_phut, ev.chi_so.gat_phut, ev.chi_so.ear,
                image_path, ev.loai,
            ),
        )
        _conn.commit()
        event_id = cur.lastrowid

    await _broadcast({
        "type": "event",
        "id": event_id,
        "xe_id": ev.xe_id,
        "tai_xe_id": ev.tai_xe_id,
        "ts": ev.ts,
        "muc": ev.muc,
        "chi_so": ev.chi_so.dict(),
        "co_anh": image_path is not None,
        "loai": ev.loai,
    })
    return {"ok": True, "id": event_id}


@app.post("/api/telemetry")
async def nhan_telemetry(t: TelemetryIn):
    """Nhịp đo định kỳ nhẹ — KHÔNG chứa ảnh — chỉ dùng để vẽ đồ thị PERCLOS realtime."""
    record = t.dict()
    with _telemetry_lock:
        _telemetry.append(record)
    await _broadcast({"type": "telemetry", **record})
    return {"ok": True}


@app.get("/api/telemetry")
def liet_ke_telemetry(limit: int = 200):
    with _telemetry_lock:
        items = list(_telemetry)[-limit:]
    return items


@app.get("/api/events")
def liet_ke_events(limit: int = 50):
    with _db_lock:
        rows = _conn.execute(
            "SELECT id, xe_id, tai_xe_id, ts, muc, perclos, ngap_phut, gat_phut, ear, image_path, loai "
            "FROM events ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    result = []
    for r in rows:
        result.append({
            "id": r[0], "xe_id": r[1], "tai_xe_id": r[2], "ts": r[3], "muc": r[4],
            "perclos": r[5], "ngap_phut": r[6], "gat_phut": r[7], "ear": r[8],
            "co_anh": r[9] is not None, "loai": r[10] or "canh_bao_hanh_vi",
        })
    return result


@app.get("/api/events/{event_id}/image")
def lay_anh(event_id: int):
    with _db_lock:
        row = _conn.execute("SELECT image_path FROM events WHERE id = ?", (event_id,)).fetchone()
    if row is None or row[0] is None or not Path(row[0]).exists():
        raise HTTPException(status_code=404, detail="Không có ảnh minh chứng cho event này")
    return FileResponse(row[0])


@app.get("/api/context")
def lay_context():
    return {"muc": _doc_context_hien_tai()}


@app.post("/api/context")
async def dat_context(ctx: ContextIn):
    if ctx.muc not in ("binh_thuong", "cao"):
        raise HTTPException(status_code=400, detail="muc phải là 'binh_thuong' hoặc 'cao'")
    _ghi_context(ctx.muc)
    await _broadcast({"type": "context", "muc": ctx.muc})
    return {"ok": True, "muc": ctx.muc}


@app.get("/api/stream")
async def stream(request: Request):
    """SSE — dashboard nghe realtime event mới + thay đổi mức rủi ro nền."""
    queue: asyncio.Queue = asyncio.Queue()
    with _subscribers_lock:
        _subscribers.append(queue)

    async def event_generator():
        try:
            yield f"data: {json.dumps({'type': 'hello'})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {message}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            with _subscribers_lock:
                if queue in _subscribers:
                    _subscribers.remove(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/", response_class=HTMLResponse)
def dashboard_index():
    html_path = Path(__file__).resolve().parent.parent / "dashboard" / "index.html"
    return html_path.read_text(encoding="utf-8")
