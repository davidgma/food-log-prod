import React, { useMemo, useState } from 'react';
import { Flame, Scale, PieChart, Zap, Activity, Utensils, Droplet, Loader2 } from 'lucide-react';
import { FoodLogEntry } from '../types/foodLog';
import { toProperCase } from '../lib/foodDataFetcher';

interface AnalyticsSectionProps {
  dates: string[];
  entriesByDate: Record<string, FoodLogEntry>;
  loadedDaysCount: number;
  statsReady: boolean;
}

const formatWeight = (val: number): string => {
  const rounded = Math.round((val + Number.EPSILON) * 100) / 100;
  return String(rounded);
};

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  dates,
  entriesByDate,
  loadedDaysCount,
  statsReady,
}) => {
  const recentDates = useMemo(() => {
    // Take up to 60 logged dates (dates that actually have food/calorie entries or summaries)
    const loggedDates = dates.filter((d) => {
      const entry = entriesByDate[d];
      if (entry?.summaryLoaded) {
        return !!(entry.summaryStats?.caloriesEaten || (entry.foodItems && entry.foodItems.length > 0));
      }
      return true;
    });
    return loggedDates.slice(0, 60);
  }, [dates, entriesByDate]);

  const { analytics, chartData, topFoodsList } = useMemo(() => {
    let totalCalories = 0;
    let totalWeight = 0;
    let daysWithStats = 0;
    let totalFatPct = 0;
    let totalCarbsPct = 0;
    let totalProteinPct = 0;
    let maxCalories = 0;
    let minCalories = Infinity;

    const kcalPerGramSeries: { date: string; shortDate: string; value: number }[] = [];
    const satFatSeries: { date: string; shortDate: string; value: number }[] = [];
    const foodMap: Record<string, { name: string; totalGrams: number; count: number }> = {};
    const EXCLUDE_REGEX = /coffee|jasmine\s*tea|hibiscus|positive\s*adjustment|negative\s*adjustment|\badjustment\b/i;

    const chronologicalDates = [...recentDates].reverse();

    // Compute chart series chronologically
    chronologicalDates.forEach((date) => {
      const entry = entriesByDate[date];
      if (!entry?.summaryLoaded || !entry?.summaryStats) return;

      if (typeof entry.summaryStats.kcalPerGram === 'number') {
        kcalPerGramSeries.push({
          date: entry.formattedDate,
          shortDate: entry.formattedDateShort.split(' ')[0] + ' ' + entry.formattedDateShort.split(' ')[1],
          value: Number(entry.summaryStats.kcalPerGram.toFixed(1)),
        });
      }

      if (typeof entry.summaryStats.saturatedFatGrams === 'number') {
        satFatSeries.push({
          date: entry.formattedDate,
          shortDate: entry.formattedDateShort.split(' ')[0] + ' ' + entry.formattedDateShort.split(' ')[1],
          value: Number(entry.summaryStats.saturatedFatGrams.toFixed(1)),
        });
      }
    });

    // Process each file for overall analytics and food items
    recentDates.forEach((date) => {
      const entry = entriesByDate[date];

      if (entry?.summaryLoaded && entry.summaryStats?.caloriesEaten) {
        const cal = entry.summaryStats.caloriesEaten;
        const w = entry.summaryStats.weightEatenGrams || 0;

        totalCalories += cal;
        totalWeight += w;
        daysWithStats += 1;

        if (cal > maxCalories) maxCalories = cal;
        if (cal < minCalories) minCalories = cal;

        if (entry.summaryStats.fatPct) totalFatPct += entry.summaryStats.fatPct;
        if (entry.summaryStats.carbsPct) totalCarbsPct += entry.summaryStats.carbsPct;
        if (entry.summaryStats.proteinPct) totalProteinPct += entry.summaryStats.proteinPct;
      }

      if (entry?.summaryLoaded && entry?.foodItems) {
        entry.foodItems.forEach((item) => {
          const rawName = item.name.trim();
          if (!rawName || rawName.length < 2) return;
          if (EXCLUDE_REGEX.test(rawName)) return;

          const properName = toProperCase(rawName);
          const key = properName.toLowerCase();

          if (!foodMap[key]) {
            foodMap[key] = {
              name: properName,
              totalGrams: 0,
              count: 0,
            };
          }

          const grams = item.weightGrams || 0;
          foodMap[key].totalGrams += grams;
          foodMap[key].count += 1;
        });
      }
    });

    const avgCalories = daysWithStats > 0 ? Math.round(totalCalories / daysWithStats) : 0;
    const avgWeight = daysWithStats > 0 ? Math.round(totalWeight / daysWithStats) : 0;
    const avgFat = daysWithStats > 0 ? Math.round(totalFatPct / daysWithStats) : 0;
    const avgCarbs = daysWithStats > 0 ? Math.round(totalCarbsPct / daysWithStats) : 0;
    const avgProtein = daysWithStats > 0 ? Math.round(totalProteinPct / daysWithStats) : 0;

    const sortedFoods = Object.values(foodMap).sort((a, b) => b.totalGrams - a.totalGrams);

    return {
      analytics: {
        daysWithStats,
        avgCalories,
        avgWeight,
        avgFat,
        avgCarbs,
        avgProtein,
        maxCalories: maxCalories > 0 ? maxCalories : 0,
        minCalories: minCalories !== Infinity ? minCalories : 0,
      },
      chartData: {
        kcalPerGramSeries,
        satFatSeries,
      },
      topFoodsList: sortedFoods,
    };
  }, [recentDates, entriesByDate]);

  if (!statsReady && loadedDaysCount < Math.min(30, dates.length)) {
    const target = Math.min(30, dates.length);
    const pct = Math.min(100, Math.round((loadedDaysCount / (target || 1)) * 100));

    return (
      <div className="bg-white p-12 md:p-16 rounded-2xl border border-slate-200 shadow-sm text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-slate-900">Loading Statistics...</h3>
          <p className="text-slate-500 text-sm mt-1">
            Loading statistics ({loadedDaysCount} / {target} days loaded)
          </p>
        </div>

        <div className="max-w-md mx-auto h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="bg-blue-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              This Page Was Vibe Coding's Idea
            </h2>
            <p className="text-slate-600 text-sm mt-1 font-medium">
              Calculated across {analytics.daysWithStats} logged days.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold mb-1">
              <Flame className="w-4 h-4 text-amber-500" /> Avg Daily Intake
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {analytics.avgCalories} <span className="text-xs text-slate-500 font-normal">kcal</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold mb-1">
              <Scale className="w-4 h-4 text-blue-500" /> Avg Food Weight
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {analytics.avgWeight} <span className="text-xs text-slate-500 font-normal">grams</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold mb-1">
              <PieChart className="w-4 h-4 text-purple-500" /> Macro Split
            </div>
            <div className="text-xl font-black text-slate-900 tabular-nums">
              {analytics.avgFat}% / {analytics.avgCarbs}% / {analytics.avgProtein}%
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Fat / Carbs / Protein</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold mb-1">
              <Zap className="w-4 h-4 text-emerald-500" /> Intake Range
            </div>
            <div className="text-xl font-black text-slate-900 tabular-nums">
              {analytics.minCalories} – {analytics.maxCalories} <span className="text-xs text-slate-500 font-normal">kcal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Macro Ratio Distribution */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <PieChart className="w-4 h-4 text-blue-600" /> Average Macronutrient Distribution Ratio
        </h3>

        <div className="h-6 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${analytics.avgFat}%` }}
            className="bg-amber-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all"
            title={`Fat: ${analytics.avgFat}%`}
          >
            Fat {analytics.avgFat}%
          </div>
          <div
            style={{ width: `${analytics.avgCarbs}%` }}
            className="bg-blue-600 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all"
            title={`Carbs: ${analytics.avgCarbs}%`}
          >
            Carbs {analytics.avgCarbs}%
          </div>
          <div
            style={{ width: `${analytics.avgProtein}%` }}
            className="bg-emerald-600 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all"
            title={`Protein: ${analytics.avgProtein}%`}
          >
            Protein {analytics.avgProtein}%
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 text-xs font-semibold pt-2 text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span>Fat: {analytics.avgFat}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600"></span>
            <span>Carbs: {analytics.avgCarbs}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
            <span>Protein: {analytics.avgProtein}%</span>
          </div>
        </div>
      </div>

      {/* Chart 1: Caloric Density Trend */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Caloric Density Trend (kcal / Gram)
          </h3>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            {chartData.kcalPerGramSeries.length} Logged Days
          </span>
        </div>

        {chartData.kcalPerGramSeries.length > 0 ? (
          <div className="pt-2">
            <LineChartComponent
              series={chartData.kcalPerGramSeries}
              unit="kcal/g"
              color="#2563eb"
              formatVal={(v) => v.toFixed(1)}
            />
          </div>
        ) : (
          <p className="text-slate-400 text-xs italic">No kcal/gram data available in summary files.</p>
        )}
      </div>

      {/* Chart 2: Saturated Fat Trend */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Droplet className="w-4 h-4 text-amber-500" /> Saturated Fat Intake Trend (Grams)
          </h3>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            {chartData.satFatSeries.length} Logged Days
          </span>
        </div>

        {chartData.satFatSeries.length > 0 ? (
          <div className="pt-2">
            <LineChartComponent
              series={chartData.satFatSeries}
              unit="g"
              color="#f59e0b"
              formatVal={(v) => v.toFixed(1)}
            />
          </div>
        ) : (
          <p className="text-slate-400 text-xs italic">No saturated fat data available in summary files.</p>
        )}
      </div>

      {/* Most Eaten Foods by Total Weight (showing ONLY kg, no grams subtext below) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Utensils className="w-5 h-5 text-blue-600" /> Most Eaten Foods by Total Weight
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Ranked in descending order by cumulative weight consumed (excluding tea, coffee, and adjustments).
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg">
            {topFoodsList.length} Unique Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-bold text-xs bg-slate-50/50">
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Food Item</th>
                <th className="py-3 px-4 text-right">Total Weight</th>
                <th className="py-3 px-4 text-right">Times Consumed</th>
                <th className="py-3 px-4 text-right">Avg Portion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {topFoodsList.slice(0, 35).map((item, idx) => {
                const totalWeightStr =
                  item.totalGrams >= 1000
                    ? `${formatWeight(item.totalGrams / 1000)} kg`
                    : `${formatWeight(item.totalGrams)} g`;

                const avgPortionVal = item.count > 0 ? item.totalGrams / item.count : 0;
                const avgPortionStr = `${formatWeight(avgPortionVal)} g`;

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                      {totalWeightStr}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {item.count} days
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {avgPortionStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

AnalyticsSection.displayName = 'AnalyticsSection';

// SVG Line Chart Component with Y-axis numbers and robust flicker-free hover tooltips
const LineChartComponent: React.FC<{
  series: { date: string; shortDate: string; value: number }[];
  unit: string;
  color: string;
  formatVal?: (v: number) => string;
}> = ({ series, unit, color, formatVal }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (series.length === 0) return null;

  const values = series.map((s) => s.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;
  const paddingVal = range > 0 ? range * 0.15 : 0.5;

  const minY = Math.max(0, minVal - paddingVal);
  const maxY = maxVal + paddingVal;
  const midY = (minY + maxY) / 2;

  const width = 850;
  const height = 220;
  const padLeft = 55;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = series.map((item, index) => {
    const x = padLeft + (index / (series.length - 1 || 1)) * chartW;
    const y = padTop + chartH - ((item.value - minY) / (maxY - minY || 1)) * chartH;
    return { x, y, item, index };
  });

  const pathD = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    if (mouseX < padLeft || mouseX > width - padRight) {
      setHoveredIndex(null);
      return;
    }

    let closestIdx = 0;
    let minDistance = Infinity;

    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoveredIndex(closestIdx);
  };

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[700px] relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Y-Axis Grid Lines & Numbers */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={width - padRight}
            y2={padTop}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          <text
            x={padLeft - 8}
            y={padTop + 4}
            textAnchor="end"
            fontSize="10"
            fontFamily="monospace"
            fill="#64748b"
            fontWeight="bold"
          >
            {formatVal ? formatVal(maxY) : maxY.toFixed(1)}
          </text>

          <line
            x1={padLeft}
            y1={padTop + chartH / 2}
            x2={width - padRight}
            y2={padTop + chartH / 2}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          <text
            x={padLeft - 8}
            y={padTop + chartH / 2 + 4}
            textAnchor="end"
            fontSize="10"
            fontFamily="monospace"
            fill="#64748b"
            fontWeight="bold"
          >
            {formatVal ? formatVal(midY) : midY.toFixed(1)}
          </text>

          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={width - padRight}
            y2={padTop + chartH}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <text
            x={padLeft - 8}
            y={padTop + chartH + 4}
            textAnchor="end"
            fontSize="10"
            fontFamily="monospace"
            fill="#64748b"
            fontWeight="bold"
          >
            {formatVal ? formatVal(minY) : minY.toFixed(1)}
          </text>

          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={padTop + chartH}
            stroke="#cbd5e1"
            strokeWidth="1"
          />

          {/* Area fill */}
          <path
            d={`${pathD} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`}
            fill={color}
            fillOpacity="0.08"
          />

          {/* Main Trend Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p) => {
            const isHovered = hoveredIndex === p.index;
            return (
              <circle
                key={p.index}
                cx={p.x}
                cy={p.y}
                r={isHovered ? '6' : '3.5'}
                fill={isHovered ? color : '#ffffff'}
                stroke={color}
                strokeWidth={isHovered ? '3' : '2'}
                className="transition-all duration-150 pointer-events-none"
              />
            );
          })}

          {/* Hover Tooltip Overlay */}
          {activePoint && (
            <g pointerEvents="none">
              <line
                x1={activePoint.x}
                y1={padTop}
                x2={activePoint.x}
                y2={padTop + chartH}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />

              <g transform={`translate(${Math.max(padLeft + 70, Math.min(width - padRight - 70, activePoint.x))}, ${Math.max(padTop + 35, activePoint.y - 30)})`}>
                <rect
                  x="-70"
                  y="-32"
                  width="140"
                  height="38"
                  rx="8"
                  fill="#0f172a"
                  opacity="0.95"
                  className="shadow-lg"
                />
                <text
                  x="0"
                  y="-18"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {activePoint.item.date}
                </text>
                <text
                  x="0"
                  y="-4"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="800"
                  fontFamily="monospace"
                >
                  {formatVal ? formatVal(activePoint.item.value) : activePoint.item.value} {unit}
                </text>
              </g>
            </g>
          )}
        </svg>

        <div
          className="flex justify-between text-[10px] font-mono text-slate-500 mt-1"
          style={{ paddingLeft: `${(padLeft / width) * 100}%`, paddingRight: `${(padRight / width) * 100}%` }}
        >
          <span>{series[0]?.shortDate}</span>
          <span>{series[Math.floor(series.length / 2)]?.shortDate}</span>
          <span>{series[series.length - 1]?.shortDate}</span>
        </div>
      </div>
    </div>
  );
};
