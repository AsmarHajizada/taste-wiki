# Taste Wiki

A personal, LLM-maintained wiki that maps your cultural taste over time — books, movies, shows, music, quotes, and the connections between them.

Based on [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). You curate sources and ask questions. The LLM does all the bookkeeping — summarizing, cross-referencing, filing, and maintaining consistency.

## How it works

Two windows, side by side:

| Window | Role |
|--------|------|
| **LLM agent** (Gemini, Claude Code, Cursor, Codex, etc.) | Reads/writes the wiki files |
| **Obsidian** (or the dashboard) | You browse the wiki the LLM created |

```
raw/       → your source material (notes, reviews, exports, clips)
wiki/      → the LLM builds and maintains the wiki here
AGENTS.md  → the schema that tells the LLM how to operate
app/       → local dashboard to visualize your taste data
```

The LLM is not inside Obsidian. It's whatever coding agent you're chatting with — as long as it has access to this folder and reads `AGENTS.md`, it knows what to do.

## Getting started

### 1. Open this folder in your LLM agent

Open `taste-wiki/` as the workspace in your LLM coding agent. The agent reads `AGENTS.md` and knows how to maintain the wiki.

### 2. Talk to the LLM

Say things like:
- "I just watched Past Lives and loved it"
- "I'm reading The Secret History — halfway through, really enjoying the atmosphere"
- "Add Bon Iver's For Emma to my music — it's a winter album for me"

The LLM creates pages, links them, updates lists, and builds your taste profile.

### 3. Browse in Obsidian or the dashboard

Open this folder as an Obsidian vault to browse with graph view and wikilinks, or run the dashboard for a visual overview of your taste data.

## Dashboard

A local web app that reads your wiki and renders it as an interactive visual — constellation graph, mood palette, theme cloud, item cards, page viewer, and activity feed.

```bash
python tools/build_data.py    # parse wiki → app/data.json
python -m http.server 8000 --directory app
# open http://localhost:8000
```

Rebuild data any time you add new content via the LLM.

## Search

```bash
python tools/search_wiki.py "melancholy"
python tools/search_wiki.py "dark" --dir themes
python tools/search_wiki.py --list
python tools/search_wiki.py --stats
python tools/search_wiki.py --links
```

## Structure

| Directory | What goes here |
|-----------|----------------|
| `raw/books/` | book notes, highlights, reviews |
| `raw/movies/` | movie reviews, thoughts |
| `raw/shows/` | show notes, episode reactions |
| `raw/music/` | album/song notes, playlists |
| `raw/articles/` | saved articles, web clips |
| `raw/quotes/` | raw quote collections |
| `raw/notes/` | freeform thoughts, journal entries |
| `raw/exports/` | Letterboxd, Goodreads, Spotify exports |
| `wiki/` | LLM-maintained wiki |
| `app/` | dashboard |
| `tools/` | helper scripts |

## Key wiki pages

- [index.md](wiki/index.md) — catalog of all pages
- [profile.md](wiki/profile.md) — evolving taste profile
- [recommendations.md](wiki/recommendations.md) — what to explore next
- [log.md](wiki/log.md) — timeline of all activity
