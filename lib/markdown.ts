export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

function cleanHeadingText(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .trim();
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

export function createHeadingIdGenerator() {
  const counts = new Map<string, number>();
  return (text: string): string => {
    const base = slugifyHeading(cleanHeadingText(text));
    const next = (counts.get(base) || 0) + 1;
    counts.set(base, next);
    return next === 1 ? base : `${base}-${next}`;
  };
}

export function extractTocHeadings(content: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const nextId = createHeadingIdGenerator();
  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');

  for (const line of withoutCodeBlocks.split('\n')) {
    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;

    const level = match[1].length as 2 | 3;
    const text = cleanHeadingText(match[2]);
    if (!text) continue;

    headings.push({
      id: nextId(text),
      text,
      level,
    });
  }

  return headings;
}
