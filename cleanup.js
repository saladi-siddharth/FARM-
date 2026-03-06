// Cleanup: Remove orphaned old code from trading.html
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'trading.html');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

// The good code is lines 0-1236 (0-indexed), i.e. 1-1237 (1-indexed)
// Line 1237 (1-indexed) is </body>, line 1236 (1-indexed) is </script>
// Everything after line 1237 is orphaned old code

let goodLines = lines.slice(0, 1237); // lines 1-1237 (0-indexed 0-1236)

// Ensure proper ending
const lastLine = goodLines[goodLines.length - 1].trim();
if (lastLine !== '</body>') {
    goodLines.push('</body>');
}
goodLines.push('');
goodLines.push('</html>');

fs.writeFileSync(filePath, goodLines.join('\r\n'), 'utf8');
console.log(`✅ Cleaned up trading.html: ${goodLines.length} lines (was ${lines.length})`);
