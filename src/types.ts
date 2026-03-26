export interface PublishedRecord {
  id: string; // Google Drive file ID
  title: string;
  slug: string;
  publishedAt: string; // ISO date
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
}

export interface ParsedArticle {
  title: string;
  slug: string;
  caption: string;
  content: string; // HTML content
  categorySlug: string;
  authors: string[];
  coverUrl: string;
  seoTitle: string | null;
  seoDescription: string | null;
  jsonLd: Record<string, unknown> | null;
}

export interface BlogApiPost {
  title: string;
  slug: string;
  caption: string;
  content: string;
  publishedAt: string;
  categorySlug: string;
  authors: string[];
  cover: string;
  isFeatured: boolean;
  isDraft: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoSocialImage: string | null;
  seoNoIndex: boolean;
}
