const fs = require('fs');
const path = require('path');

const searchTerms = ["lumiere", "lumière"];

function searchFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
            if (file === 'node_modules' || file === '.git' || file === 'dist') return;
            if (searchTerms.some(term => file.toLowerCase().includes(term))) {
                console.log(`FOLDER MATCH: ${fullPath}`);
            }
            searchFiles(fullPath);
        } else {
            if (searchTerms.some(term => file.toLowerCase().includes(term))) {
                console.log(`FILE NAME MATCH: ${fullPath}`);
            }
            
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (searchTerms.some(term => content.toLowerCase().includes(term))) {
                    console.log(`CONTENT MATCH: ${fullPath}`);
                }
            } catch (e) {}
        }
    });
}

searchFiles('.');
