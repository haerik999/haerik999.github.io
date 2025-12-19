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
  content: string;
  readTime: number;
}

export interface PostMetadata {
  slug: string;
  title: string;
  date: string;
  category?: string;
  excerpt?: string;
  readTime: number;
}

export function getAllPosts(): PostMetadata[] {
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
        readTime: calculateReadTime(content),
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    content,
    readTime: calculateReadTime(content),
  };
}

export function getPostSlugs(): string[] {
  const files = fs.readdirSync(postsDirectory);
  return files
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace('.md', ''));
}
