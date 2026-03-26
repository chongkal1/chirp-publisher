import { DriveFile } from './types.js';

const API_KEY = process.env.GOOGLE_API_KEY || '';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
const BASE = 'https://www.googleapis.com/drive/v3';

async function driveGet(url: string): Promise<Response> {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}key=${API_KEY}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API ${res.status}: ${body}`);
  }
  return res;
}

/** List all Google Docs in the public folder. */
export async function listDocsInFolder(): Promise<DriveFile[]> {
  if (!FOLDER_ID) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set');
  if (!API_KEY) throw new Error('GOOGLE_API_KEY is not set');

  const files: DriveFile[] = [];
  let pageToken = '';

  do {
    const q = encodeURIComponent(
      `'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
    );
    const url = `${BASE}/files?q=${q}&fields=nextPageToken,files(id,name,mimeType,createdTime,modifiedTime)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;

    const res = await driveGet(url);
    const data = await res.json();

    for (const file of data.files || []) {
      files.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
      });
    }

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return files;
}

/** Export a Google Doc as HTML. */
export async function exportDocAsHtml(fileId: string): Promise<string> {
  const url = `${BASE}/files/${fileId}/export?mimeType=text/html`;
  const res = await driveGet(url);
  return res.text();
}

/** List image files in the folder (PNG, JPG, WEBP, SVG). */
export async function listImagesInFolder(): Promise<DriveFile[]> {
  if (!FOLDER_ID) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set');

  const mimeTypes = [
    "mimeType='image/png'",
    "mimeType='image/jpeg'",
    "mimeType='image/webp'",
    "mimeType='image/svg+xml'",
  ].join(' or ');

  const q = encodeURIComponent(
    `'${FOLDER_ID}' in parents and (${mimeTypes}) and trashed=false`,
  );
  const url = `${BASE}/files?q=${q}&fields=files(id,name,mimeType,createdTime,modifiedTime)&pageSize=200`;

  const res = await driveGet(url);
  const data = await res.json();

  return (data.files || []).map((f: Record<string, string>) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime,
  }));
}
