import * as AllIcons from 'lucide-react';

export const CustomTank = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="6" width="10" height="16" rx="4" />
        <rect x="10" y="2" width="4" height="4" />
        <path d="M14 4h3v3" />
        <path d="M7 10h10" />
    </svg>
);

export const CustomMask = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6v3c0 2.8-2.2 5-5 5h-1c-.6 0-1 .4-1 1v1c0 1.1-.9 2-2 2s-2-.9-2-2v-1c0-.6-.4-1-1-1H8c-2.8 0-5-2.2-5-5v-3z" />
        <path d="M12 4v9" />
    </svg>
);

export const CustomFins = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 21L5 11 7 3h3l1 8-4 10z" />
        <path d="M17 21l2-10-2-8h-3l-1 8 4 10z" />
        <path d="M5 11h4" />
        <path d="M15 11h4" />
    </svg>
);

export const CustomReg = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="14" r="5" />
        <path d="M7 14H3" />
        <path d="M21 14h-4" />
        <path d="M12 9V3" />
        <circle cx="12" cy="14" r="2" />
        <path d="M15 5s2-2 5 0" />
    </svg>
);

export const ICONS = Object.keys(AllIcons).reduce((acc, key) => {
    // Exclude internal methods and non-components
    if (key !== 'createLucideIcon' && key !== 'default' && key !== 'Icon' && key !== 'LucideProps' && key !== 'lucide' && /^[A-Z]/.test(key)) {
        acc[key] = AllIcons[key];
    }
    return acc;
}, {
    'ScubaTank': CustomTank,
    'ScubaMask': CustomMask,
    'ScubaFins': CustomFins,
    'ScubaRegulator': CustomReg,
});

export const ICON_NAMES = Object.keys(ICONS);
