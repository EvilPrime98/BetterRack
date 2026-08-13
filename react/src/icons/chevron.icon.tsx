export function ChevronDownIcon({
    size = 14,
    color = '#e8a33d'
}: {
    size?: number;
    color?: string;
} = {}) {

    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

}
