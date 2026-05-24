const fs = require('fs');

function fixFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf-8');
    let lines = content.split('\n');
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('<th className="py-2') || line.includes('<td className="py-2')) {
            if (line.includes('text-left') || line.includes('text-right')) {
                lines[i] = line.replace(/text-left/g, 'text-center').replace(/text-right/g, 'text-center');
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(filepath, lines.join('\n'), 'utf-8');
        console.log('Fixed ' + filepath);
    } else {
        console.log('No changes for ' + filepath);
    }
}

fixFile('c:\\\\Users\\\\ferna\\\\Downloads\\\\salon-suite-pro\\\\AppSalaodeBeleza\\\\screens\\\\SalonComissoesDashboard.tsx');
fixFile('c:\\\\Users\\\\ferna\\\\Downloads\\\\salon-suite-pro\\\\AppSalaodeBeleza\\\\collaborator-app\\\\src\\\\screens\\\\SalonComissoesDashboard.tsx');
