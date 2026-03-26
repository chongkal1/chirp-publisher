import 'dotenv/config';
import express from 'express';
import { CronJob } from 'cron';
import { syncDriveToBlog } from './sync.js';
import { getPublished, seedPublished } from './dedup.js';
import { PublishedRecord } from './types.js';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3000', 10);
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/15 * * * *';

// Health check
app.get('/', (_req, res) => {
  res.json({
    service: 'blog-publisher',
    status: 'running',
    published: getPublished().length,
    cron: CRON_SCHEDULE,
  });
});

// List published articles
app.get('/published', (_req, res) => {
  res.json(getPublished());
});

// Seed published records (for recovery)
app.post('/published/seed', (req, res) => {
  const { articles } = req.body as { articles?: PublishedRecord[] };

  if (!articles || !Array.isArray(articles)) {
    res.status(400).json({ error: 'Body must contain "articles" array' });
    return;
  }

  const result = seedPublished(articles);
  res.json({
    message: 'Seed complete',
    ...result,
    total: getPublished().length,
  });
});

// Manual trigger
app.post('/sync', async (_req, res) => {
  const result = await syncDriveToBlog();
  res.json(result);
});

// Cron job
const job = new CronJob(CRON_SCHEDULE, async () => {
  try {
    await syncDriveToBlog();
  } catch (err) {
    console.error('[cron] Unhandled error:', err);
  }
});

app.listen(PORT, () => {
  console.log(`[server] Blog publisher running on port ${PORT}`);
  console.log(`[server] Cron schedule: ${CRON_SCHEDULE}`);
  console.log(`[server] Published count: ${getPublished().length}`);
  job.start();
  console.log('[server] Cron job started');
});
