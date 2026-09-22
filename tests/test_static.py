"""Статические проверки лендинга (без бэкенда)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_core_pages_exist():
    for name in ("index.html", "offer.html", "success.html"):
        assert (ROOT / name).is_file()


def test_index_wires_life_api():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "const LIFE_API" in html
    assert 'api("/api/intent")' in html or "/api/intent" in html
    assert 'api("/api/behavior")' in html or "/api/behavior" in html
    assert 'api("/api/dates")' in html or "/api/dates" in html


def test_vercel_json_valid():
    data = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
    assert "headers" in data or "rewrites" in data or isinstance(data, dict)


def test_success_page_mentions_order_or_bot():
    text = (ROOT / "success.html").read_text(encoding="utf-8")
    assert "order" in text.lower() or "telegram" in text.lower() or "бот" in text.lower()
