#!/usr/bin/env python3
"""
build_data.py — Parse wiki markdown files into data.json for the dashboard.

Usage:
    python tools/build_data.py
    python tools/build_data.py --serve
"""

import argparse
import http.server
import json
import os
import re
import sys
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIKI_DIR = os.path.join(BASE_DIR, "wiki")
APP_DIR = os.path.join(BASE_DIR, "app")


def parse_frontmatter(content):
    if not content.startswith("---"):
        return {}, content
    end = content.find("---", 3)
    if end == -1:
        return {}, content
    yaml_str = content[3:end].strip()
    body = content[end + 3:].strip()
    fm = {}
    for line in yaml_str.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if value.isdigit():
                value = int(value)
            fm[key] = value
    return fm, body


def extract_wikilinks(content):
    links = re.findall(r"\[\[(.+?)\]\]", content)
    result = []
    for link in links:
        parts = link.split("|")
        slug = parts[0].strip()
        display = parts[1].strip() if len(parts) > 1 else slug
        result.append({"slug": slug.lower().replace(" ", "-"), "display": display})
    return result


def extract_sections(body):
    sections = {}
    heading = None
    lines = []
    for line in body.split("\n"):
        if line.startswith("## ") and not line.startswith("###"):
            if heading:
                sections[heading] = "\n".join(lines).strip()
            heading = line[3:].strip()
            lines = []
        elif heading is not None:
            lines.append(line)
    if heading:
        sections[heading] = "\n".join(lines).strip()
    return sections


def parse_log(content):
    entries = []
    pattern = re.compile(r"^## \[(\d{4}-\d{2}-\d{2})\] (\w+) \| (\w+) \| (.+)$")
    lines = content.split("\n")
    i = 0
    while i < len(lines):
        m = pattern.match(lines[i])
        if m:
            date, action, typ, title = m.groups()
            body_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith("## ["):
                if lines[i].strip():
                    body_lines.append(lines[i].strip())
                i += 1
            entries.append({"date": date, "action": action, "type": typ, "title": title, "body": " ".join(body_lines)})
        else:
            i += 1
    return entries


DIR_TYPE_MAP = {
    "books": "book", "movies": "movie", "shows": "show", "music": "music",
    "people": "person", "themes": "theme", "moods": "mood",
    "quotes": "quote", "questions": "question", "lists": "list",
}

CORE_FILES = {"index.md", "log.md", "profile.md", "recommendations.md"}


def build():
    pages = {}
    items = []
    connections = []

    for root, _, filenames in os.walk(WIKI_DIR):
        for fname in sorted(filenames):
            if not fname.endswith(".md"):
                continue
            path = os.path.join(root, fname)
            rel = os.path.relpath(path, WIKI_DIR)
            try:
                content = open(path, "r", encoding="utf-8").read()
            except Exception:
                continue

            slug = os.path.splitext(fname)[0]
            fm, body = parse_frontmatter(content)
            sections = extract_sections(body)
            links = extract_wikilinks(content)

            dir_name = rel.split(os.sep)[0] if os.sep in rel or "/" in rel else ""
            item_type = fm.get("type", DIR_TYPE_MAP.get(dir_name, "core"))

            title = fm.get("title") or fm.get("name", "")
            if not title:
                for line in body.split("\n"):
                    if line.startswith("# ") and not line.startswith("##"):
                        title = line[2:].strip()
                        break
            if not title:
                title = slug.replace("-", " ").title()

            page = {
                "id": slug,
                "title": title,
                "type": item_type,
                "path": rel,
                "frontmatter": fm,
                "sections": sections,
                "content": body,
                "links": [l["display"] for l in links],
                "_link_slugs": [l["slug"] for l in links],
                "status": fm.get("status", ""),
                "rating": fm.get("rating", ""),
            }
            pages[slug] = page

            if rel in CORE_FILES or item_type == "list":
                continue
            items.append(page)

    # build connections
    seen = set()
    for page in items:
        for ls in page.get("_link_slugs", []):
            target = pages.get(ls)
            if target and target["id"] != page["id"]:
                key = tuple(sorted([page["id"], target["id"]]))
                if key not in seen:
                    seen.add(key)
                    connections.append({"source": page["id"], "target": target["id"]})

    # parse special files
    log_entries = []
    lp = os.path.join(WIKI_DIR, "log.md")
    if os.path.exists(lp):
        log_entries = parse_log(open(lp, "r").read())

    profile = {"sections": {}, "content": ""}
    pp = os.path.join(WIKI_DIR, "profile.md")
    if os.path.exists(pp):
        _, pbody = parse_frontmatter(open(pp, "r").read())
        profile = {"sections": extract_sections(pbody), "content": pbody}

    # type counts
    by_type = {}
    for item in items:
        by_type[item["type"]] = by_type.get(item["type"], 0) + 1

    # clean internal fields
    for item in items:
        item.pop("_link_slugs", None)

    data = {
        "items": items,
        "connections": connections,
        "stats": {"total": len(items), "by_type": by_type, "connections": len(connections)},
        "profile": profile,
        "log": log_entries,
        "generated": datetime.now().isoformat(),
    }

    os.makedirs(APP_DIR, exist_ok=True)
    out = os.path.join(APP_DIR, "data.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✓ {len(items)} items, {len(connections)} connections → app/data.json")
    return data


def serve(port=8000):
    os.chdir(APP_DIR)
    handler = http.server.SimpleHTTPRequestHandler
    with http.server.HTTPServer(("", port), handler) as s:
        print(f"→ http://localhost:{port}")
        s.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", "-s", action="store_true", help="Start local server after build")
    parser.add_argument("--port", "-p", type=int, default=8000)
    args = parser.parse_args()
    build()
    if args.serve:
        serve(args.port)
