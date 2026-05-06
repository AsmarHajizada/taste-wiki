#!/usr/bin/env python3
"""
search_wiki.py — Full-text search across wiki pages.

Usage:
    python tools/search_wiki.py "query"
    python tools/search_wiki.py "query" --dir movies
    python tools/search_wiki.py "query" --dir themes --context 2
    python tools/search_wiki.py --list

No external dependencies — stdlib only.
"""

import argparse
import os
import re
import sys

WIKI_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "wiki")

# ANSI colors for terminal output
class C:
    BOLD = "\033[1m"
    DIM = "\033[2m"
    CYAN = "\033[36m"
    YELLOW = "\033[33m"
    GREEN = "\033[32m"
    MAGENTA = "\033[35m"
    RED = "\033[31m"
    RESET = "\033[0m"

    @staticmethod
    def strip():
        """Disable colors if not a TTY."""
        if not sys.stdout.isatty():
            C.BOLD = C.DIM = C.CYAN = C.YELLOW = ""
            C.GREEN = C.MAGENTA = C.RED = C.RESET = ""

C.strip()


def find_md_files(base_dir, subdir=None):
    """Find all .md files in the wiki, optionally filtered by subdirectory."""
    search_dir = os.path.join(base_dir, subdir) if subdir else base_dir
    if not os.path.isdir(search_dir):
        print(f"{C.RED}Directory not found: {search_dir}{C.RESET}")
        sys.exit(1)

    files = []
    for root, _, filenames in os.walk(search_dir):
        for f in filenames:
            if f.endswith(".md"):
                files.append(os.path.join(root, f))
    return sorted(files)


def search_file(filepath, query, context_lines=1):
    """Search a single file for the query. Returns list of matches."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except (IOError, UnicodeDecodeError):
        return []

    matches = []
    pattern = re.compile(re.escape(query), re.IGNORECASE)

    for i, line in enumerate(lines):
        if pattern.search(line):
            # Gather context
            start = max(0, i - context_lines)
            end = min(len(lines), i + context_lines + 1)
            context = []
            for j in range(start, end):
                prefix = "→ " if j == i else "  "
                context.append((j + 1, prefix, lines[j].rstrip()))

            matches.append({
                "line_num": i + 1,
                "line": line.strip(),
                "context": context,
            })

    return matches


def highlight(text, query):
    """Highlight query matches in text."""
    pattern = re.compile(f"({re.escape(query)})", re.IGNORECASE)
    return pattern.sub(f"{C.YELLOW}{C.BOLD}\\1{C.RESET}", text)


def relative_path(filepath):
    """Get path relative to wiki dir."""
    return os.path.relpath(filepath, WIKI_DIR)


def cmd_search(args):
    """Main search command."""
    query = args.query
    files = find_md_files(WIKI_DIR, args.dir)

    if not files:
        print(f"{C.DIM}No markdown files found.{C.RESET}")
        return

    total_matches = 0
    files_matched = 0

    for filepath in files:
        matches = search_file(filepath, query, args.context)
        if not matches:
            continue

        files_matched += 1
        rel = relative_path(filepath)
        print(f"\n{C.CYAN}{C.BOLD}{rel}{C.RESET}")

        for match in matches:
            total_matches += 1
            for line_num, prefix, text in match["context"]:
                if prefix == "→ ":
                    print(f"  {C.DIM}{line_num:4d}{C.RESET} {C.GREEN}{prefix}{C.RESET}{highlight(text, query)}")
                else:
                    print(f"  {C.DIM}{line_num:4d}{C.RESET} {C.DIM}{prefix}{text}{C.RESET}")
        print()

    # Summary
    if total_matches == 0:
        print(f"{C.DIM}No matches for \"{query}\".{C.RESET}")
    else:
        print(f"{C.DIM}─────────────────────────────{C.RESET}")
        print(f"{C.BOLD}{total_matches}{C.RESET} match{'es' if total_matches != 1 else ''} in {C.BOLD}{files_matched}{C.RESET} file{'s' if files_matched != 1 else ''}")


def cmd_list(args):
    """List all wiki pages."""
    files = find_md_files(WIKI_DIR, args.dir)

    if not files:
        print(f"{C.DIM}No markdown files found.{C.RESET}")
        return

    current_dir = None
    for filepath in files:
        rel = relative_path(filepath)
        d = os.path.dirname(rel) or "."

        if d != current_dir:
            current_dir = d
            print(f"\n{C.CYAN}{C.BOLD}{d}/{C.RESET}")

        name = os.path.basename(rel)
        # Try to extract title from first # heading
        title = ""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("# ") and not line.startswith("##"):
                        title = line[2:].strip()
                        break
        except (IOError, UnicodeDecodeError):
            pass

        if title:
            print(f"  {C.GREEN}{name}{C.RESET} — {title}")
        else:
            print(f"  {C.GREEN}{name}{C.RESET}")

    print(f"\n{C.DIM}{len(files)} pages total{C.RESET}")


def cmd_stats(args):
    """Show wiki statistics."""
    files = find_md_files(WIKI_DIR)

    # Count by directory
    dir_counts = {}
    total_words = 0
    total_links = 0

    for filepath in files:
        rel = relative_path(filepath)
        d = os.path.dirname(rel) or "root"
        dir_counts[d] = dir_counts.get(d, 0) + 1

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                total_words += len(content.split())
                total_links += len(re.findall(r"\[\[.+?\]\]", content))
        except (IOError, UnicodeDecodeError):
            pass

    print(f"\n{C.BOLD}Wiki Stats{C.RESET}")
    print(f"{C.DIM}─────────────────────────────{C.RESET}")
    print(f"  Pages:      {C.BOLD}{len(files)}{C.RESET}")
    print(f"  Words:      {C.BOLD}{total_words:,}{C.RESET}")
    print(f"  Wikilinks:  {C.BOLD}{total_links}{C.RESET}")
    print()

    print(f"{C.BOLD}By directory:{C.RESET}")
    for d in sorted(dir_counts.keys()):
        print(f"  {C.CYAN}{d}/{C.RESET}  {dir_counts[d]}")
    print()


def cmd_links(args):
    """Find broken or orphan wikilinks."""
    files = find_md_files(WIKI_DIR)

    # Build set of all page names (without extension, lowered)
    page_names = set()
    for filepath in files:
        name = os.path.splitext(os.path.basename(filepath))[0].lower()
        page_names.add(name)

    # Find all wikilinks and check if they resolve
    broken = []
    all_targets = set()

    for filepath in files:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
        except (IOError, UnicodeDecodeError):
            continue

        rel = relative_path(filepath)
        links = re.findall(r"\[\[(.+?)\]\]", content)

        for link in links:
            # Handle display names like [[slug|Display Name]]
            target = link.split("|")[0].strip().lower()
            # Normalize: replace spaces with hyphens for file matching
            target_slug = target.replace(" ", "-")
            all_targets.add(target_slug)

            if target_slug not in page_names and target not in page_names:
                broken.append((rel, link))

    # Find orphans (pages not linked to from anywhere)
    orphans = []
    for filepath in files:
        name = os.path.splitext(os.path.basename(filepath))[0].lower()
        # Skip core pages
        if name in ("index", "log", "profile", "recommendations"):
            continue
        if name not in all_targets and name.replace("-", " ") not in all_targets:
            orphans.append(relative_path(filepath))

    if broken:
        print(f"\n{C.RED}{C.BOLD}Broken links ({len(broken)}):{C.RESET}")
        for source, link in broken:
            print(f"  {C.DIM}{source}{C.RESET} → {C.YELLOW}[[{link}]]{C.RESET}")

    if orphans:
        print(f"\n{C.MAGENTA}{C.BOLD}Orphan pages ({len(orphans)}):{C.RESET}")
        for page in orphans:
            print(f"  {C.DIM}{page}{C.RESET}")

    if not broken and not orphans:
        print(f"\n{C.GREEN}All links healthy. No orphans.{C.RESET}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Search and inspect the taste wiki.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  python tools/search_wiki.py "melancholy"
  python tools/search_wiki.py "dark academia" --dir themes
  python tools/search_wiki.py "Tartt" --context 3
  python tools/search_wiki.py --list
  python tools/search_wiki.py --stats
  python tools/search_wiki.py --links
        """,
    )

    parser.add_argument("query", nargs="?", help="Search query")
    parser.add_argument("--dir", "-d", help="Limit search to a wiki subdirectory (e.g., movies, books, themes)")
    parser.add_argument("--context", "-c", type=int, default=1, help="Lines of context around each match (default: 1)")
    parser.add_argument("--list", "-l", action="store_true", help="List all wiki pages")
    parser.add_argument("--stats", "-s", action="store_true", help="Show wiki statistics")
    parser.add_argument("--links", action="store_true", help="Check for broken and orphan wikilinks")

    args = parser.parse_args()

    if args.list:
        cmd_list(args)
    elif args.stats:
        cmd_stats(args)
    elif args.links:
        cmd_links(args)
    elif args.query:
        cmd_search(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
