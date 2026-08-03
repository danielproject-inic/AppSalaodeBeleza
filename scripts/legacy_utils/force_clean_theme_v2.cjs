const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname);

const regexReplacements = [
    // Remaining text colors
    [/text-\[#8e8e8e\]/gi, 'text-slate-500'],
    [/text-\[#06b6d4\]/gi, 'text-cyan-500'],
    [/text-\[#00ff9d\]/gi, 'text-emerald-500'],

    // Remaining backgrounds
    [/bg-\[#06b6d4\]\/10/gi, 'bg-cyan-50'],
    [/bg-\[#1e1e1e\]/gi, 'bg-slate-900'],
    [/bg-\[#1a1a1a\]/gi, 'bg-slate-900'],
    [/bg-\[#fcf5e5\]/gi, 'bg-slate-50'],
    [/bg-\[#00ff9d\]/gi, 'bg-emerald-500'],
    [/bg-\[#b5952f\]/gi, 'bg-cyan-600'],
    [/hover:bg-\[#b5952f\]/gi, 'hover:bg-cyan-600'],
    [/hover:bg-\[#0e7490\]/gi, 'hover:bg-cyan-700'],

    // Remaining borders
    [/border-\[#d4af37\]/gi, 'border-cyan-500'],
    [/border-\[#e5e5e5\]/gi, 'border-slate-200'],
    [/border-\[#f4f0e7\]/gi, 'border-slate-200'],
    [/border-\[#0f172a\]/gi, 'border-slate-800'],

    // Shadows and rings
    [/shadow-\[0_0_10px_#00ff9d\]/gi, 'shadow-md shadow-emerald-500/20'],
    [/ring-\[#00ff9d\]/gi, 'ring-emerald-500'],
    [/ring-\[#d4af37\]\/20/gi, 'ring-cyan-500/20'],

    // Clean up duplicate classes
    [/bg-white border-2 border-transparent focus:border-\[#06b6d4\]\/20 focus:bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all rounded-xl focus:ring-4 focus:ring-\[#06b6d4\]\/10 transition-all outline-none font-medium placeholder:text-slate-400 text-slate-800\/80 shadow-none/g, 'w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none font-medium text-slate-800/80 transition-all placeholder:text-slate-400'],
    [/shadow-md text-white\/100/g, 'bg-cyan-500 text-white shadow-md'],
    [/text-white text-slate-800/g, 'text-white'],
    [/text-white\/100/g, 'text-white']
];

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let originalContent = fs.readFileSync(filePath, 'utf-8');
    let newContent = originalContent;

    regexReplacements.forEach(([regex, replacement]) => {
        newContent = newContent.replace(regex, replacement);
    });

    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log('Cleaned file v2:', path.basename(filePath));
    }
}

['screens', 'components'].forEach(dir => {
    const fullDir = path.join(baseDir, dir);
    if (fs.existsSync(fullDir)) {
        fs.readdirSync(fullDir).filter(f => f.endsWith('.tsx')).forEach(file => {
            processFile(path.join(fullDir, file));
        });
    }
});

console.log('Done normalizing phase 2.');
