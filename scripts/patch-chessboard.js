const fs = require('fs');
const path = require('path');

const filesToPatch = [
  path.join(__dirname, '..', 'node_modules', 'react-native-chessboard', 'src', 'components', 'skia', 'skia-dots.tsx'),
  path.join(__dirname, '..', 'node_modules', 'react-native-chessboard', 'lib', 'module', 'components', 'skia', 'skia-dots.js'),
  path.join(__dirname, '..', 'node_modules', 'react-native-chessboard', 'lib', 'commonjs', 'components', 'skia', 'skia-dots.js'),
];

for (const filePath of filesToPatch) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern for JSX/TSX
    if (content.includes('color="rgba(0, 0, 0, 0.3)"')) {
      content = content.replace(
        'color="rgba(0, 0, 0, 0.3)"',
        'color={config.colors?.dotColor || "rgba(243, 156, 18, 0.88)"}'
      );
      modified = true;
    }
    // Pattern for JS/CJS
    if (content.includes('color: "rgba(0, 0, 0, 0.3)"')) {
      content = content.replace(
        'color: "rgba(0, 0, 0, 0.3)"',
        'color: config.colors?.dotColor || "rgba(243, 156, 18, 0.88)"'
      );
      modified = true;
    }
    // Opacity
    if (content.includes('opacity={0.5}')) {
      content = content.replace('opacity={0.5}', 'opacity={0.88}');
      modified = true;
    }
    if (content.includes('opacity: 0.5')) {
      content = content.replace('opacity: 0.5', 'opacity: 0.88');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[patch-chessboard] Patched: ${filePath}`);
    } else {
      console.log(`[patch-chessboard] Pattern not found or already patched: ${filePath}`);
    }
  } else {
    console.log(`[patch-chessboard] File not found: ${filePath}`);
  }
}
