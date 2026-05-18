const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const dirFile = path.join(dir, file);
        const dirent = fs.statSync(dirFile);
        if (dirent.isDirectory()) {
            filelist = walkSync(dirFile, filelist);
        } else {
            if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
                filelist.push(dirFile);
            }
        }
    }
    return filelist;
};

const screensDir = path.join(__dirname, 'screens');
const componentsDir = path.join(__dirname, 'components');

let files = [];
if (fs.existsSync(screensDir)) files = files.concat(walkSync(screensDir));
if (fs.existsSync(componentsDir)) files = files.concat(walkSync(componentsDir));

let modifiedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Gold replacements
    content = content.replace(/bg-gold-500\/10/g, 'bg-cyan-500/10');
    content = content.replace(/bg-gold-500\/5/g, 'bg-cyan-500/5');
    content = content.replace(/bg-gold-500\/20/g, 'bg-cyan-500/20');
    content = content.replace(/border-gold-500\/30/g, 'border-cyan-500/30');
    content = content.replace(/border-gold-500\/20/g, 'border-cyan-500/20');
    content = content.replace(/text-gold-400/g, 'text-cyan-600');
    content = content.replace(/text-gold-500/g, 'text-cyan-600');
    content = content.replace(/shadow-gold/g, 'shadow-cyan-500/20');
    content = content.replace(/shadow-gold-hover/g, 'shadow-cyan-500/40');
    content = content.replace(/text-\[#9c8749\]/g, 'text-amber-600');
    content = content.replace(/focus:ring-\[#D4AF37\]/g, 'focus:ring-cyan-500');
    content = content.replace(/text-\[#D4AF37\]/g, 'text-cyan-600');
    content = content.replace(/bg-\[#D4AF37\]/g, 'bg-cyan-500');
    content = content.replace(/text-transparent bg-clip-text D4AF37\] F2D06B\]/g, 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-cyan-400');
    content = content.replace(/D4AF37\] F2D06B\]/g, 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]');
    content = content.replace(/bg-primary-dark/g, 'bg-cyan-600');
    content = content.replace(/bg-primary/g, 'bg-cyan-500 text-white');
    content = content.replace(/border-\[#f2e6c4\]/g, 'border-slate-200');
    content = content.replace(/bg-\[#fffaeb\]/g, 'bg-white');

    // Also clean up those random classes I just saw in search results
    content = content.replace(/shadow-none hover:shadow-cyan-500\/20/g, 'shadow-sm hover:shadow-cyan-500/20');
    content = content.replace(/bg-white text-white/g, 'bg-cyan-500 text-white'); // Fixed double replace issue from bg-primary
    content = content.replace(/bg-white hover:bg-cyan-600 text-slate-800/g, 'bg-cyan-500 hover:bg-cyan-600 text-white');

    // Readability fixes
    content = content.replace(/text-slate-400 uppercase tracking-\[0.2em\]/g, 'text-slate-500 uppercase tracking-[0.2em]');
    content = content.replace(/text-slate-400 uppercase tracking-\[0.5em\]/g, 'text-slate-500 uppercase tracking-[0.5em]');
    content = content.replace(/text-slate-400 uppercase tracking-widest/g, 'text-slate-500 uppercase tracking-widest');
    content = content.replace(/text-slate-400\'\}/g, 'text-slate-500\'}');

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
        console.log(`Fixed gold in ${path.basename(file)}`);
    }
}

console.log(`Total files fixed: ${modifiedCount}`);
