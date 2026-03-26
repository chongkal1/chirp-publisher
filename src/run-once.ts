import 'dotenv/config';
import { syncDriveToBlog } from './sync.js';

// Run a single sync (useful for testing)
syncDriveToBlog().then((result) => {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.errors.length > 0 ? 1 : 0);
});
