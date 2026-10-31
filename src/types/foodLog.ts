export interface FoodItem {
  name: string;
  weightGrams?: number;
  time?: string;
}

export interface SummaryStats {
  weightEatenGrams?: number;
  caloriesEaten?: number;
  kcalPerGram?: number;
  totalExerciseKcal?: number;
  netCaloriesKcal?: number;
  fatPct?: number;
  carbsPct?: number;
  proteinPct?: number;
  saturatedFatGrams?: number;
}

export interface GroceryDoc {
  fileName: string;
  label: string;
  url: string;
  type: 'waitrose' | 'ocado' | 'forest' | 'other';
  isHtml?: boolean;
}

export interface GroceryImageDoc {
  fileName: string;
  label: string;
  url: string;
}

export interface PdfDoc {
  fileName: string;
  label: string;
  url: string;
  isHtml?: boolean;
}

export interface FoodLogEntry {
  date: string; // YYYYMMDD e.g. "20261014"
  formattedDate: string; // "Thursday 14/10/2026"
  formattedDateShort: string; // "14 Oct 2026"
  dayOfWeek: string; // "Thursday"
  summaryFileName?: string;
  summaryUrl?: string;
  rawSummary?: string;
  summaryStats?: SummaryStats;
  foodItems?: FoodItem[];
  summaryLoaded: boolean;
  detailPdf?: PdfDoc;
  groceries: GroceryDoc[];
  groceryImages: GroceryImageDoc[];
  nutritionPdf?: PdfDoc;
  otherFiles: PdfDoc[];
}

export interface FoodDataState {
  overviewMarkdown: string;
  overviewHtml: string;
  dates: string[];
  entriesByDate: Record<string, FoodLogEntry>;
  allFiles: string[];
  lastFetched: Date;
  indexLoaded: boolean;
  overviewLoaded: boolean;
  loadedDaysCount: number;
  statsReady: boolean;
  loading: boolean;
  error: string | null;
}
