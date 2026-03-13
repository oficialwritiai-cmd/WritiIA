const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\stive\\WRITIAI\\app\\dashboard\\page.js';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
    { from: /Ã¡/g, to: 'á' },
    { from: /Ã©/g, to: 'é' },
    { from: /Ã­/g, to: 'í' },
    { from: /Ã³/g, to: 'ó' },
    { from: /Ãº/g, to: 'ú' },
    { from: /Ã±/g, to: 'ñ' },
    { from: /Ã /g, to: 'Á' },
    { from: /â†’/g, to: '→' },
    { from: /â† /g, to: '←' },
    { from: /ðŸ“ˆ/g, to: '📈' },
    { from: /ðŸ¤–/g, to: '🤖' },
    { from: /â ³/g, to: '⏳' },
    { from: /ðŸ’ª/g, to: '💪' },
    { from: /ðŸš€/g, to: '🚀' },
    { from: /ðŸ’¡/g, to: '💡' },
    { from: /ðŸ”¥/g, to: '🔥' },
    { from: /ðŸ’Ž/g, to: '💎' },
    { from: /ðŸŽ¯/g, to: '🎯' },
    { from: /ðŸ“£/g, to: '📢' },
    // Specific UI fix requested
    { from: /Ir a Estrategia Viral →/g, to: 'Ir a Estrategia →' }, // revert if already replaced partially
    { from: /Ir a Estrategia →/g, to: 'Ir a Estrategia Viral →' },
    { from: /Ir a Estrategia Viral →/g, to: 'Ir al Banco de Ideas Virales →' }, // Final choice based on user feedback
];

replacements.forEach(({ from, to }) => {
    content = content.replace(from, to);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Encoding fixed in ' + filePath);
