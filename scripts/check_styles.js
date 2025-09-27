const fs = require('fs');
const path = process.argv[2] || 'components/HUDPanel.jsx';
const s = fs.readFileSync(path, 'utf8');
let i = 0, starts = [];
for(;;){ const m = s.indexOf('<style jsx>{`', i); if (m < 0) break; starts.push(m); i = m + 1; }
i = 0; let ends = [];
for(;;){ const m = s.indexOf('`}</style>', i); if (m < 0) break; ends.push(m); i = m + 1; }
console.log('file:', path);
console.log('style starts:', starts.length);
console.log('style ends  :', ends.length);
if (starts.length !== ends.length) {
  console.log('MISMATCH: a styled-jsx block may be unterminated.');
}
// show last few contexts
starts.slice(-3).forEach((pos, idx) => {
  console.log('start at', pos, 'context:', s.slice(pos, pos+30).replace(/\n/g,' '));
});
ends.slice(-3).forEach((pos, idx) => {
  console.log('end at  ', pos, 'context:', s.slice(Math.max(0,pos-20), pos+10).replace(/\n/g,' '));
});
