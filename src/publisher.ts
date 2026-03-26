import { BlogApiPost, ParsedArticle } from './types.js';

const BLOG_API_URL = process.env.BLOG_API_URL || 'http://localhost:3000/api/blog';
const BLOG_API_KEY = process.env.BLOG_API_KEY || '';

/** Publish a parsed article to the blog API. */
export async function publishPost(article: ParsedArticle): Promise<{ success: boolean; slug: string; error?: string }> {
  const post: BlogApiPost = {
    title: article.title,
    slug: article.slug,
    caption: article.caption,
    content: article.content,
    publishedAt: new Date().toISOString(),
    categorySlug: article.categorySlug,
    authors: article.authors,
    cover: '',
    coverBase64: article.coverBase64,
    coverMimeType: article.coverMimeType,
    isFeatured: false,
    isDraft: false,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    seoSocialImage: null,
    seoNoIndex: false,
  };

  try {
    const res = await fetch(`${BLOG_API_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BLOG_API_KEY}`,
      },
      body: JSON.stringify(post),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[publisher] Failed to publish "${article.title}": ${res.status} ${body}`);
      return { success: false, slug: article.slug, error: `${res.status}: ${body}` };
    }

    console.log(`[publisher] Published: "${article.title}" -> /blog/${article.slug}`);
    return { success: true, slug: article.slug };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[publisher] Network error publishing "${article.title}":`, message);
    return { success: false, slug: article.slug, error: message };
  }
}
