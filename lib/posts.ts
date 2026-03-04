import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'posts');

// 읽는 시간 계산 (평균 읽기 속도: 분당 200단어)
function calculateReadTime(content: string): number {
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / 200);
}

export interface Post {
  slug: string;
  title: string;
  date: string;
  category?: string;
  excerpt?: string;
  order?: number;
  tags: string[];
  content: string;
  readTime: number;
}

export interface PostMetadata {
  slug: string;
  title: string;
  date: string;
  category?: string;
  excerpt?: string;
  order?: number;
  tags: string[];
  readTime: number;
}

export interface BacklinkInfo {
  slug: string;
  title: string;
  excerpt?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  category?: string;
  val: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface CategoryNode {
  name: string;
  path: string;
  children: CategoryNode[];
  posts: PostMetadata[];
}

export function getAllPosts(): PostMetadata[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const files = fs.readdirSync(postsDirectory);

  const posts = files
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const filePath = path.join(postsDirectory, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);
      const slug = file.replace('.md', '');

      return {
        slug,
        title: data.title || slug,
        date: data.date || new Date().toISOString(),
        category: data.category || 'General',
        excerpt: data.excerpt || '',
        order: data.order,
        tags: (data.tags as string[]) || [],
        readTime: calculateReadTime(content),
      };
    })
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.title.localeCompare(b.title);
    });

  return posts;
}

export function getPostBySlug(slug: string): Post {
  const filePath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title || slug,
    date: data.date || new Date().toISOString(),
    category: data.category || 'General',
    excerpt: data.excerpt || '',
    tags: (data.tags as string[]) || [],
    content,
    readTime: calculateReadTime(content),
  };
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const files = fs.readdirSync(postsDirectory);
  return files
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace('.md', ''));
}

export function buildCategoryTree(posts: PostMetadata[]): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();

  function getOrCreateNode(nodePath: string): CategoryNode {
    if (nodeMap.has(nodePath)) return nodeMap.get(nodePath)!;
    const parts = nodePath.split('/');
    const node: CategoryNode = { name: parts[parts.length - 1], path: nodePath, children: [], posts: [] };
    nodeMap.set(nodePath, node);
    return node;
  }

  for (const post of posts) {
    const category = post.category || 'General';
    const parts = category.split('/');

    for (let i = 0; i < parts.length; i++) {
      const nodePath = parts.slice(0, i + 1).join('/');
      const node = getOrCreateNode(nodePath);

      if (i > 0) {
        const parentPath = parts.slice(0, i).join('/');
        const parent = getOrCreateNode(parentPath);
        if (!parent.children.some(c => c.path === node.path)) {
          parent.children.push(node);
        }
      }

      if (i === parts.length - 1) {
        node.posts.push(post);
      }
    }
  }

  const sortNodes = (nodes: CategoryNode[]): void => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      node.posts.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return a.title.localeCompare(b.title);
      });
      sortNodes(node.children);
    }
  };

  const roots = Array.from(nodeMap.values()).filter(node => !node.path.includes('/'));
  sortNodes(roots);
  return roots;
}

function getAllPostsWithContent(): Post[] {
  if (!fs.existsSync(postsDirectory)) return [];
  const files = fs.readdirSync(postsDirectory);
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const filePath = path.join(postsDirectory, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);
      const slug = file.replace('.md', '');
      return {
        slug,
        title: data.title || slug,
        date: data.date || new Date().toISOString(),
        category: data.category || 'General',
        excerpt: data.excerpt || '',
        order: data.order,
        tags: (data.tags as string[]) || [],
        content,
        readTime: calculateReadTime(content),
      };
    });
}

export function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}

export function buildBacklinkMap(posts?: Post[]): Record<string, BacklinkInfo[]> {
  const allPosts = posts ?? getAllPostsWithContent();
  const backlinkMap: Record<string, BacklinkInfo[]> = {};

  for (const post of allPosts) {
    const wikiLinks = extractWikiLinks(post.content);
    for (const targetSlug of wikiLinks) {
      if (!backlinkMap[targetSlug]) {
        backlinkMap[targetSlug] = [];
      }
      backlinkMap[targetSlug].push({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
      });
    }
  }

  return backlinkMap;
}

export function buildGraphData(posts?: Post[]): GraphData {
  const allPosts = posts ?? getAllPostsWithContent();
  const linkCounts: Record<string, number> = {};
  const links: GraphLink[] = [];

  for (const post of allPosts) {
    linkCounts[post.slug] = linkCounts[post.slug] || 0;
    const wikiLinks = extractWikiLinks(post.content);
    for (const target of wikiLinks) {
      if (allPosts.some(p => p.slug === target)) {
        links.push({ source: post.slug, target });
        linkCounts[post.slug] = (linkCounts[post.slug] || 0) + 1;
        linkCounts[target] = (linkCounts[target] || 0) + 1;
      }
    }
  }

  const nodes: GraphNode[] = allPosts.map(post => ({
    id: post.slug,
    label: post.title,
    category: post.category,
    val: (linkCounts[post.slug] || 0) + 1,
  }));

  return { nodes, links };
}

export function getRelatedPosts(
  slug: string,
  allPosts: PostMetadata[],
  tags: string[],
  backlinkMap: Record<string, BacklinkInfo[]>,
): PostMetadata[] {
  const backlinkSlugs = new Set((backlinkMap[slug] || []).map(b => b.slug));

  const scored = allPosts
    .filter(p => p.slug !== slug)
    .map(p => {
      let score = 0;
      const sharedTags = p.tags.filter(t => tags.includes(t)).length;
      score += sharedTags * 2;
      if (backlinkSlugs.has(p.slug)) score += 3;
      if (p.category && allPosts.find(op => op.slug === slug)?.category === p.category) score += 1;
      return { post: p, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored.map(s => s.post);
}
