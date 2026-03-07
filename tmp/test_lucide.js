const lucide = require('lucide-react');
const icons = [
    'ChevronLeft', 'ChevronRight', 'Plus', 'X', 'Save', 'Trash2', 'Search',
    'BookOpen', 'Edit3', 'Calendar', 'LayoutGrid',
    'Type', 'Tag', 'Globe', 'Share2', 'Sparkles', 'Filter', 'MoreVertical',
    'CheckCircle2', 'Clock', 'Palette', 'Copy', 'ArrowRightLeft', 'Target'
];

icons.forEach(name => {
    if (!lucide[name]) {
        console.log(`Icon missing: ${name}`);
    } else {
        console.log(`Icon found: ${name}`);
    }
});
