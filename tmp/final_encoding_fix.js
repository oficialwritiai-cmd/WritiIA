const fs = require('fs');
const path = require('path');

const filesToFix = [
    'c:\\Users\\stive\\WRITIAI\\app\\dashboard\\page.js',
    'c:\\Users\\stive\\WRITIAI\\app\\dashboard\\layout.js',
    'c:\\Users\\stive\\WRITIAI\\app\\dashboard/expired/page.js'
];

const replacements = [
    // Corrupted arrow sequence (likely â† followed by space)
    { from: /â†\s+/g, to: '← ' },
    { from: /â†/g, to: '←' },
    { from: /â†’/g, to: '→' },
    { from: /â† /g, to: '←' },
    // Corrupted accents
    { from: /AtrÃ¡s/g, to: 'Atrás' },
    { from: /AtrÃ s/g, to: 'Atrás' },
    { from: /Ã¡/g, to: 'á' },
    { from: /Ã©/g, to: 'é' },
    { from: /Ã­/g, to: 'í' },
    { from: /Ã³/g, to: 'ó' },
    { from: /Ãº/g, to: 'ú' },
    { from: /Ã±/g, to: 'ñ' },
    // Corrupted dagger seen by user († Atrás)
    { from: /† Atrás/g, to: '← Atrás' },
    { from: /†/g, to: '←' },
    // Clean up any remaining UTF-8 interpretation issues
    { from: /Siguiente: Detalle â†’/g, to: 'Siguiente: Detalle →' },
    { from: /Generar Guiones â†’/g, to: 'Generar Guiones →' },
    { from: /dÃ­as/g, to: 'días' }
];

filesToFix.forEach(filePath => {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`Skipping: ${filePath} (not found)`);
            return;
        }
        
        // Read file as buffer to be extremely precise
        let buffer = fs.readFileSync(filePath);
        let content = buffer.toString('utf8');
        
        let originalContent = content;
        replacements.forEach(rep => {
            content = content.replace(rep.from, rep.to);
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed encoding in: ${filePath}`);
        } else {
            console.log(`No changes needed in: ${filePath}`);
        }
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
    }
});
