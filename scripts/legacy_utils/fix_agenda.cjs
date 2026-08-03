const fs = require('fs');

let temp = fs.readFileSync('tmp_edit2.cjs', 'utf8');
let startStr = 'const newReturnBlock = `';
let endStr = '`;\n\n  c = beforeReturn';

let startIndex = temp.indexOf(startStr);
let endIndex = temp.lastIndexOf('`;\n\n  c = beforeReturn');
if (endIndex === -1) {
    endIndex = temp.lastIndexOf('`;');
}

if (startIndex > -1) {
    let block = temp.substring(startIndex + startStr.length, endIndex);
    
    // Clean up escaping used in my previous generation script
    block = block.replace(/\\\$/g, '$');
    block = block.replace(/\\`/g, '\`');
    
    let file = fs.readFileSync('screens/DetailedAgenda.tsx', 'utf8');
    
    // Replace the exact ending
    let target = '};\n\nexport default DetailedAgenda;';
    if (file.includes(target)) {
        file = file.replace(target, block + '\n' + target);
        fs.writeFileSync('screens/DetailedAgenda.tsx', file);
        console.log('Restaurado com sucesso!');
    } else {
        console.log('Alvo para substituição não encontrado!');
    }
} else {
    console.log('Bloco de template não encontrado no tmp_edit2.cjs');
}
