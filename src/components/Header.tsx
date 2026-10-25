import React from 'react';

interface HeaderProps {
  activeTab: 'overview' | 'foodlog' | 'analytics' | 'groceries';
  setActiveTab: (tab: 'overview' | 'foodlog' | 'analytics' | 'groceries') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('foodlog');
            }}
            className="text-2xl md:text-3xl font-black tracking-tight text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap"
          >
            What I Eat
          </a>
        </div>

        {/* Centered Horizontal Navbar with Icons Above Headings */}
        <nav className="flex items-center justify-center gap-6 sm:gap-10 md:gap-12 w-full md:w-auto">
          {/* Food Log - Potato Icon */}
          <button
            onClick={() => setActiveTab('foodlog')}
            className={`group flex flex-col items-center gap-1 transition-all py-1 border-b-2 ${
              activeTab === 'foodlog'
                ? 'text-blue-600 border-blue-600 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span className="text-2xl sm:text-3xl transition-transform group-hover:scale-110 select-none">
              🥔
            </span>
            <span className="text-base sm:text-lg font-bold whitespace-nowrap">
              Food Log
            </span>
          </button>

          {/* The Theory - Yawn Icon */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`group flex flex-col items-center gap-1 transition-all py-1 border-b-2 ${
              activeTab === 'overview'
                ? 'text-blue-600 border-blue-600 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span className="text-2xl sm:text-3xl transition-transform group-hover:scale-110 select-none">
              🥱
            </span>
            <span className="text-base sm:text-lg font-bold whitespace-nowrap">
              The Theory
            </span>
          </button>

          {/* Some Stats - Mad Professor Icon */}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`group flex flex-col items-center gap-1 transition-all py-1 border-b-2 ${
              activeTab === 'analytics'
                ? 'text-blue-600 border-blue-600 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span className="text-2xl sm:text-3xl transition-transform group-hover:scale-110 select-none">
              👨‍🔬
            </span>
            <span className="text-base sm:text-lg font-bold whitespace-nowrap">
              Some Stats
            </span>
          </button>

          {/* Groceries - Shopping Basket Icon */}
          <button
            onClick={() => setActiveTab('groceries')}
            className={`group flex flex-col items-center gap-1 transition-all py-1 border-b-2 ${
              activeTab === 'groceries'
                ? 'text-blue-600 border-blue-600 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span className="text-2xl sm:text-3xl transition-transform group-hover:scale-110 select-none">
              🧺
            </span>
            <span className="text-base sm:text-lg font-bold whitespace-nowrap">
              Groceries
            </span>
          </button>
        </nav>

        {/* Right side spacer for desktop layout symmetry */}
        <div className="hidden md:block w-32 shrink-0"></div>
      </div>
    </header>
  );
};

Header.displayName = 'Header';
