export function CheckIcon({
    size = 16,
    color = 'currentColor'
}: {
    size?: number;
    color?: string;
} = {}) {

    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 13l4.5 4.5L19 8" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

}
