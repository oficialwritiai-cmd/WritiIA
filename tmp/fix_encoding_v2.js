const fs = require('fs');
const path = require('path');

const files = [
    'c:\\Users\\stive\\WRITIAI\\app\\dashboard\\page.js',
    'c:\\Users\\stive\\WRITIAI\\app\\dashboard\\layout.js'
];

const replacements = [
    { from: /Ã¡/g, to: 'á' },
    { from: /Ã©/g, to: 'é' },
    { from: /Ã­/g, to: 'í' },
    { from: /Ã³/g, to: 'ó' },
    { from: /Ãº/g, to: 'ú' },
    { from: /Ã±/g, to: 'ñ' },
    { from: /Ã /g, to: 'Á' },
    { from: /Ã“/g, to: 'Ó' },
    { from: /â†’/g, to: '→' },
    { from: /â† /g, to: '←' },
    { from: /â ³/g, to: '⏳' },
    { from: /ðŸ“ˆ/g, to: '📈' },
    { from: /ðŸ–/g, to: '🤖' },
    { from: /ðŸ’ª/g, to: '💪' },
    { from: /ðŸš€/g, to: '🚀' },
    { from: /ðŸ’¡/g, to: '💡' },
    { from: /ðŸ”¥/g, to: '🔥' },
    { from: /ðŸ’Ž/g, to: '💎' },
    { from: /ðŸŽ¯/g, to: '🎯' },
    { from: /ðŸ“£/g, to: '📢' },
];

files.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    replacements.forEach(({ from, to }) => {
        content = content.replace(from, to);
    });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Encoding fixed in ' + filePath);
});
