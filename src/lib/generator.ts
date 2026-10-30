import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { execSync } from 'child_process';

interface Config {
  inputDir: string;
}

export async function generateSite(configPath: string): Promise<string> {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: Config = JSON.parse(configContent);
  const inputDir = path.resolve(path.dirname(configPath), config.inputDir);
  const outputDir = path.resolve(process.cwd(), 'food-log', 'docs');
  
  if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (!fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  const files = fs.readdirSync(inputDir);
  
  // Parse overview
  let overviewHtml = '<p>No overview found.</p>';
  if (files.includes('overview.md')) {
    const overviewContent = fs.readFileSync(path.join(inputDir, 'overview.md'), 'utf-8');
    overviewHtml = await marked(overviewContent);
  }

  // Parse dates and group files
  const groceriesByDate: Record<string, string[]> = {};
  const daysFoodListByDate: Record<string, string[]> = {};
  const nutritionByDate: Record<string, string[]> = {};
  const groceryImagesByDate: Record<string, string[]> = {};

  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  for (const file of files) {
    let waitroseCachedFile = null;
    if (file.endsWith('groceries w.pdf')) {
      const dateMatch = file.match(/^(\d{8})/);
      if (dateMatch) {
        const date = dateMatch[1];
        const cachedHtmlPath = path.join(tmpDir, `${date} groceries w - converted.html`);
        if (fs.existsSync(cachedHtmlPath)) {
          console.log(`Using cached converted HTML for ${file}`);
          fs.copyFileSync(cachedHtmlPath, path.join(outputDir, file.replace('.pdf', '.html')));
          waitroseCachedFile = file.replace('.pdf', '.html');
        } else {
          processWaitrosePdf(path.join(inputDir, file), outputDir, tmpDir, date);
        }
      }
    }

    const matchGroceryImage = file.match(/^(\d{8}) groceries f\.png$/);
    if (matchGroceryImage) {
      const date = matchGroceryImage[1];
      if (!groceryImagesByDate[date]) groceryImagesByDate[date] = [];
      groceryImagesByDate[date].push(file);
      continue;
    }

    const matchGroceries = file.match(/^(\d{8}) groceries (w|o)\.(pdf|html|htm)$/i);
    if (matchGroceries) {
      const date = matchGroceries[1];
      if (!groceriesByDate[date]) groceriesByDate[date] = [];
      
      if (matchGroceries[2] === 'w') {
        if (waitroseCachedFile) {
           groceriesByDate[date].push(waitroseCachedFile);
        } else {
           groceriesByDate[date].push(file.endsWith('.pdf') ? file.replace('.pdf', '.html') : file);
        }
      } else {
        groceriesByDate[date].push(file);
      }
      continue;
    }

    const matchDetail = file.match(/^(\d{8}) (detail\.pdf|summary\.txt)$/);
    if (matchDetail) {
      const date = matchDetail[1];
      if (!daysFoodListByDate[date]) daysFoodListByDate[date] = [];
      daysFoodListByDate[date].push(file);
      continue;
    }

    const matchNutrition = file.match(/^(\d{8}) nutrition\.pdf$/);
    if (matchNutrition) {
      const date = matchNutrition[1];
      if (!nutritionByDate[date]) nutritionByDate[date] = [];
      nutritionByDate[date].push(file);
      continue;
    }
  }

  // Deduplicate Ocado files per date: html format takes priority over pdf format
  for (const date in groceriesByDate) {
    const list = groceriesByDate[date];
    const hasOcadoHtml = list.some((f) => f.match(/^(\d{8}) groceries o\.(html|htm)$/i));
    if (hasOcadoHtml) {
      groceriesByDate[date] = list.filter((f) => !f.match(/^(\d{8}) groceries o\.pdf$/i));
    }
  }

  // Sort all dates descending
  const allDates = Array.from(new Set([...Object.keys(groceriesByDate), ...Object.keys(daysFoodListByDate), ...Object.keys(nutritionByDate), ...Object.keys(groceryImagesByDate)])).sort((a, b) => b.localeCompare(a));

  // Generate HTML
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>What I Eat</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍽️</text></svg>">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; }
      details > summary { list-style: none; cursor: pointer; }
      details > summary::-webkit-details-marker { display: none; }
      details { transition: all 0.3s ease; }
      .markdown-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
      .markdown-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
      .markdown-content li { margin-bottom: 0.25rem; }
      .markdown-content p { margin-bottom: 1rem; }
      .markdown-content h1 { font-size: 2.25rem; font-weight: 800; margin-top: 2rem; margin-bottom: 1rem; line-height: 1.2; }
      .markdown-content h2 { font-size: 1.875rem; font-weight: 700; margin-top: 1.75rem; margin-bottom: 0.75rem; line-height: 1.25; }
      .markdown-content h3 { font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; line-height: 1.3; }
      .markdown-content h4 { font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; line-height: 1.4; }
      .markdown-content a { color: #2563eb; text-decoration: underline; }
      .markdown-content blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; font-style: italic; color: #4b5563; }
      .markdown-content code { background-color: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.875em; }
      .markdown-content pre code { background-color: transparent; padding: 0; }
      .markdown-content pre { background-color: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; }
    </style>
</head>
<body class="bg-[#FAFAFA] text-[#111111] font-sans flex flex-col p-8 md:p-12 selection:bg-blue-200 selection:text-black max-w-5xl mx-auto w-full">
  <header class='mb-8 border-b-4 border-blue-600 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4'>
    <div>
      <h1 class='text-5xl md:text-7xl font-black tracking-tighter text-blue-600 leading-[0.8]'>What I Eat</h1>
    </div>
  </header>

  <main class='flex-1 flex flex-col gap-4'>
    <div class='flex justify-end gap-3 mb-2'>
      <button id='expand-all' class='text-sm font-bold text-blue-600 hover:underline px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors'>Expand All</button>
      <button id='collapse-all' class='text-sm font-bold text-gray-600 hover:underline px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors'>Collapse All</button>
    </div>

    <!-- COLLAPSIBLE: OVERVIEW -->
    <div class='border-b-2 border-black/10'>
      <details id='details-overview' class='group'>
        <summary class='list-none flex items-center justify-between cursor-pointer py-4 group-open:pb-2'>
          <h2 class='text-3xl font-extrabold text-blue-600 capitalize tracking-tight'>Overview of my Theory</h2>
          <span class='text-2xl font-black transition-transform duration-300 group-open:rotate-45 text-blue-600'>+</span>
        </summary>
        <div class='markdown-content pb-6 md:pr-24 text-lg md:text-xl leading-snug font-medium text-black/80'>
            ${overviewHtml}
        </div>
      </details>
    </div>

    <!-- COLLAPSIBLE: FOOD LOG -->
    <div class='border-b-2 border-black/10'>
      <details id='details-foodlog' class='group'>
        <summary class='list-none flex items-center justify-between cursor-pointer py-4'>
          <h2 class='text-3xl font-extrabold text-blue-600 capitalize tracking-tight'>Food Log</h2>
          <span class='text-2xl font-black transition-transform duration-300 group-open:rotate-45 text-blue-600'>+</span>
        </summary>
        <div class='flex flex-col gap-3 pb-8'>
            ${allDates.length === 0 ? '<p class="opacity-60 font-mono">No food logs found.</p>' : ''}
            ${allDates.map((date, index) => `
                <details id='details-date-${date}' class='group/date border border-black/10 bg-white shadow-sm rounded-lg overflow-hidden'>
                    <summary class='list-none flex items-center justify-between cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 transition-colors'>
                        <span class='text-xl md:text-2xl font-bold'>${formatDateWithDay(date)}</span>
                        <span class='text-xl font-black transition-transform duration-300 group-open/date:rotate-45'>+</span>
                    </summary>
                    <div class='flex flex-col gap-4 p-4 md:p-6 border-t border-black/5'>
                        ${(daysFoodListByDate[date] || []).map(file => {
                            const isSummary = file.endsWith('summary.txt');
                            return isSummary 
                                ? `<details id='details-summary-${date}' class='group/summary'>
                                     <summary class='flex items-start gap-3 cursor-pointer list-none outline-none'>
                                       <span class='text-2xl leading-none mt-0.5'>🍽️</span>
                                       <div class='flex-1 flex items-center mt-1'>
                                         <span class='font-bold text-lg text-blue-600 transition-colors group-hover/summary:underline'>Summary</span>
                                         <span class='ml-2 text-sm opacity-50 transition-transform duration-300 group-open/summary:-rotate-180'>▼</span>
                                       </div>
                                     </summary>
                                     <div class='ml-9 mt-2'>
                                       <pre class='whitespace-pre-wrap text-sm text-black/80 font-mono bg-gray-50 p-4 border border-gray-100 rounded-md'>${fs.readFileSync(path.join(inputDir, file), 'utf-8').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                                     </div>
                                   </details>`
                                : `<div class='flex items-center gap-3'>
                                     <span class='text-2xl leading-none'>🍎</span>
                                     <a href="./${file}" class='font-bold text-lg text-blue-600 hover:underline transition-colors'>Detailed Cronometer Daily Report</a>
                                   </div>`;
                        }).join('')}
                        
                        ${(groceryImagesByDate[date] || []).map((file, idx) => `
                            <details id='details-grocery-image-${date}-${idx}' class='group/grocery-image mt-2 pt-2 ${(daysFoodListByDate[date]?.length) ? "border-t border-gray-100" : ""}'>
                              <summary class='flex items-start gap-3 cursor-pointer list-none outline-none'>
                                <span class='text-2xl leading-none mt-0.5'>🛒</span>
                                <div class='flex-1 flex items-center mt-1'>
                                  <span class='font-bold text-lg text-blue-600 transition-colors group-hover/grocery-image:underline'>Forest Whole Foods Grocery Delivery</span>
                                  <span class='ml-2 text-sm opacity-50 transition-transform duration-300 group-open/grocery-image:-rotate-180'>▼</span>
                                </div>
                              </summary>
                              <div class='ml-9 mt-2'>
                                <img src="./${file}" alt="Forest Whole Foods Grocery Delivery" class="max-w-full h-auto border border-gray-200 rounded-md shadow-sm" />
                              </div>
                            </details>
                        `).join('')}
                        
                        ${(groceriesByDate[date] || []).map(file => {
                            const groceryLabel = file.includes('groceries w') ? 'Waitrose Grocery Delivery' : (file.includes('groceries o.') ? 'Ocado Grocery Delivery' : file);
                            return `
                            <div class='flex items-center gap-3 pt-2 ${(daysFoodListByDate[date]?.length || groceryImagesByDate[date]?.length) ? "border-t border-gray-100" : ""}'>
                                <span class='text-2xl leading-none'>🛒</span>
                                <a href="./${file}" class='font-bold text-lg text-blue-600 hover:underline transition-colors line-clamp-1'>${groceryLabel}</a>
                            </div>
                        `;
                        }).join('')}
                        
                        ${(nutritionByDate[date] || []).map(file => `
                            <div class='flex items-center gap-3 pt-2 ${(daysFoodListByDate[date]?.length || groceryImagesByDate[date]?.length || groceriesByDate[date]?.length) ? "border-t border-gray-100" : ""}'>
                                <span class='text-2xl leading-none'>📈</span>
                                <a href="./${file}" class='font-bold text-lg text-blue-600 hover:underline transition-colors line-clamp-1'>Fortnightly Cronometer Nutrition Report</a>
                            </div>
                        `).join('')}
                    </div>
                </details>
            `).join('')}
        </div>
      </details>
    </div>
  </main>
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      const detailsElements = document.querySelectorAll("details[id]");
      
      // Check if this is a back/forward navigation
      let isBackForward = false;
      const navEntries = performance.getEntriesByType("navigation");
      if (navEntries.length > 0) {
        isBackForward = navEntries[0].type === "back_forward";
      } else if (window.performance && performance.navigation) {
        isBackForward = performance.navigation.type === performance.navigation.TYPE_BACK_FORWARD;
      }

      if (isBackForward) {
        // Restore state only if navigating back
        detailsElements.forEach(details => {
          const state = sessionStorage.getItem(details.id);
          if (state === "open") {
            details.setAttribute("open", "");
          } else if (state === "closed") {
            details.removeAttribute("open");
          }
        });
      } else {
        // Otherwise start collapsed and clear old states
        detailsElements.forEach(details => {
          sessionStorage.removeItem(details.id);
          details.removeAttribute("open");
        });
      }

      // Save state on toggle
      detailsElements.forEach(details => {
        details.addEventListener("toggle", (e) => {
          sessionStorage.setItem(details.id, details.open ? "open" : "closed");
        });
      });

      // Expand/Collapse All
      document.getElementById("expand-all")?.addEventListener("click", () => {
        detailsElements.forEach(details => {
          details.setAttribute("open", "");
          sessionStorage.setItem(details.id, "open");
        });
      });

      document.getElementById("collapse-all")?.addEventListener("click", () => {
        detailsElements.forEach(details => {
          details.removeAttribute("open");
          sessionStorage.setItem(details.id, "closed");
        });
      });
    });
  </script>
</body>
</html>`;

  const cnamePath = path.join(outputDir, "CNAME");
  fs.writeFileSync(cnamePath, "food-log.freshfood.rocks", "utf-8");

  const outputPath = path.join(outputDir, 'index.html');
  fs.writeFileSync(outputPath, html, 'utf-8');
  
  // Also copy files to outputDir if outputDir is different from inputDir
  if (path.resolve(inputDir) !== path.resolve(outputDir)) {
      for (const file of files) {
          if (file.endsWith('.txt') || file.endsWith('.png') || (file.endsWith('.pdf') && !file.endsWith('groceries w.pdf'))) {
             fs.copyFileSync(path.join(inputDir, file), path.join(outputDir, file));
          }
      }
  }

  return outputPath;
}

function formatDate(yyyymmdd: string): string {
    if (yyyymmdd.length !== 8) return yyyymmdd;
    const year = yyyymmdd.substring(0, 4);
    const month = yyyymmdd.substring(4, 6);
    const day = yyyymmdd.substring(6, 8);
    return `${year}-${month}-${day}`;
}

function formatDateShort(yyyymmdd: string): string {
    if (yyyymmdd.length !== 8) return yyyymmdd;
    const monthIndex = parseInt(yyyymmdd.substring(4, 6), 10) - 1;
    const day = yyyymmdd.substring(6, 8);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${parseInt(day, 10)} ${months[monthIndex]}`;
}

function formatDateWithDay(yyyymmdd: string): string {
    if (yyyymmdd.length !== 8) return yyyymmdd;
    const year = parseInt(yyyymmdd.substring(0, 4), 10);
    const month = parseInt(yyyymmdd.substring(4, 6), 10) - 1;
    const day = parseInt(yyyymmdd.substring(6, 8), 10);
    const date = new Date(year, month, day);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[date.getDay()];
    
    // Format to DD/MM/YYYY
    const dd = String(day).padStart(2, '0');
    const mm = String(month + 1).padStart(2, '0');
    
    return `${dayName} ${dd}/${mm}/${year}`;
}

function processWaitrosePdf(filePath: string, outputDir: string, tmpDir: string, date: string) {
    const tempDir = path.join(outputDir, 'temp_' + Date.now() + Math.random().toString(36).substring(7));
    fs.mkdirSync(tempDir, { recursive: true });
    
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(tempDir, fileName);
    fs.copyFileSync(filePath, tempFilePath);
    
    try {
        console.log(`Running pdftohtml on ${fileName}...`);
        execSync(`pdftohtml -s -noframes "${fileName}"`, { cwd: tempDir, stdio: 'pipe' });
        
        const htmlFileName = fileName.replace('.pdf', '.html');
        const htmlFilePath = path.join(tempDir, htmlFileName);
        
        if (fs.existsSync(htmlFilePath)) {
            let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
            
            // Remove the 2 <p> elements containing 'SO14'
            const pTagsWithSO14Regex = /<p[^>]*>.*?SO14.*?<\/p>/gis;
            htmlContent = htmlContent.replace(pTagsWithSO14Regex, '');
            
            // Format to be cleaner and responsive without destroying original layout
            // 1. Add simple CSS for responsiveness and favicon
            htmlContent = htmlContent.replace('</head>', '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍽️</text></svg>">\n<style>body { background-color: #ffffff; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; overflow-x: hidden; } div[id^="page"] { max-width: 100%; overflow-x: auto; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }</style>\n</head>');
            
            // 2. Remove the grey bgcolor from body
            htmlContent = htmlContent.replace(/bgcolor="#A0A0A0"/gi, '');
            
            fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
                        
                        // Copy to tmp directory for future re-use
                        if (tmpDir && date) {
                           fs.copyFileSync(htmlFilePath, path.join(tmpDir, `${date} groceries w - converted.html`));
                        }
        }
        
        // Move all files except the original .pdf to outputDir
        const outputFiles = fs.readdirSync(tempDir);
        for (const file of outputFiles) {
            if (file !== fileName) {
                fs.copyFileSync(path.join(tempDir, file), path.join(outputDir, file));
            }
        }
    } catch (e) {
        console.error('Error processing Waitrose PDF with pdftohtml', filePath, e);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
