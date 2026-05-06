const TYPE_COLORS = {
  show: '#a78bfa', movie: '#34d399', book: '#fbbf24', music: '#f472b6',
  person: '#60a5fa', theme: '#4ade80', mood: '#c084fc',
  quote: '#fb923c', question: '#e879f9', core: '#8a8698',
};

const TYPE_ICONS = {
  show: '📺', movie: '🎬', book: '📚', music: '🎵',
  person: '👤', theme: '🌿', mood: '🌙',
  quote: '💬', question: '❓',
};

const MOOD_COLORS = {};

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${hue}, 55%, 62%)`;
}

function getMoodColor(name) {
  if (!MOOD_COLORS[name]) MOOD_COLORS[name] = hashColor(name);
  return MOOD_COLORS[name];
}

let DATA = null;

async function init() {
  try {
    DATA = await fetch('data.json').then(r => r.json());
  } catch (e) {
    document.querySelector('main').innerHTML =
      '<div class="empty" style="text-align:center;padding:4rem">run <code>python tools/build_data.py</code> first to generate data.json</div>';
    return;
  }

  renderStats();
  renderConstellation();
  renderProfile();
  renderMoods();
  renderThemes();
  renderCollections();
  renderPeople();
  renderActivity();
  setupViewer();
}

// Stats
function renderStats() {
  const s = DATA.stats;
  const bar = document.getElementById('stats-bar');
  const parts = [];
  if (s.by_type.show) parts.push(`<span class="stat"><span class="stat-num">${s.by_type.show}</span> shows</span>`);
  if (s.by_type.movie) parts.push(`<span class="stat"><span class="stat-num">${s.by_type.movie}</span> movies</span>`);
  if (s.by_type.book) parts.push(`<span class="stat"><span class="stat-num">${s.by_type.book}</span> books</span>`);
  if (s.by_type.music) parts.push(`<span class="stat"><span class="stat-num">${s.by_type.music}</span> music</span>`);
  if (s.by_type.person) parts.push(`<span class="stat"><span class="stat-num">${s.by_type.person}</span> people</span>`);
  if (s.by_type.theme) parts.push(`<span class="stat"><span class="stat-num">${s.by_type.theme}</span> themes</span>`);
  if (s.by_type.mood) parts.push(`<span class="stat"><span class="stat-num">${s.by_type.mood}</span> moods</span>`);
  parts.push(`<span class="stat"><span class="stat-num">${s.connections}</span> connections</span>`);
  bar.innerHTML = parts.join('');
}

// Constellation
function renderConstellation() {
  const container = document.getElementById('constellation');
  const w = container.clientWidth;
  const h = 420;

  const nodes = DATA.items.map(d => ({
    id: d.id, title: d.title, type: d.type,
    r: 6 + Math.min(d.links.length * 2, 14),
  }));

  const nodeIds = new Set(nodes.map(n => n.id));
  const links = DATA.connections
    .filter(c => nodeIds.has(c.source) && nodeIds.has(c.target))
    .map(c => ({ source: c.source, target: c.target }));

  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${w} ${h}`);

  // glow filter
  const defs = svg.append('defs');
  const filter = defs.append('filter').attr('id', 'glow');
  filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
  const merge = filter.append('feMerge');
  merge.append('feMergeNode').attr('in', 'blur');
  merge.append('feMergeNode').attr('in', 'SourceGraphic');

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(90))
    .force('charge', d3.forceManyBody().strength(-180))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('collision', d3.forceCollide().radius(d => d.r + 4));

  const link = svg.append('g')
    .selectAll('line').data(links).join('line')
    .attr('stroke', 'rgba(255,255,255,0.08)')
    .attr('stroke-width', 1);

  const node = svg.append('g')
    .selectAll('circle').data(nodes).join('circle')
    .attr('r', d => d.r)
    .attr('fill', d => TYPE_COLORS[d.type] || '#666')
    .attr('opacity', 0.8)
    .attr('cursor', 'pointer')
    .attr('filter', 'url(#glow)')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  const label = svg.append('g')
    .selectAll('text').data(nodes).join('text')
    .text(d => d.title)
    .attr('font-size', d => d.r > 10 ? '10px' : '8px')
    .attr('fill', 'rgba(228,226,238,0.6)')
    .attr('text-anchor', 'middle')
    .attr('dy', d => d.r + 14)
    .attr('pointer-events', 'none')
    .attr('font-family', 'Inter, sans-serif');

  // hover highlight
  node.on('mouseover', function(e, d) {
    const connected = new Set();
    links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === d.id) connected.add(t);
      if (t === d.id) connected.add(s);
    });
    connected.add(d.id);
    node.attr('opacity', n => connected.has(n.id) ? 1 : 0.12);
    link.attr('stroke', l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return (s === d.id || t === d.id) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.03)';
    });
    label.attr('fill', n => connected.has(n.id) ? 'rgba(228,226,238,0.9)' : 'rgba(228,226,238,0.1)');
  })
  .on('mouseout', () => {
    node.attr('opacity', 0.8);
    link.attr('stroke', 'rgba(255,255,255,0.08)');
    label.attr('fill', 'rgba(228,226,238,0.6)');
  })
  .on('click', (e, d) => openViewer(d.id));

  sim.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('cx', d => d.x = Math.max(d.r, Math.min(w - d.r, d.x)))
        .attr('cy', d => d.y = Math.max(d.r, Math.min(h - d.r, d.y)));
    label.attr('x', d => d.x).attr('y', d => d.y);
  });
}

// Profile
function renderProfile() {
  const el = document.getElementById('profile-content');
  const p = DATA.profile;
  if (!p || !p.sections || Object.keys(p.sections).length === 0) {
    el.innerHTML = '<div class="empty">no taste data yet</div>';
    return;
  }
  let html = '';
  for (const [title, content] of Object.entries(p.sections)) {
    if (!content.trim()) continue;
    html += `<div class="profile-section-title">${title}</div>`;
    html += `<div class="profile-text">${renderInline(content)}</div>`;
  }
  el.innerHTML = html || '<div class="empty">profile is empty — start adding things</div>';
}

// Moods
function renderMoods() {
  const el = document.getElementById('moods-content');
  const moods = DATA.items.filter(i => i.type === 'mood');
  if (moods.length === 0) {
    el.innerHTML = '<div class="empty">no moods tracked yet</div>';
    document.getElementById('moods-section').style.display = 'none';
    return;
  }
  let strip = '<div class="mood-strip">';
  moods.forEach(m => {
    const color = getMoodColor(m.title);
    strip += `<div class="mood-block" style="background:${color}" data-id="${m.id}" title="${m.title}">${m.title}</div>`;
  });
  strip += '</div>';
  el.innerHTML = strip;
  el.querySelectorAll('.mood-block').forEach(b => b.addEventListener('click', () => openViewer(b.dataset.id)));
}

// Themes
function renderThemes() {
  const el = document.getElementById('themes-content');
  const themes = DATA.items.filter(i => i.type === 'theme');
  if (themes.length === 0) {
    el.innerHTML = '<div class="empty">no themes tracked yet</div>';
    document.getElementById('themes-section').style.display = 'none';
    return;
  }
  let html = '<div class="theme-cloud">';
  themes.forEach(t => {
    const size = 0.75 + Math.min(t.links.length * 0.1, 0.5);
    html += `<span class="theme-tag" style="font-size:${size}rem" data-id="${t.id}">${t.title}</span>`;
  });
  html += '</div>';
  el.innerHTML = html;
  el.querySelectorAll('.theme-tag').forEach(t => t.addEventListener('click', () => openViewer(t.dataset.id)));
}

// Collections
function renderCollections() {
  const types = ['show', 'movie', 'book', 'music', 'question'];
  const available = types.filter(t => DATA.items.some(i => i.type === t));
  // also add 'all'
  const tabs = document.getElementById('tabs');
  const grid = document.getElementById('cards-grid');

  if (DATA.items.filter(i => !['theme', 'mood', 'person'].includes(i.type)).length === 0) {
    tabs.parentElement.style.display = 'none';
    return;
  }

  let html = '<button class="tab active" data-filter="all">all</button>';
  available.forEach(t => {
    html += `<button class="tab" data-filter="${t}">${TYPE_ICONS[t] || ''} ${t}s</button>`;
  });
  tabs.innerHTML = html;

  function render(filter) {
    const items = DATA.items.filter(i => {
      if (['theme', 'mood', 'person'].includes(i.type)) return false;
      return filter === 'all' || i.type === filter;
    });
    grid.innerHTML = items.map(i => {
      const color = TYPE_COLORS[i.type] || '#888';
      const snippet = getSnippet(i);
      const meta = [i.frontmatter.origin, i.frontmatter.director, i.frontmatter.author, i.frontmatter.artist]
        .filter(Boolean).join(' · ');
      return `
        <div class="item-card" data-type="${i.type}" data-id="${i.id}">
          <div class="card-type" style="color:${color}">${TYPE_ICONS[i.type] || ''} ${i.type}</div>
          <div class="card-title">${i.title}</div>
          ${meta ? `<div class="card-meta">${meta}</div>` : ''}
          ${i.status ? `<div class="card-meta">${i.status}${i.rating ? ' · ' + i.rating : ''}</div>` : ''}
          ${snippet ? `<div class="card-snippet">${snippet}</div>` : ''}
        </div>`;
    }).join('');
    grid.querySelectorAll('.item-card').forEach(c => c.addEventListener('click', () => openViewer(c.dataset.id)));
  }

  render('all');
  tabs.addEventListener('click', e => {
    if (!e.target.classList.contains('tab')) return;
    tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    render(e.target.dataset.filter);
  });
}

// People
function renderPeople() {
  const el = document.getElementById('people-content');
  const people = DATA.items.filter(i => i.type === 'person');
  if (people.length === 0) {
    document.getElementById('people-section').style.display = 'none';
    return;
  }
  let html = '<div class="people-row">';
  people.forEach(p => {
    const initials = p.title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const role = p.frontmatter.type || 'person';
    html += `
      <div class="person-chip" data-id="${p.id}">
        <div class="person-avatar">${initials}</div>
        <div>
          <div class="person-name">${p.title}</div>
          <div class="person-role">${role}</div>
        </div>
      </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
  el.querySelectorAll('.person-chip').forEach(c => c.addEventListener('click', () => openViewer(c.dataset.id)));
}

// Activity
function renderActivity() {
  const el = document.getElementById('activity-content');
  if (DATA.log.length === 0) {
    el.innerHTML = '<div class="empty">no activity yet</div>';
    return;
  }
  let html = '<div class="activity-list">';
  DATA.log.forEach(entry => {
    html += `
      <div class="activity-item">
        <span class="activity-date">${entry.date}</span>
        <span class="activity-badge ${entry.action}">${entry.action}</span>
        <span class="activity-text">${entry.title}${entry.body ? ' — ' + truncate(entry.body, 100) : ''}</span>
      </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

// Page viewer
function setupViewer() {
  document.getElementById('viewer-backdrop').addEventListener('click', closeViewer);
  document.getElementById('viewer-close').addEventListener('click', closeViewer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeViewer(); });
}

function openViewer(id) {
  const item = DATA.items.find(i => i.id === id);
  if (!item) return;

  const body = document.getElementById('viewer-body');
  const color = TYPE_COLORS[item.type] || '#888';

  let html = `
    <div class="v-type" style="color:${color}">${TYPE_ICONS[item.type] || ''} ${item.type}</div>
    <div class="v-title">${item.title}</div>`;

  const meta = [
    item.frontmatter.origin, item.frontmatter.director, item.frontmatter.author,
    item.frontmatter.artist, item.status, item.rating
  ].filter(Boolean).join(' · ');
  if (meta) html += `<div class="v-meta">${meta}</div>`;

  for (const [title, content] of Object.entries(item.sections)) {
    if (!content.trim()) continue;
    html += `<div class="v-section-title">${title}</div>`;
    html += `<div class="v-section-content">${renderMarkdown(content)}</div>`;
  }

  if (item.links.length > 0) {
    html += '<div class="v-section-title">Connections</div><div class="v-links">';
    item.links.forEach(link => {
      const slug = link.toLowerCase().replace(/\s+/g, '-');
      const target = DATA.items.find(i => i.id === slug);
      const targetColor = target ? TYPE_COLORS[target.type] : '#888';
      html += `<span class="v-link" data-id="${slug}" style="border-color:${targetColor}33;color:${targetColor}">${link}</span>`;
    });
    html += '</div>';
  }

  body.innerHTML = html;
  body.querySelectorAll('.v-link').forEach(l => l.addEventListener('click', () => openViewer(l.dataset.id)));
  document.getElementById('viewer').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeViewer() {
  document.getElementById('viewer').classList.remove('open');
  document.body.style.overflow = '';
}

// Helpers
function getSnippet(item) {
  const keys = ['What I liked', 'What I didn\'t', 'The tension', 'What this means to me', 'What this feels like', 'The question'];
  for (const k of keys) {
    if (item.sections[k]) return truncate(stripWikilinks(item.sections[k]), 120);
  }
  return '';
}

function truncate(str, n) {
  if (str.length <= n) return str;
  return str.slice(0, n).replace(/\s+\S*$/, '') + '…';
}

function stripWikilinks(str) {
  return str.replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2');
}

function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/\n/g, '<br>');
}

function renderMarkdown(text) {
  let html = '';
  const lines = text.split('\n');
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) { html += '</ul>'; inList = false; }
      continue;
    }
    if (trimmed.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${renderInline(trimmed.slice(2))}</li>`;
    } else if (trimmed.startsWith('> ')) {
      html += `<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`;
    } else if (trimmed.startsWith('→ ')) {
      html += `<p style="color:var(--accent)">${renderInline(trimmed)}</p>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${renderInline(trimmed)}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

init();
