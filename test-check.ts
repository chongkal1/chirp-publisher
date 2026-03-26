import 'dotenv/config';
import { listDocsInFolder, listImagesInFolder } from './src/drive.js';

async function main() {
  const docs = await listDocsInFolder();
  console.log(`=== ${docs.length} DOCS ===`);
  for (const d of docs) console.log(`  ${d.name}`);

  const imgs = await listImagesInFolder();
  console.log(`\n=== ${imgs.length} IMAGES ===`);
  for (const i of imgs) console.log(`  ${i.name}`);
}

main().catch(console.error);
