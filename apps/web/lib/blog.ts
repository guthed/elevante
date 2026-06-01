import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// Bloggen är svensk-only (se docs/superpowers/specs/2026-06-01-blogg-stomme-design.md).
// Inläggen bor som markdown-filer med frontmatter i content/blog/. Datalagret
// läses vid byggtid (RSC + node:fs) → ren SSG.

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO yyyy-mm-dd
  updated?: string;
  category: string;
  heroImage?: string;
  body: string; // markdown
  readingMinutes: number;
};

// Korten på listsidan skickas till en client-komponent — bara lättviktiga fält,
// aldrig brödtexten (den ska inte hamna i klientbundeln).
export type BlogCardData = Omit<BlogPost, 'body'>;

function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// gym-matter/js-yaml parsar ociterade datum till Date-objekt. Normalisera till
// ren ISO-datumsträng oavsett om frontmattern citerat datumet eller inte.
function toISODate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

const REQUIRED_KEYS = ['title', 'description', 'date', 'category'] as const;

function parseFile(filename: string): BlogPost {
  const slug = filename.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf8');
  const { data, content } = matter(raw);

  for (const key of REQUIRED_KEYS) {
    if (!data[key]) {
      throw new Error(
        `content/blog/${filename}: saknar obligatorisk frontmatter-nyckel "${key}"`,
      );
    }
  }

  const body = content.trim();
  return {
    slug,
    title: String(data.title),
    description: String(data.description),
    date: toISODate(data.date),
    updated: data.updated ? toISODate(data.updated) : undefined,
    category: String(data.category),
    heroImage: data.heroImage ? String(data.heroImage) : undefined,
    body,
    readingMinutes: readingMinutes(body),
  };
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith('.md'))
    .map(parseFile)
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // nyast först
}

export function getPostBySlug(slug: string): BlogPost | null {
  const file = `${slug}.md`;
  if (!fs.existsSync(path.join(BLOG_DIR, file))) return null;
  return parseFile(file);
}

export function getCategories(): string[] {
  return Array.from(new Set(getAllPosts().map((post) => post.category)));
}

export function toCardData(post: BlogPost): BlogCardData {
  // Plocka bort brödtexten innan korten skickas till klienten.
  const { body: _body, ...card } = post;
  void _body;
  return card;
}
