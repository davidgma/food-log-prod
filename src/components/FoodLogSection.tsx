import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  ShoppingBag,
  LineChart,
  Utensils,
  Eye,
} from 'lucide-react';
import { FoodLogEntry } from '../types/foodLog';
import { toProperCase } from '../lib/foodDataFetcher';
import { KpiStrip } from './KpiStrip';

interface FoodLogSectionProps {
  dates: string[];
  entriesByDate: Record<string, FoodLogEntry>;
  onOpenDoc: (url: string, title: string, type: 'pdf' | 'image') => void;
}

function formatWeightGrams(grams: number): string {
  if (Number.isInteger(grams)) {
    return `${grams}g`;
  }
  const rounded = Math.round(grams * 10) / 10;
  return `${rounded}g`;
}

export const FoodLogSection: React.FC<FoodLogSectionProps> = ({
  dates,
  entriesByDate,
  onOpenDoc,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAscending, setSortAscending] = useState(false); // Default: newest first
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const setAllExpanded = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    dates.forEach((d) => {
      next[d] = expand;
    });
    setExpandedDates(next);
  };

  const handleViewPdf = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredDates = useMemo(() => {
    let result = [...dates];

    if (sortAscending) {
      result.reverse();
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((date) => {
        const entry = entriesByDate[date];
        if (!entry) return false;

        const dateMatches =
          entry.date.includes(q) ||
          entry.formattedDate.toLowerCase().includes(q) ||
          entry.dayOfWeek.toLowerCase().includes(q);

        const foodMatches = entry.foodItems?.some((item) =>
          item.name.toLowerCase().includes(q)
        );

        const docMatches =
          entry.groceries.some((g) => g.label.toLowerCase().includes(q)) ||
          entry.groceryImages.some((i) => i.label.toLowerCase().includes(q)) ||
          entry.detailPdf?.label.toLowerCase().includes(q) ||
          entry.nutritionPdf?.label.toLowerCase().includes(q);

        return dateMatches || foodMatches || docMatches;
      });
    }

    return result;
  }, [dates, entriesByDate, searchQuery, sortAscending]);

  return (
    <div className="space-y-6">
      {/* Search and Controls */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by date, food item, or grocery..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end shrink-0">
            <button
              onClick={() => setSortAscending(!sortAscending)}
              className="px-4 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>{sortAscending ? 'Oldest First' : 'Newest First'}</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAllExpanded(true)}
                className="px-4 py-2.5 text-sm font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={() => setAllExpanded(false)}
                className="px-4 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Date List */}
      <div className="space-y-3">
        {filteredDates.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
            <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-800 text-xl">No food log entries found</h3>
            <p className="text-slate-500 text-base mt-1">Try adjusting your search query.</p>
          </div>
        ) : (
          filteredDates.map((date) => {
            const entry = entriesByDate[date];
            if (!entry) return null;

            const isExpanded = Boolean(expandedDates[date]);
            const stats = entry.summaryStats;

            return (
              <div
                key={date}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isExpanded ? 'border-blue-300 ring-2 ring-blue-500/10 shadow-md' : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Header Bar */}
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left bg-white hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-lg md:text-xl tracking-tight truncate">
                          {entry.formattedDate}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 font-semibold mt-1">
                        {stats?.caloriesEaten !== undefined ? (
                          <span className="text-blue-700 font-extrabold tabular-nums">
                            {stats.caloriesEaten} kcal
                          </span>
                        ) : null}

                        {/* Exercise Calories */}
                        {typeof stats?.totalExerciseKcal === 'number' ? (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-emerald-700 font-bold tabular-nums">
                              {stats.totalExerciseKcal} kcal exercise
                            </span>
                          </>
                        ) : null}

                        {/* Net Calories */}
                        {typeof stats?.netCaloriesKcal === 'number' ? (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-900 font-extrabold tabular-nums">
                              {stats.netCaloriesKcal} kcal net
                            </span>
                          </>
                        ) : null}

                        {stats?.weightEatenGrams ? (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="tabular-nums">{stats.weightEatenGrams}g food</span>
                          </>
                        ) : null}

                        <span className="text-slate-300">·</span>
                        {entry.summaryLoaded ? (
                          <span>{entry.foodItems?.length || 0} items logged</span>
                        ) : (
                          <span className="text-slate-400 italic">Loading summary...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Icons */}
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {entry.groceries.length > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                        <ShoppingBag className="w-3.5 h-3.5" /> Grocery
                      </span>
                    )}
                    {entry.detailPdf && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                        <FileText className="w-3.5 h-3.5" /> Daily PDF
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50/50 space-y-6">
                    {/* KPI Strip */}
                    {stats && <KpiStrip stats={stats} />}

                    {/* Itemized Food Log */}
                    {entry.foodItems && entry.foodItems.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                          <span className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-blue-600" /> Itemized Log
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {entry.foodItems.length} items
                          </span>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {entry.foodItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between text-sm"
                            >
                              <span className="font-bold text-slate-900 leading-snug text-sm">
                                {toProperCase(item.name)}
                              </span>
                              <div className="text-right shrink-0 ml-2 font-mono text-xs text-slate-500">
                                {item.weightGrams ? (
                                  <span className="block font-extrabold text-slate-800 text-sm">
                                    {formatWeightGrams(item.weightGrams)}
                                  </span>
                                ) : null}
                                {item.time ? <span className="text-xs text-slate-500">{item.time}</span> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Associated Documents */}
                    <div className="space-y-2.5">
                      <span className="text-sm font-extrabold text-slate-600 block">Associated Documents</span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {entry.detailPdf && (
                          <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-sm text-slate-900 truncate">Cronometer Daily Report</h4>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewPdf(entry.detailPdf!.url)}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                            >
                              <Eye className="w-4 h-4" /> View PDF
                            </button>
                          </div>
                        )}

                        {entry.groceries.map((g, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-sm text-slate-900 truncate">{g.label}</h4>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewPdf(g.url)}
                              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                            >
                              <Eye className="w-4 h-4" /> View Receipt
                            </button>
                          </div>
                        ))}

                        {entry.groceryImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-sm text-slate-900 truncate">{img.label}</h4>
                              </div>
                            </div>
                            <button
                              onClick={() => onOpenDoc(img.url, img.label, 'image')}
                              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                            >
                              <Eye className="w-4 h-4" /> View Photo
                            </button>
                          </div>
                        ))}

                        {entry.nutritionPdf && (
                          <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                <LineChart className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-sm text-slate-900 truncate">Fortnightly Nutrition Report</h4>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewPdf(entry.nutritionPdf!.url)}
                              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                            >
                              <Eye className="w-4 h-4" /> View Report
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

FoodLogSection.displayName = 'FoodLogSection';
