import { listDocsInFolder, exportDocAsHtml, listImagesInFolder, downloadImageBase64 } from './drive.js';
import { parseDocHtml } from './parser.js';
import { publishPost } from './publisher.js';
import { isPublished, markPublished } from './dedup.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Main sync: fetch Drive docs, skip duplicates, publish new ones. */
export async function syncDriveToBlog(limit?: number): Promise<{
  checked: number;
  published: number;
  skipped: number;
  errors: string[];
}> {
  console.log(`[sync] Starting sync at ${new Date().toISOString()}`);

  const result = { checked: 0, published: 0, skipped: 0, errors: [] as string[] };

  try {
    // Fetch docs and images in parallel
    const [docs, images] = await Promise.all([
      listDocsInFolder(),
      listImagesInFolder(),
    ]);

    console.log(`[sync] Found ${docs.length} docs and ${images.length} images in Drive folder`);
    result.checked = docs.length;

    for (const doc of docs) {
      // Stop if we've hit the publish limit
      if (limit && result.published >= limit) {
        console.log(`[sync] Reached publish limit of ${limit}, stopping`);
        break;
      }

      // Anti-duplicate check
      if (isPublished(doc.id, doc.name)) {
        console.log(`[sync] Skipping (already published): "${doc.name}"`);
        result.skipped++;
        continue;
      }

      try {
        // Export Google Doc as HTML
        console.log(`[sync] Processing: "${doc.name}"`);
        const html = await exportDocAsHtml(doc.id);

        // Parse HTML into structured article
        const article = parseDocHtml(html, doc.name, images);

        // Download cover image if matched
        if (article.coverUrl) {
          const imageId = article.coverUrl.match(/id=([^&]+)/)?.[1];
          if (imageId) {
            console.log(`[sync] Downloading cover image...`);
            const { base64, mimeType } = await downloadImageBase64(imageId);
            article.coverBase64 = base64;
            article.coverMimeType = mimeType;
          }
        }

        // Pause between docs to avoid Google Drive rate-limiting
        await delay(2000);

        // Publish to blog API
        const publishResult = await publishPost(article);

        if (publishResult.success) {
          // Mark as published in dedup store
          markPublished({
            id: doc.id,
            title: doc.name,
            slug: article.slug,
            publishedAt: new Date().toISOString(),
          });
          result.published++;
        } else {
          result.errors.push(`"${doc.name}": ${publishResult.error}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[sync] Error processing "${doc.name}":`, message);
        result.errors.push(`"${doc.name}": ${message}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync] Fatal error:', message);
    result.errors.push(`Fatal: ${message}`);
  }

  // Trigger page revalidation if we published anything
  if (result.published > 0) {
    try {
      const revalidateUrl = process.env.REVALIDATE_URL || 'https://marketingsite-weld.vercel.app/api/blog/revalidate';
      await fetch(revalidateUrl, { method: 'POST' });
      console.log('[sync] Triggered blog page revalidation');
    } catch (err) {
      console.warn('[sync] Failed to trigger revalidation:', err);
    }
  }

  console.log(
    `[sync] Done. Checked: ${result.checked}, Published: ${result.published}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`,
  );

  return result;
}
