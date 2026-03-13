const fs = require('fs');

const files = [
    'c:\\Users\\stive\\WRITIAI\\app\\dashboard\\page.js',
    'c:\\Users\\stive\\WRITIAI\\app\\dashboard\\layout.js',
    'c:\\Users\\stive\\WRITIAI\\app\\dashboard\\expired/page.js'
];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    let content = fs.readFileSync(f, 'utf8');
    // Normalize spaces around arrows
    content = content.replace(/←\s+/g, '← ');
    content = content.replace(/\s+→/g, ' →');
    
    // Bump version to v3.6.2
    content = content.replace(/v3\.6\.[01]/g, 'v3.6.2');
    content = content.replace(/v3\.6\.0/g, 'v3.6.2');
    
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Polished and bumped: ${f}`);
});
