"""Статические проверки лендинга (без бэкенда)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    "index.html",
    "vstrecha.html",
    "programma.html",
    "komu.html",
    "faq.html",
    "offer.html",
)


def test_core_pages_exist():
    for name in ("index.html", "offer.html", "success.html", "robots.txt", "sitemap.xml", ".htaccess"):
        assert (ROOT / name).is_file(), name


def test_every_indexable_page_has_canonical_and_jsonld():
    for name in PAGES:
        html = (ROOT / name).read_text(encoding="utf-8")
        assert 'rel="canonical"' in html, name
        assert "application/ld+json" in html, name
        assert "malik-khubiev.ru" in html, name


def test_index_has_rich_entities():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in ('"WebSite"', '"Organization"', '"Person"', '"Service"', '"Course"', '"BreadcrumbList"'):
        assert token in html, token


def test_faq_is_faqpage():
    html = (ROOT / "faq.html").read_text(encoding="utf-8")
    assert '"FAQPage"' in html
    assert '"Question"' in html


def test_vstrecha_has_howto():
    html = (ROOT / "vstrecha.html").read_text(encoding="utf-8")
    assert '"HowTo"' in html
    assert '"HowToStep"' in html


def test_programma_has_course():
    html = (ROOT / "programma.html").read_text(encoding="utf-8")
    assert '"Course"' in html
    assert '"CourseInstance"' in html


def test_robots_points_to_apex_host():
    text = (ROOT / "robots.txt").read_text(encoding="utf-8")
    assert "Sitemap: https://malik-khubiev.ru/sitemap.xml" in text
    assert "Host: malik-khubiev.ru" in text
    assert "Disallow: /success.html" in text


def test_sitemap_lists_money_pages():
    xml = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    for loc in (
        "https://malik-khubiev.ru/",
        "https://malik-khubiev.ru/vstrecha.html",
        "https://malik-khubiev.ru/programma.html",
        "https://malik-khubiev.ru/faq.html",
        "https://malik-khubiev.ru/komu.html",
    ):
        assert f"<loc>{loc}</loc>" in xml, loc


def test_htaccess_canonicalizes_www():
    conf = (ROOT / ".htaccess").read_text(encoding="utf-8")
    assert "www\\.malik-khubiev\\.ru" in conf
    assert "R=301" in conf


def test_success_page_noindex():
    text = (ROOT / "success.html").read_text(encoding="utf-8")
    assert "noindex" in text.lower()
    assert "telegram" in text.lower() or "бот" in text.lower()


def test_internal_home_links_prefer_slash():
    for name in ("index.html", "vstrecha.html", "programma.html", "komu.html", "faq.html"):
        html = (ROOT / name).read_text(encoding="utf-8")
        # Prefer canonical "/" over "./index.html" for crawl equity
        assert 'href="./index.html"' not in html, name


def test_jsonld_blocks_parse():
    for name in PAGES:
        html = (ROOT / name).read_text(encoding="utf-8")
        blocks = re.findall(
            r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>',
            html,
            flags=re.S,
        )
        assert blocks, name
        for raw in blocks:
            json.loads(raw)
