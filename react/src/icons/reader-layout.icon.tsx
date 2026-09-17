export function ReaderLayoutIcon({
    mode,
    size = 16,
    color = '#fff'
}: {
    mode: 'single-vertical' | 'double-vertical' | 'horizontal';
    size?: number;
    color?: string;
}) {

    if (mode === 'double-vertical') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2.5" y="4" width="8" height="16" rx="1.5" stroke={color} strokeWidth="2"/>
                <rect x="13.5" y="4" width="8" height="16" rx="1.5" stroke={color} strokeWidth="2"/>
            </svg>
        );
    }

    if (mode === 'horizontal') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="6" width="16" height="12" rx="1.5" stroke={color} strokeWidth="2"/>
                <path d="M1 12h2.5M20.5 12H23M6 9.5L3.5 12 6 14.5M18 9.5L20.5 12 18 14.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        );
    }

    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="2.5" width="12" height="19" rx="1.5" stroke={color} strokeWidth="2"/>
        </svg>
    );

}
