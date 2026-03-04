const fs = require('fs');
const path = require('path');

const postsDir = path.join(process.cwd(), 'posts');
const publicDir = path.join(process.cwd(), 'public');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const frontmatterBlock = match[1];
  const content = match[2];

  const data = {};
  frontmatterBlock.split(/\r?\n/).forEach((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!key) return;

    if (key === 'tags') {
      const arrayMatch = value.match(/^\[(.*)\]$/);
      if (arrayMatch) {
        data[key] = arrayMatch[1].split(',').map(t => t.trim()).filter(Boolean);
      } else {
        data[key] = [];
      }
      return;
    }

    data[key] = value;
  });

  return { data, content };
}

function stripMarkdown(text) {
  return text
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/\|.*\|/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateExcerpt(text, length = 150) {
  const stripped = stripMarkdown(text);
  if (stripped.length <= length) return stripped;
  return stripped.slice(0, length).trimEnd() + '...';
}

function extractWikiLinks(content) {
  const regex = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;
  const links = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'));

const index = files.map((file) => {
  const slug = file.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(postsDir, file), 'utf-8');
  const { data, content } = parseFrontmatter(raw);

  return {
    slug,
    title: data.title || slug,
    category: data.category || '',
    tags: data.tags || [],
    excerpt: generateExcerpt(content),
    content: stripMarkdown(content),
  };
});

fs.writeFileSync(
  path.join(publicDir, 'search-index.json'),
  JSON.stringify(index, null, 2),
  'utf-8'
);

console.log(`Search index generated: ${index.length} posts`);

// Build graph data
const slugSet = new Set(files.map(f => f.replace(/\.md$/, '')));
const linkCounts = {};
const graphLinks = [];

files.forEach((file) => {
  const slug = file.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(postsDir, file), 'utf-8');
  const { content } = parseFrontmatter(raw);
  const wikiLinks = extractWikiLinks(content);

  linkCounts[slug] = linkCounts[slug] || 0;

  wikiLinks.forEach(target => {
    if (slugSet.has(target)) {
      graphLinks.push({ source: slug, target });
      linkCounts[slug] = (linkCounts[slug] || 0) + 1;
      linkCounts[target] = (linkCounts[target] || 0) + 1;
    }
  });
});

const graphNodes = index.map(item => ({
  id: item.slug,
  label: item.title,
  category: item.category || undefined,
  val: (linkCounts[item.slug] || 0) + 1,
}));

const graphData = { nodes: graphNodes, links: graphLinks };

fs.writeFileSync(
  path.join(publicDir, 'graph-data.json'),
  JSON.stringify(graphData, null, 2),
  'utf-8'
);

console.log(`Graph data generated: ${graphNodes.length} nodes, ${graphLinks.length} links`);
