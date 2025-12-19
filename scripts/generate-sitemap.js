const fs = require('fs');
const path = require('path');

const siteURL = 'https://haerik999.github.io';

// posts 폴더에서 모든 마크다운 파일 읽기
const postsDir = path.join(process.cwd(), 'posts');
const files = fs.readdirSync(postsDir);

const posts = files
  .filter((file) => file.endsWith('.md'))
  .map((file) => {
    const slug = file.replace('.md', '');
    return `  <url>
    <loc>${siteURL}/posts/${slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteURL}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${posts.join('\n')}
</urlset>`;

const outDir = path.join(process.cwd(), 'out');
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);

console.log('✓ Sitemap generated successfully');
