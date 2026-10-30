import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const REMOTE_BASE_URL = 'https://filedn.com/l8l3tmJlFBQbibudQ3R2XYu/food-data/';

// Expected file suffixes for food log data
const CANDIDATE_SUFFIXES = [
  'summary.txt',
  'detail.pdf',
  'groceries o.html',
  'groceries o.pdf',
  'groceries w.pdf',
  'groceries w.html',
  'groceries w - converted.html',
  'nutrition.pdf',
  'groceries f.png',
  'groceries f.jpg',
  'food.png',
  'food.jpg',
  'food.jpeg',
];

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FoodLogFetcher/1.0',
  'Accept': '*/*',
};

async function fetchWithRetry(url, options = {}, retries = 2) {
  const mergedOptions = {
    ...options,
    headers: { ...FETCH_HEADERS, ...(options.headers || {}) },
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, mergedOptions);
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
}

async function buildManifest() {
  console.log('Building food log data manifest from pCloud data files...');

  const fileSet = new Set();
  const dateSet = new Set();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicDir = path.join(__dirname, '..', 'public');
  const manifestPath = path.join(publicDir, 'data-manifest.json');

  // 1. Seed from existing data-manifest.json if available
  if (fs.existsSync(manifestPath)) {
    try {
      const existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (Array.isArray(existingManifest.sortedDates)) {
        existingManifest.sortedDates.forEach((d) => dateSet.add(d));
      }
      if (Array.isArray(existingManifest.allFiles)) {
        existingManifest.allFiles.forEach((f) => {
          // Filter out index.html, CNAME, or unexpected non-data files
          if (f !== 'index.html' && f !== 'CNAME' && !f.endsWith('.svg')) {
            fileSet.add(f);
          }
        });
      }
      console.log(`Loaded ${dateSet.size} seed dates and ${fileSet.size} seed files from existing manifest.`);
    } catch (err) {
      console.warn('Could not read existing data-manifest.json seed:', err);
    }
  }

  // 2. Generate candidate date list (past 180 days up to +3 days in future, plus any known seed dates)
  const candidateDates = Array.from(dateSet);
  const today = new Date();

  for (let i = 3; i >= -180; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const yyyymmdd =
      d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    if (!candidateDates.includes(yyyymmdd)) {
      candidateDates.push(yyyymmdd);
    }
  }

  // Sort candidate dates descending
  candidateDates.sort((a, b) => b.localeCompare(a));

  console.log(`Probing pCloud for data files across ${candidateDates.length} candidate dates...`);

  // 3. Batched probing of candidate dates for expected data files
  const BATCH_SIZE = 5;
  for (let i = 0; i < candidateDates.length; i += BATCH_SIZE) {
    const batch = candidateDates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (date) => {
        // Probe all candidate suffixes for each date directly
        await Promise.all(
          CANDIDATE_SUFFIXES.map(async (suffix) => {
            const fn = `${date} ${suffix}`;
            if (fileSet.has(fn)) {
              dateSet.add(date);
              return;
            }
            try {
              const res = await fetchWithRetry(REMOTE_BASE_URL + encodeURIComponent(fn), { method: 'GET' });
              if (res.ok) {
                fileSet.add(fn);
                dateSet.add(date);
              }
            } catch (e) {}
          })
        );
      })
    );
  }

  // Ensure every valid date has summary file name registered
  dateSet.forEach((date) => {
    fileSet.add(`${date} summary.txt`);
  });

  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
  const allFiles = Array.from(fileSet).filter((f) => f !== 'index.html' && f !== 'CNAME');

  console.log(`Probing completed: ${sortedDates.length} dates and ${allFiles.length} files found.`);
  console.log('Latest 5 dates:', sortedDates.slice(0, 5));

  // 4. Fetch overview.md
  let overviewMarkdown = '# The Theory\nNo theory overview found.';
  try {
    const ovRes = await fetchWithRetry(REMOTE_BASE_URL + 'overview.md');
    if (ovRes.ok) {
      overviewMarkdown = await ovRes.text();
      if (overviewMarkdown.startsWith('data:')) {
        const commaIdx = overviewMarkdown.indexOf(',');
        if (commaIdx !== -1) {
          try {
            overviewMarkdown = Buffer.from(overviewMarkdown.substring(commaIdx + 1), 'base64').toString('utf-8');
          } catch (e) {}
        }
      }
      console.log('Successfully fetched overview.md (length:', overviewMarkdown.length, ')');
    }
  } catch (err) {
    console.warn('Could not fetch overview.md:', err);
  }

  // 5. Fetch all summary texts
  const summaries = {};
  console.log('Fetching summary text files for each date...');

  const fetchTasks = sortedDates.map(async (date) => {
    const summaryFileName = `${date} summary.txt`;
    const summaryUrl = REMOTE_BASE_URL + encodeURIComponent(summaryFileName);
    try {
      const res = await fetchWithRetry(summaryUrl);
      if (res.ok) {
        let text = await res.text();
        if (text && text.startsWith('data:')) {
          const commaIdx = text.indexOf(',');
          if (commaIdx !== -1) {
            try {
              text = Buffer.from(text.substring(commaIdx + 1), 'base64').toString('utf-8');
            } catch (e) {}
          }
        }
        if (text && text.length > 0) {
          summaries[date] = text;
        }
      }
    } catch (err) {}
  });

  await Promise.all(fetchTasks);

  console.log(`Successfully fetched ${Object.keys(summaries).length} summary files.`);

  const manifest = {
    lastUpdated: new Date().toISOString(),
    hasOverview: overviewMarkdown.length > 50,
    overviewMarkdown,
    sortedDates,
    allFiles,
    summaries,
  };

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Wrote manifest to ${manifestPath} (${(fs.statSync(manifestPath).size / 1024).toFixed(1)} KB)`);
}

buildManifest().catch((err) => {
  console.error('Error building manifest:', err);
});
