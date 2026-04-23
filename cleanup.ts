import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
content.splice(344, 125); // Delete 125 lines starting from line 345 (index 344)
fs.writeFileSync('src/App.tsx', content.join('\n'));
