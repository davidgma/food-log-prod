import { marked } from 'marked';
import { FoodLogEntry, FoodItem, SummaryStats, GroceryDoc, GroceryImageDoc } from '../types/foodLog';

export const REMOTE_BASE_URL = 'https://filedn.com/l8l3tmJlFBQbibudQ3R2XYu/food-data/';

export interface DataManifest {
  lastUpdated?: string;
  hasOverview?: boolean;
  overviewMarkdown?: string;
  sortedDates?: string[];
  allFiles?: string[];
  summaries?: Record<string, string>;
}

let cachedManifest: DataManifest | null = null;

export function toProperCase(str: string): string {
  if (!str) return str;
  // If string is ALL CAPS (e.g. "BLACK PEPPER" or "SALT"), convert to Proper Case
  if (str === str.toUpperCase() && /[A-Z]/.test(str)) {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return str;
}

export async function fetchWithFallback(url: string): Promise<string> {
  let lastError: any = null;

  // 1. Try local express proxy endpoint first (if running on local dev server)
  try {
    const proxyEndpoint = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyEndpoint);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 0) return text;
    }
  } catch (err) {
    lastError = err;
  }

  // 2. Try direct fetch (works if origin allows CORS or same-origin)
  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 0) return text;
    }
  } catch (err) {
    lastError = err;
  }

  // 3. Try corsproxy.org
  try {
    const corsProxyUrl = `https://corsproxy.org/?${encodeURIComponent(url)}`;
    const res = await fetch(corsProxyUrl);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 0) return text;
    }
  } catch (err) {
    lastError = err;
  }

  // 4. Try AllOrigins RAW proxy
  try {
    const allOriginsRaw = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(allOriginsRaw);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 0) return text;
    }
  } catch (err) {
    lastError = err;
  }

  // 5. Try AllOrigins GET JSON proxy
  try {
    const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(allOriginsUrl);
    if (res.ok) {
      const json = await res.json();
      if (json && json.contents && json.contents.length > 0) {
        let content = json.contents;
        if (typeof content === 'string' && content.startsWith('data:')) {
          const commaIdx = content.indexOf(',');
          if (commaIdx !== -1) {
            try {
              content = atob(content.substring(commaIdx + 1));
            } catch (e) {
              console.warn('Failed to atob base64 string:', e);
            }
          }
        }
        return content;
      }
    }
  } catch (err) {
    lastError = err;
  }

  throw new Error(`Failed to fetch ${url}: ${lastError?.message || 'Network error'}`);
}

export function parseSummaryContent(text: string): { stats: SummaryStats; items: FoodItem[] } {
  const stats: SummaryStats = {};
  const items: FoodItem[] = [];

  // Parse Weight Eaten
  const weightMatch = text.match(/Weight eaten:\s*([\d\.]+)\s*g/i);
  if (weightMatch) stats.weightEatenGrams = parseFloat(weightMatch[1]);

  // Parse Calories Eaten
  const calMatch = text.match(/Calories eaten:\s*([\d\.]+)\s*kCal/i);
  if (calMatch) stats.caloriesEaten = parseFloat(calMatch[1]);

  // Parse kcal/g
  const kcalPerGramMatch = text.match(/kcal\/g:\s*([\d\.]+)/i);
  if (kcalPerGramMatch) stats.kcalPerGram = parseFloat(kcalPerGramMatch[1]);

  // Parse Total exercise
  const exerciseMatch = text.match(/Total exercise:\s*([\d\.]+)\s*kCal/i);
  if (exerciseMatch) stats.totalExerciseKcal = parseFloat(exerciseMatch[1]);

  // Parse Net calories
  const netMatch = text.match(/Net calories:\s*([\d\.]+)\s*kCal/i);
  if (netMatch) stats.netCaloriesKcal = parseFloat(netMatch[1]);

  // Parse Macros: Fat 39%, Carbs 46%, Protein 14%
  const macrosMatch = text.match(/Fat\s*([\d\.]+)%,\s*Carbs\s*([\d\.]+)%,\s*Protein\s*([\d\.]+)%/i);
  if (macrosMatch) {
    stats.fatPct = parseFloat(macrosMatch[1]);
    stats.carbsPct = parseFloat(macrosMatch[2]);
    stats.proteinPct = parseFloat(macrosMatch[3]);
  }

  // Parse Saturated fat
  const satFatMatch = text.match(/Saturated fat:\s*([\d\.]+)\s*g/i);
  if (satFatMatch) stats.saturatedFatGrams = parseFloat(satFatMatch[1]);

  // Parse food items list (lines preceding "Weight eaten:")
  const itemTextPart = text.split(/Weight eaten:/i)[0] || text;
  const itemRegex = /([^\(\)\n\r]+?)\s*\(\s*(?:([\d\.]+)g)?(?:\s*(\d{1,2}:\d{2}))?\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(itemTextPart)) !== null) {
    const rawName = match[1].trim();
    if (!rawName || rawName.length < 2) continue;

    items.push({
      name: toProperCase(rawName),
      weightGrams: match[2] ? parseFloat(match[2]) : undefined,
      time: match[3] || undefined,
    });
  }

  return { stats, items };
}

export function formatDateWithDay(yyyymmdd: string): { full: string; short: string; dayName: string } {
  if (yyyymmdd.length !== 8) {
    return { full: yyyymmdd, short: yyyymmdd, dayName: '' };
  }

  const year = parseInt(yyyymmdd.substring(0, 4), 10);
  const month = parseInt(yyyymmdd.substring(4, 6), 10) - 1;
  const day = parseInt(yyyymmdd.substring(6, 8), 10);

  const date = new Date(year, month, day);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = days[date.getDay()];
  const dd = String(day).padStart(2, '0');

  return {
    full: `${dayName} ${dd}/${String(month + 1).padStart(2, '0')}/${year}`,
    short: `${day} ${months[month]} ${year}`,
    dayName,
  };
}

export async function fetchDirectoryIndex(): Promise<{
  allFiles: string[];
  sortedDates: string[];
  initialEntries: Record<string, FoodLogEntry>;
  hasOverview: boolean;
  loadedDaysCount: number;
  overviewMarkdown?: string;
  overviewHtml?: string;
}> {
  const fileSet = new Set<string>();
  const dateSet = new Set<string>();

  // 1. Try loading build-time manifest first
  try {
    const manifestRes = await fetch('./data-manifest.json');
    if (manifestRes.ok) {
      const manifest: DataManifest = await manifestRes.json();
      if (manifest && manifest.sortedDates && manifest.sortedDates.length > 0) {
        cachedManifest = manifest;
        console.log('Successfully loaded build-time data-manifest.json:', manifest.sortedDates.length, 'dates');
      }
    }
  } catch (err) {
    console.log('No build-time data-manifest.json found, will try live fetch:', err);
  }

  if (cachedManifest && cachedManifest.allFiles && cachedManifest.sortedDates) {
    cachedManifest.allFiles.forEach((f) => {
      if (f !== 'index.html' && f !== 'CNAME' && !f.endsWith('.svg')) {
        fileSet.add(f);
      }
    });
    cachedManifest.sortedDates.forEach((d) => dateSet.add(d));
  } else {
    console.warn('No data-manifest.json available.');
  }

  // Ensure every discovered date has its standard summary file
  dateSet.forEach((date) => {
    fileSet.add(`${date} summary.txt`);
  });

  const allFiles = Array.from(fileSet).filter((f) => f !== 'index.html' && f !== 'CNAME');
  const hasOverview = cachedManifest?.hasOverview || true;
  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  // Build initial entries for each date
  const initialEntries: Record<string, FoodLogEntry> = {};
  let loadedDaysCount = 0;

  sortedDates.forEach((date) => {
    const { full, short, dayName } = formatDateWithDay(date);

    // Look for matching files
    const detailPdfFile = allFiles.find((f) => f.match(new RegExp(`^${date}\\s+detail\\.pdf$`, 'i')));
    const waitroseHtml = allFiles.find((f) => f.match(new RegExp(`^${date}\\s+groceries\\s+w\\.(html|htm)$`, 'i')));
    const waitrosePdf = allFiles.find((f) => f.match(new RegExp(`^${date}\\s+groceries\\s+w\\.pdf$`, 'i')));
    const waitroseJpgs = allFiles.filter((f) => f.match(new RegExp(`^${date}\\s+groceries\\s+w-[^"'\?#\s]+\\.(jpg|jpeg|png)$`, 'i')));
    const ocadoHtml = allFiles.find((f) => f.match(new RegExp(`^${date}\\s+groceries\\s+o\\.(html|htm)$`, 'i')));
    const ocadoPdf = allFiles.find((f) => f.match(new RegExp(`^${date}\\s+groceries\\s+o\\.pdf$`, 'i')));
    const forestPng = allFiles.find((f) => f.match(new RegExp(`^${date}\\s+groceries\\s+f\\.(png|jpg|jpeg)$`, 'i')));
    const nutritionPdf = allFiles.find((f) => f.match(new RegExp(`^${date}\\s+nutrition\\.pdf$`, 'i')));

    const groceries: GroceryDoc[] = [];
    if (waitroseHtml) {
      groceries.push({
        fileName: waitroseHtml,
        label: 'Waitrose Grocery Delivery',
        url: REMOTE_BASE_URL + encodeURIComponent(waitroseHtml),
        type: 'waitrose',
        isHtml: true,
      });
    } else if (waitrosePdf) {
      groceries.push({
        fileName: waitrosePdf,
        label: 'Waitrose Grocery Delivery',
        url: REMOTE_BASE_URL + encodeURIComponent(waitrosePdf),
        type: 'waitrose',
        isHtml: false,
      });
    }

    if (ocadoHtml) {
      groceries.push({
        fileName: ocadoHtml,
        label: 'Ocado Grocery Delivery',
        url: REMOTE_BASE_URL + encodeURIComponent(ocadoHtml),
        type: 'ocado',
        isHtml: true,
      });
    } else if (ocadoPdf) {
      groceries.push({
        fileName: ocadoPdf,
        label: 'Ocado Grocery Delivery',
        url: REMOTE_BASE_URL + encodeURIComponent(ocadoPdf),
        type: 'ocado',
        isHtml: false,
      });
    }

    const groceryImages: GroceryImageDoc[] = [];
    if (forestPng) {
      groceryImages.push({
        fileName: forestPng,
        label: 'Forest Whole Foods Grocery Delivery',
        url: REMOTE_BASE_URL + encodeURIComponent(forestPng),
      });
    }

    waitroseJpgs.forEach((jpgFile) => {
      groceryImages.push({
        fileName: jpgFile,
        label: 'Waitrose Grocery Photo',
        url: REMOTE_BASE_URL + encodeURIComponent(jpgFile),
      });
    });

    let summaryLoaded = false;
    let rawSummary: string | undefined = undefined;
    let summaryStats: SummaryStats | undefined = undefined;
    let foodItems: FoodItem[] | undefined = undefined;

    // Check if summary was pre-cached in manifest
    if (cachedManifest?.summaries?.[date]) {
      rawSummary = cachedManifest.summaries[date];
      const parsed = parseSummaryContent(rawSummary);
      summaryStats = parsed.stats;
      foodItems = parsed.items;
      summaryLoaded = true;
      loadedDaysCount += 1;
    }

    initialEntries[date] = {
      date,
      formattedDate: full,
      formattedDateShort: short,
      dayOfWeek: dayName,
      summaryFileName: `${date} summary.txt`,
      summaryUrl: REMOTE_BASE_URL + encodeURIComponent(`${date} summary.txt`),
      summaryLoaded,
      rawSummary,
      summaryStats,
      foodItems,
      detailPdf: detailPdfFile ? {
        fileName: detailPdfFile,
        label: 'Cronometer Daily Report',
        url: REMOTE_BASE_URL + encodeURIComponent(detailPdfFile),
      } : {
        fileName: `${date} detail.pdf`,
        label: 'Cronometer Daily Report',
        url: REMOTE_BASE_URL + encodeURIComponent(`${date} detail.pdf`),
      },
      groceries,
      groceryImages,
      nutritionPdf: nutritionPdf ? {
        fileName: nutritionPdf,
        label: 'Fortnightly Nutrition Report',
        url: REMOTE_BASE_URL + encodeURIComponent(nutritionPdf),
      } : undefined,
      otherFiles: [],
    };
  });

  let overviewMarkdown = cachedManifest?.overviewMarkdown;
  let overviewHtml: string | undefined = undefined;
  if (overviewMarkdown && overviewMarkdown.length > 10) {
    if (typeof overviewMarkdown === 'string' && overviewMarkdown.startsWith('data:')) {
      const commaIdx = overviewMarkdown.indexOf(',');
      if (commaIdx !== -1) {
        try {
          overviewMarkdown = atob(overviewMarkdown.substring(commaIdx + 1));
        } catch (e) {}
      }
    }
    overviewHtml = await marked.parse(overviewMarkdown);
  }

  return {
    allFiles,
    sortedDates,
    initialEntries,
    hasOverview,
    loadedDaysCount,
    overviewMarkdown,
    overviewHtml,
  };
}

export async function fetchSingleDaySummary(entry: FoodLogEntry): Promise<FoodLogEntry> {
  if (entry.summaryLoaded && entry.rawSummary) {
    return entry;
  }

  if (cachedManifest?.summaries?.[entry.date]) {
    const text = cachedManifest.summaries[entry.date];
    const parsed = parseSummaryContent(text);
    return {
      ...entry,
      rawSummary: text,
      summaryStats: parsed.stats,
      foodItems: parsed.items,
      summaryLoaded: true,
    };
  }

  const summaryFileName = entry.summaryFileName || `${entry.date} summary.txt`;

  try {
    const text = await fetchWithFallback(REMOTE_BASE_URL + encodeURIComponent(summaryFileName));
    const parsed = parseSummaryContent(text);

    return {
      ...entry,
      rawSummary: text,
      summaryStats: parsed.stats,
      foodItems: parsed.items,
      summaryLoaded: true,
    };
  } catch (err) {
    console.warn(`Failed to fetch summary for date ${entry.date}:`, err);
    return {
      ...entry,
      summaryLoaded: true,
    };
  }
}

export async function fetchOverviewHtml(): Promise<{ markdown: string; html: string }> {
  let markdown = '';

  if (cachedManifest?.overviewMarkdown && cachedManifest.overviewMarkdown.length > 10) {
    markdown = cachedManifest.overviewMarkdown;
  } else {
    // Attempt loading manifest directly
    try {
      const manifestRes = await fetch('./data-manifest.json');
      if (manifestRes.ok) {
        const manifest: DataManifest = await manifestRes.json();
        if (manifest && manifest.overviewMarkdown && manifest.overviewMarkdown.length > 10) {
          cachedManifest = manifest;
          markdown = manifest.overviewMarkdown;
        }
      }
    } catch (err) {}

    if (!markdown || markdown.length <= 10) {
      try {
        markdown = await fetchWithFallback(REMOTE_BASE_URL + 'overview.md');
      } catch (err) {
        console.warn('Failed to fetch overview.md:', err);
        markdown = '# The Theory\nNo theory overview found.';
      }
    }
  }

  if (typeof markdown === 'string' && markdown.startsWith('data:')) {
    const commaIdx = markdown.indexOf(',');
    if (commaIdx !== -1) {
      try {
        markdown = atob(markdown.substring(commaIdx + 1));
      } catch (e) {
        console.warn('Failed to decode base64 markdown:', e);
      }
    }
  }

  const html = await marked.parse(markdown);
  return { markdown, html };
}
