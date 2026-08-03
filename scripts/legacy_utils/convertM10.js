const fs = require('fs');

const htmlPath = './public/comissoes-futuro-m10.html';
const html = fs.readFileSync(htmlPath, 'utf8');

// 1. Extract CSS
const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
let css = cssMatch ? cssMatch[1] : '';

// Prefix css with a container class to avoid breaking the rest of the app
css = css.replace(/body\s*{/g, '.m10-container {');
css = css.replace(/body::after\s*{/g, '.m10-container::after {');
// we might need more prefixing but let's just write the raw CSS and import it
fs.writeFileSync('./screens/M10Canvas.css', css);

// We need to write SalonComissoesDashboard.tsx
// It's a huge component. Let's start with a simpler template mapping real data.
