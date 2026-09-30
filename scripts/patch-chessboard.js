const fs = require('fs');
const path = require('path');

const filesToPatch = [
  path.join(__dirname, '..', 'node_modules', 'react-native-chessboard', 'lib', 'module', 'components', 'skia', 'skia-dots.js'),
  path.join(__dirname, '..', 'node_modules', 'react-native-chessboard', 'lib', 'commonjs', 'components', 'skia', 'skia-dots.js'),
];

for (const filePath of filesToPatch) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern for module (ES6)
    if (content.includes('color: "rgba(0, 0, 0, 0.3)"')) {
      content = content.replace(
        'color: "rgba(0, 0, 0, 0.3)"',
        'color: config.colors?.dotColor || "rgba(243, 156, 18, 0.88)"'
      );
      modified = true;
    }
    // In case opacity is 0.3
    if (content.includes('opacity: 0.3')) {
      content = content.replace('opacity: 0.3', 'opacity: 0.88');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[patch-chessboard] Patched: ${filePath}`);
    } else {
      console.log(`[patch-chessboard] Already patched or pattern not found: ${filePath}`);
    }
  }
}
