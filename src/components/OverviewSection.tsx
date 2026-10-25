import React from 'react';

interface OverviewSectionProps {
  overviewHtml: string;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ overviewHtml }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-12 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-3xl md:text-4xl font-black text-black mb-8 border-b-2 border-black/10 pb-4 tracking-tight">
          The Theory
        </h2>

        {!overviewHtml ? (
          <div className="py-12 text-center text-black font-semibold text-xl">
            Loading theory overview...
          </div>
        ) : (
          <article
            className="prose max-w-none text-black selection:bg-blue-600 selection:text-white
              [&>h1]:text-4xl md:[&>h1]:text-5xl [&>h1]:font-black [&>h1]:text-black [&>h1]:mt-10 [&>h1]:mb-6 [&>h1]:tracking-tight [&>h1]:leading-tight
              [&>h2]:text-3xl md:[&>h2]:text-4xl [&>h2]:font-extrabold [&>h2]:text-black [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:pb-3 [&>h2]:border-b-2 [&>h2]:border-black/10 [&>h2]:tracking-tight
              [&>h3]:text-2xl md:[&>h3]:text-3xl [&>h3]:font-extrabold [&>h3]:text-black [&>h3]:mt-8 [&>h3]:mb-3 [&>h3]:tracking-tight
              [&>h4]:text-xl md:[&>h4]:text-2xl [&>h4]:font-bold [&>h4]:text-black [&>h4]:mt-6 [&>h4]:mb-2
              [&>p]:text-black [&>p]:leading-relaxed [&>p]:mb-6 [&>p]:text-xl md:[&>p]:text-2xl [&>p]:font-medium
              [&>ul]:list-disc [&>ul]:pl-8 [&>ul]:mb-6 [&>ul>li]:mb-3 [&>ul>li]:text-black [&>ul>li]:text-xl md:[&>ul>li]:text-2xl
              [&>ol]:list-decimal [&>ol]:pl-8 [&>ol]:mb-6 [&>ol>li]:mb-3 [&>ol>li]:text-black [&>ol>li]:text-xl md:[&>ol>li]:text-2xl
              [&>blockquote]:border-l-4 [&>blockquote]:border-blue-600 [&>blockquote]:bg-slate-50 [&>blockquote]:py-4 [&>blockquote]:px-6 [&>blockquote]:rounded-r-xl [&>blockquote]:italic [&>blockquote]:text-black [&>blockquote]:text-2xl [&>blockquote]:my-6
              [&>a]:text-blue-600 [&>a]:font-bold [&>a]:underline hover:[&>a]:text-blue-800
              [&>code]:text-black [&>code]:bg-slate-100 [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>code]:font-mono
              [&>strong]:text-black [&>strong]:font-black"
            dangerouslySetInnerHTML={{ __html: overviewHtml }}
          />
        )}
      </div>
    </div>
  );
};

OverviewSection.displayName = 'OverviewSection';
