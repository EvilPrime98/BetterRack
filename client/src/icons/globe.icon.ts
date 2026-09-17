export function GlobeIcon({
    size = 16,
    color = 'currentColor'
}: {
    size?: number;
    color?: string;
} = {}) {

    return `<svg
        width="${size}"
        height="${size}"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2"/>
        <ellipse cx="12" cy="12" rx="4" ry="9" stroke="${color}" stroke-width="2"/>
        <path d="M3 12h18" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

}
