const fs = require('fs');
const code = fs.readFileSync('C:\\Users\\1306s\\.gemini\\antigravity\\scratch\\green-path-tracker\\app.js', 'utf8');
try {
  new Function(code);
  console.log("No syntax errors.");
} catch (e) {
  console.log("Syntax error:", e);
}
