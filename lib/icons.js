import * as AllIcons from 'lucide-react';

export const ICONS = Object.keys(AllIcons).reduce((acc, key) => {
    // Exclude internal methods and non-components
    if (key !== 'createLucideIcon' && key !== 'default' && key !== 'Icon' && key !== 'LucideProps' && key !== 'lucide' && /^[A-Z]/.test(key)) {
        acc[key] = AllIcons[key];
    }
    return acc;
}, {});

export const ICON_NAMES = Object.keys(ICONS);
