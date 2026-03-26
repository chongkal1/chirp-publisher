import { parse as parseHtml } from 'node-html-parser';
import slugify from 'slugify';
import { DriveFile, ParsedArticle } from './types.js';

const DEFAULT_CATEGORY = process.env.DEFAULT_CATEGORY_SLUG || 'news';
const DEFAULT_AUTHOR = process.env.DEFAULT_AUTHOR_ID || 'john-doe';

/**
 * Parse exported Google Doc HTML into a structured article.
 *
 * Google Docs export wraps the actual blog HTML inside <p><span> elements
 * with all HTML tags escaped as &lt; &gt; etc. We need to:
 * 1. Extract text content from all spans
 * 2. Join to get the raw blog HTML string
 * 3. Parse that HTML for JSON-LD and content
 */
export function parseDocHtml(
  html: string,
  docName: string,
  images: DriveFile[],
): ParsedArticle {
  const root = parseHtml(html);
  const body = root.querySelector('body') || root;

  // Step 1: Extract all text from <span> elements and join
  // This gives us the actual blog HTML (unescaped from Google Docs wrapper)
  const rawBlogHtml = body.textContent.trim();

  // Step 2: Parse the extracted blog HTML
  const blogRoot = parseHtml(rawBlogHtml);

  // Step 3: Extract JSON-LD script(s)
  let jsonLd: Record<string, unknown> | null = null;
  const scripts = blogRoot.querySelectorAll('script[type="application/ld+json"]');
  if (scripts.length > 0) {
    try {
      jsonLd = JSON.parse(scripts[scripts.length - 1].textContent);
    } catch {
      // Try to find JSON-LD in the raw text as fallback
      const jsonLdMatch = rawBlogHtml.match(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i,
      );
      if (jsonLdMatch) {
        try {
          jsonLd = JSON.parse(jsonLdMatch[1]);
        } catch {
          // ignore
        }
      }
    }
    for (const s of scripts) s.remove();
  }

  // Step 4: Extract title
  const h1El = blogRoot.querySelector('h1');
  const title =
    (jsonLd?.headline as string) ||
    h1El?.textContent?.trim() ||
    docName;

  if (h1El) h1El.remove();

  // Step 5: Extract caption
  let caption = (jsonLd?.description as string) || '';
  if (!caption) {
    const firstP = blogRoot.querySelector('p');
    if (firstP) {
      caption = firstP.textContent?.trim().slice(0, 300) || '';
    }
  }

  // Step 6: Get the clean content HTML (without JSON-LD scripts)
  const content = blogRoot.innerHTML.trim();

  // Step 7: Match cover image from Drive
  const slug = slugify(title, { lower: true, strict: true });
  const coverImage = findMatchingImage(slug, docName, images);
  const coverUrl = coverImage
    ? `https://drive.google.com/uc?export=view&id=${coverImage.id}`
    : '';

  // Step 8: Extract metadata from JSON-LD
  const authors = extractAuthors(jsonLd);
  const categorySlug = extractCategory(jsonLd) || DEFAULT_CATEGORY;

  return {
    title,
    slug,
    caption,
    content,
    categorySlug,
    authors,
    coverUrl,
    seoTitle: (jsonLd?.headline as string) || null,
    seoDescription: (jsonLd?.description as string) || null,
    jsonLd,
  };
}

/**
 * Find an image in Drive that matches the article slug/name.
 * Image names are: `prefix-slug-of-article.webp`
 */
function findMatchingImage(slug: string, docName: string, images: DriveFile[]): DriveFile | null {
  const slugLower = slug.toLowerCase();

  // Images have format: "randomprefix-slug-of-article.webp"
  // Strip extension and the random prefix, then compare
  for (const img of images) {
    const imgName = img.name.toLowerCase().replace(/\.[^.]+$/, ''); // strip extension
    // Remove the first segment (random prefix) separated by dash
    const withoutPrefix = imgName.replace(/^[a-z]+-/, '');

    if (withoutPrefix === slugLower) return img;
    if (imgName.includes(slugLower)) return img;
    if (imgName.endsWith(slugLower)) return img;
  }

  // Fallback: try matching by doc name slug
  const docSlug = slugify(docName, { lower: true, strict: true });
  for (const img of images) {
    const imgName = img.name.toLowerCase().replace(/\.[^.]+$/, '');
    const withoutPrefix = imgName.replace(/^[a-z]+-/, '');
    if (withoutPrefix === docSlug) return img;
  }

  return null;
}

/** Extract author IDs from JSON-LD. */
function extractAuthors(jsonLd: Record<string, unknown> | null): string[] {
  if (!jsonLd?.author) return [DEFAULT_AUTHOR];

  const authorData = Array.isArray(jsonLd.author) ? jsonLd.author : [jsonLd.author];
  const ids: string[] = [];

  for (const a of authorData) {
    if (typeof a === 'string') {
      ids.push(slugify(a, { lower: true, strict: true }));
    } else if (a && typeof a === 'object' && 'name' in a) {
      ids.push(slugify(String(a.name), { lower: true, strict: true }));
    }
  }

  return ids.length > 0 ? ids : [DEFAULT_AUTHOR];
}

/** Extract category from JSON-LD articleSection. */
function extractCategory(jsonLd: Record<string, unknown> | null): string | null {
  if (!jsonLd?.articleSection) return null;
  const section = String(jsonLd.articleSection);
  return slugify(section, { lower: true, strict: true }) || null;
}
