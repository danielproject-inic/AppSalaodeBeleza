const fs = require('fs');
const path = require('path');

const baseDir = path.resolve('.');
const screensDir = path.join(baseDir, 'screens');
const componentsDir = path.join(baseDir, 'components');
const appFile = path.join(baseDir, 'App.tsx');
const indexCss = path.join(baseDir, 'index.css');

// We aggressively strip all gradients and chaotic colors
const regexReplacements = [
    // Strip all gradients
    [/bg-gradient-to-[a-z]+|from-[a-z0-9-\[\]#]+|to-[a-z0-9-\[\]#]+|via-[a-z0-9-\[\]#]+/g, ''],

    // Strip custom color shadows
    [/shadow-[a-z0-9-\[\]#]+\/[0-9]+/g, ''],

    // Strip neon text
    [/bg-clip-text text-transparent/g, ''],

    // Normalize ALL text hex codes to slate-800 or slate-400
    [/text-\[#(?:0f172a|1a1a1a|1e1e1e|221e10|050507|000000|1E1B16|0A0907|2c2c2c)\]/gi, 'text-slate-800'],
    [/text-\[#(?:8e8e8e|9ca3af|64748b|9e8947)\]/gi, 'text-slate-400'],

    // Normalize ALL gold/brown to cyan
    [/text-\[#(?:d4af37|d9a821|b8860b|e0b12d|997b28|f4c025)\]/gi, 'text-cyan-500'],
    [/bg-\[#(?:d4af37|d9a821|b8860b|e0b12d|997b28|f4c025)\]/gi, 'bg-cyan-500'],
    [/border-\[#(?:d4af37|d9a821|b8860b|e0b12d|997b28|f4c025)\]/gi, 'border-cyan-500'],

    // Normalize all dark/weird backgrounds to white (for cards) or f8fafc (for containers)
    // Beware, we don't want to break the dark navbar in App.tsx. 
    // We'll only apply this to screens/components.
    [/bg-\[#(?:221e10|1a1a25|0a0a0f|1e1e1e|020205)\]/gi, 'bg-white'],
    [/border-\[#(?:221e10|1a1a25|0a0a0f|1e1e1e|020205)\]/gi, 'border-slate-100'],

    // Ensure backgrounds are standardized
    [/bg-\[#f8fafc\]/gi, 'bg-slate-50'],
    [/bg-\[#f8f8f5\]/gi, 'bg-slate-50'],
    [/bg-\[#f4f7fb\]/gi, 'bg-slate-50'],
    [/bg-white\/[0-9]+/g, 'bg-slate-50'], // Removes glassy bg-white/10

    // Turn cyan accents standard
    [/bg-\[#06b6d4\]/gi, 'bg-cyan-500'],
    [/text-\[#06b6d4\]/gi, 'text-cyan-500'],
    [/bg-\[#06b6d4\]\/10/gi, 'bg-cyan-50'],

    // Fix multiple spaces
    [/ {2,}/g, ' '],
    [/class(?:Name)?=" /g, 'className="']
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
        console.log('Cleaned file:', path.basename(filePath));
    }
}

// Process ALL TSX files in screens and components
['screens', 'components'].forEach(dir => {
    const fullDir = path.join(baseDir, dir);
    if (fs.existsSync(fullDir)) {
        fs.readdirSync(fullDir).filter(f => f.endsWith('.tsx')).forEach(file => {
            processFile(path.join(fullDir, file));
        });
    }
});

console.log('Done normalizing all screens and components to First Image aesthetic.');
