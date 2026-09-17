export function ReaderLayoutIcon({
    mode,
    size = 16,
    color = '#fff'
}: {
    mode: 'single-vertical' | 'double-vertical';
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

    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="2.5" width="12" height="19" rx="1.5" stroke={color} strokeWidth="2"/>
        </svg>
    );

}
