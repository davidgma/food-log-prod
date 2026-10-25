import React from 'react';
import { SummaryStats } from '../types/foodLog';

interface KpiStripProps {
  stats: SummaryStats;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 bg-white p-4 rounded-xl border border-slate-200">
      <div className="p-2">
        <span className="text-xs font-bold text-slate-500 block">Calories Eaten</span>
        <span className="text-2xl font-black text-blue-600 tabular-nums">
          {stats.caloriesEaten ?? '—'} <span className="text-xs font-normal text-slate-500">kcal</span>
        </span>
      </div>

      <div className="p-2">
        <span className="text-xs font-bold text-slate-500 block">Exercise Calories</span>
        <span className="text-2xl font-black text-emerald-600 tabular-nums">
          {stats.totalExerciseKcal ?? 0} <span className="text-xs font-normal text-slate-500">kcal</span>
        </span>
      </div>

      <div className="p-2">
        <span className="text-xs font-bold text-slate-500 block">Net Calories</span>
        <span className="text-2xl font-black text-slate-900 tabular-nums">
          {stats.netCaloriesKcal ?? stats.caloriesEaten ?? '—'} <span className="text-xs font-normal text-slate-500">kcal</span>
        </span>
      </div>

      <div className="p-2">
        <span className="text-xs font-bold text-slate-500 block">Weight Eaten</span>
        <span className="text-2xl font-black text-slate-900 tabular-nums">
          {stats.weightEatenGrams ?? '—'} <span className="text-xs font-normal text-slate-500">g</span>
        </span>
      </div>

      <div className="p-2">
        <span className="text-xs font-bold text-slate-500 block">Caloric Density</span>
        <span className="text-2xl font-black text-slate-900 tabular-nums">
          {typeof stats.kcalPerGram === 'number' ? stats.kcalPerGram.toFixed(1) : '—'}{' '}
          <span className="text-xs font-normal text-slate-500">kcal/g</span>
        </span>
      </div>

      <div className="p-2">
        <span className="text-xs font-bold text-slate-500 block">Macros (Fat/Carbs/Protein)</span>
        <span className="text-lg font-black text-slate-900 tabular-nums">
          {stats.fatPct ?? 0}% / {stats.carbsPct ?? 0}% / {stats.proteinPct ?? 0}%
        </span>
      </div>

      <div className="p-2">
        <span className="text-xs font-bold text-slate-500 block">Saturated Fat</span>
        <span className="text-2xl font-black text-amber-600 tabular-nums">
          {typeof stats.saturatedFatGrams === 'number' ? stats.saturatedFatGrams : '—'}{' '}
          <span className="text-xs font-normal text-slate-500">g</span>
        </span>
      </div>
    </div>
  );
};

KpiStrip.displayName = 'KpiStrip';
