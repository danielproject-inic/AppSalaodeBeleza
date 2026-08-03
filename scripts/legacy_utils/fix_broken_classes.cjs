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

    // Fix repetitive broken strings
    content = content.replace(/hover:bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all rounded-xl/g, 'bg-white shadow-sm border border-slate-200 hover:border-cyan-200 hover:shadow transition-all rounded-xl');
    content = content.replace(/bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all rounded-xl0/g, 'bg-white border border-slate-200 shadow-sm rounded-xl');
    content = content.replace(/bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all rounded-xl/g, 'bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl');
    content = content.replace(/bg-white text-slate-800 shadow-sm border border-slate-100 focus:border-cyan-500/g, 'bg-white border border-slate-200 text-slate-800 focus:border-cyan-500 shadow-sm rounded-xl');

    content = content.replace(/hover: hover:/g, 'hover:scale-[1.02]');
    content = content.replace(/bg-slate-800 text-slate-800/g, 'bg-slate-800 text-white');
    content = content.replace(/text-white shadow-md text-slate-800/g, 'text-white shadow-md shadow-cyan-500/20');
    content = content.replace(/rounded-xl rounded-full/g, 'rounded-full');
    content = content.replace(/rounded-xl rounded-lg/g, 'rounded-lg');
    content = content.replace(/rounded-xl rounded-3xl/g, 'rounded-3xl');
    content = content.replace(/bg-white0\/10/g, 'bg-slate-100');
    content = content.replace(/text-slate-1000/g, 'text-slate-500');
    content = content.replace(/text-slate-1000/g, 'text-slate-500');
    content = content.replace(/bg-blue-500\/100\/10/g, 'bg-blue-500/10');
    content = content.replace(/bg-purple-500\/100\/10/g, 'bg-purple-500/10');
    content = content.replace(/bg-purple-500\/100/g, 'bg-purple-500');
    content = content.replace(/bg-green-500\/100/g, 'bg-emerald-500');
    content = content.replace(/bg-red-500\/100\/20/g, 'bg-rose-500/20');
    content = content.replace(/bg-red-500\/100\/100\/10/g, 'bg-rose-500/10');

    // Standardize backgrounds of main containers in screens
    content = content.replace(/className="h-full bg-white text-slate-800/g, 'className="h-full bg-slate-50 text-slate-800');
    content = content.replace(/className="flex h-full overflow-hidden bg-white/g, 'className="flex h-full overflow-hidden bg-slate-50');

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
        console.log(`Fixed formatting in ${path.basename(file)}`);
    }
}

console.log(`Total files fixed: ${modifiedCount}`);
