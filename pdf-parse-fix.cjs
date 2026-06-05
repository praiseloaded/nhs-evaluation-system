// pdf-parse-fix.cjs
const fs = require('fs');
const path = require('path');

// pdf-parse tries to load a test file that doesn't exist in production
const testPdfPath = path.join(__dirname, 'node_modules', 'pdf-parse', 'test', 'data');
if (!fs.existsSync(testPdfPath)) {
  fs.mkdirSync(testPdfPath, { recursive: true });
  fs.writeFileSync(path.join(testPdfPath, 'test.pdf'), '');
}