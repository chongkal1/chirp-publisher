import { prisma } from './prisma.js';
import { ParsedArticle } from './types.js';

/** Publish a parsed article directly to the database via Prisma. */
export async function publishPost(article: ParsedArticle): Promise<{ success: boolean; slug: string; error?: string }> {
  try {
    const coverData = article.coverBase64
      ? Buffer.from(article.coverBase64, 'base64')
      : null;

    await prisma.post.create({
      data: {
        title: article.title,
        slug: article.slug,
        caption: article.caption,
        content: article.content,
        publishedAt: new Date(),
        categorySlug: article.categorySlug,
        cover: coverData ? `/api/blog/images/${article.slug}` : '',
        coverData,
        coverMimeType: article.coverMimeType || null,
        isFeatured: false,
        isDraft: false,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        seoSocialImage: null,
        seoNoIndex: false,
        authors: {
          create: article.authors.map((authorId, index) => ({
            authorId,
            order: index,
          })),
        },
      },
    });

    console.log(`[publisher] Published: "${article.title}" -> /blog/${article.slug}`);
    return { success: true, slug: article.slug };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[publisher] Error publishing "${article.title}":`, message);
    return { success: false, slug: article.slug, error: message };
  }
}
