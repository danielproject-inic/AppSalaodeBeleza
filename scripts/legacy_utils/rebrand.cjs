const fs = require('fs');
const filepath = 'screens/ClientList.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// We only want to replace inside the return block
const returnIndex = content.indexOf('    return (\n        <div className="bg-transparent text-slate-800');
if (returnIndex === -1) {
  console.log('Return block not found! Trying alternative search...');
}

let target = content;

// Base themes
target = target.replace(/bg-transparent text-slate-800/g, 'bg-[#0A0F1C] text-white');

// Simple color mappings
target = target.replace(/bg-white/g, 'bg-[#1e293b]');
target = target.replace(/bg-\[\#e8e2d4\]\/40/g, 'bg-[#0f172a]');
target = target.replace(/bg-\[\#0f172a\]\/10/g, 'bg-white/10');

// Text colors
target = target.replace(/text-slate-800\/80/g, 'text-white/80');
target = target.replace(/text-slate-800/g, 'text-white');
target = target.replace(/text-slate-700/g, 'text-white/80');
target = target.replace(/text-slate-600/g, 'text-white/60');
target = target.replace(/text-slate-500/g, 'text-white/50');
target = target.replace(/text-slate-400/g, 'text-white/40');
target = target.replace(/text-slate-300/g, 'text-white/30');

// Borders & Shadows
target = target.replace(/border-slate-300/g, 'border-white/10');
target = target.replace(/border-slate-200/g, 'border-white/5');
target = target.replace(/divide-slate-200/g, 'divide-white/10');
target = target.replace(/divide-\[\#e2e8f0\]/g, 'divide-white/10');
target = target.replace(/ring-\[\#e2e8f0\]/g, 'ring-white/5');

// Brands (Cyan to Amber)
target = target.replace(/text-cyan-500/g, 'text-amber-500');
target = target.replace(/text-cyan-400/g, 'text-amber-400');
target = target.replace(/text-\[\#06b6d4\]/g, 'text-amber-500');
target = target.replace(/bg-\[\#06b6d4\]/g, 'bg-amber-600');
target = target.replace(/border-\[\#06b6d4\]/g, 'border-amber-500');
target = target.replace(/ring-\[\#06b6d4\](\/50)?/g, 'ring-amber-500/50');
target = target.replace(/hover:border-\[\#06b6d4\]/g, 'hover:border-amber-500');
target = target.replace(/shadow-cyan-500\/20/g, 'shadow-amber-900/40');
target = target.replace(/hover:bg-cyan-600/g, 'hover:bg-amber-600');
target = target.replace(/border-cyan-500\/20/g, 'border-amber-500/20');
target = target.replace(/border-cyan-200/g, 'border-amber-500/30');

// Component specific layout fixes
// Main layout container 
target = target.replace('<div className="bg-[#0A0F1C] text-white h-full font-manrope flex flex-col overflow-hidden relative">', '<div className="bg-[#0A0F1C] text-white h-full font-sans flex flex-col overflow-hidden relative selection:bg-amber-500/30">');

// Active filter tabs
target = target.replace(/bg-rose-500 text-white shadow-md shadow-rose-500\/20/g, 'bg-amber-600/20 text-amber-500 border border-amber-600/30 font-bold shadow-md shadow-amber-900/20');

// Hovering client list item
target = target.replace(/hover:bg-slate-200 text-\[\#1e293b\]/g, 'hover:bg-white/10 text-white');

// Main banner image
target = target.replace('bg-white border border-white/10 shadow-sm rounded-xl backdrop-blur-sm', 'border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md');

fs.writeFileSync(filepath, target, 'utf8');
console.log('Migration OK');
