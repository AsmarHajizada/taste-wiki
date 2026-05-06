# Taste Wiki

A personal, LLM-maintained wiki that maps your cultural taste over time — books, movies, shows, music, quotes, and the connections between them.

Based on [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). You curate sources and ask questions. The LLM does all the bookkeeping — summarizing, cross-referencing, filing, and maintaining consistency.

## How it works

```
raw/    → You drop source material here (notes, reviews, exports, clips)
wiki/   → The LLM builds and maintains the wiki here
AGENTS.md → The schema that governs how the LLM operates
```

You never write the wiki yourself. You tell the LLM what you watched, read, or listened to. It creates the pages, extracts themes and moods, cross-references everything, updates your taste profile, and suggests what to explore next.

## Getting started

### 1. Open in Obsidian

Open this folder as an Obsidian vault. The `.obsidian/` config is already set up — wikilinks work, graph view shows connections, and you can browse the wiki as it grows.

### 2. Start adding things

Tell your LLM agent things like:
- "I just watched Past Lives and loved it"
- "I'm reading The Secret History — halfway through, really enjoying the atmosphere"
- "Add Bon Iver's For Emma to my music — it's a winter album for me"

The LLM will create pages, link them, update lists, and build your taste profile.

### 3. Ask questions

- "What themes keep showing up in my favorites?"
- "Recommend something melancholy but not depressing"
- "What do all my 5-star movies have in common?"

### 4. Browse in Obsidian

Watch the wiki grow. Use graph view to see the connections. Click through themes and moods to discover patterns you didn't notice.

## Tools

### Search

```bash
# Full-text search
python tools/search_wiki.py "melancholy"

# Search within a category
python tools/search_wiki.py "dark" --dir themes

# List all pages
python tools/search_wiki.py --list

# Wiki stats
python tools/search_wiki.py --stats

# Check for broken links and orphan pages
python tools/search_wiki.py --links
```

## Structure

| Directory | What goes here |
|-----------|----------------|
| `raw/books/` | Book notes, highlights, reviews |
| `raw/movies/` | Movie reviews, thoughts |
| `raw/shows/` | Show notes, episode reactions |
| `raw/music/` | Album/song notes, playlists |
| `raw/articles/` | Saved articles, web clips |
| `raw/quotes/` | Raw quote collections |
| `raw/notes/` | Freeform thoughts, journal entries |
| `raw/exports/` | Letterboxd, Goodreads, Spotify exports |
| `raw/screenshots/` | Images, screenshots |
| `wiki/` | LLM-maintained wiki (don't edit manually) |
| `tools/` | Helper scripts |

## Key wiki pages

- **[index.md](wiki/index.md)** — Master catalog of all pages
- **[profile.md](wiki/profile.md)** — Your evolving taste profile
- **[recommendations.md](wiki/recommendations.md)** — What to explore next, with reasons
- **[log.md](wiki/log.md)** — Timeline of all wiki activity
