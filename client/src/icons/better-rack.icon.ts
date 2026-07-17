export function BetterRackIcon() {
    return `<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <defs>
        <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f5fbff"/>
          <stop offset="45%" stop-color="#c7e4ff"/>
          <stop offset="100%" stop-color="#4a90e2"/>
        </linearGradient>

        <linearGradient id="letterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#9fd8ff"/>
          <stop offset="45%" stop-color="#4ea5ff"/>
          <stop offset="100%" stop-color="#1f6fe5"/>
        </linearGradient>
          <linearGradient id="glossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
            <stop offset="60%" stop-color="#ffffff" stop-opacity="0.05"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </linearGradient>
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="4" dy="6" stdDeviation="5" flood-color="#000000" flood-opacity="0.35"/>
          </filter>
        </defs>

        <g transform="rotate(12 128 128)" filter="url(#softShadow)">
          <rect x="58" y="58" width="150" height="150" rx="14"
                fill="url(#glassGrad)" stroke="#111111" stroke-width="5"/>
          <path d="M 65 205 L 140 65 L 200 65 L 200 195 Z"
                fill="#ffffff" opacity="0.25"/>
        </g>

        <g filter="url(#softShadow)">
          <text x="128" y="168"
                font-family="Arial Black, Arial, sans-serif"
                font-weight="900"
                font-size="128"
                text-anchor="middle"
                stroke="#fff6d8"
                stroke-width="14"
                stroke-linejoin="round"
                fill="none"
                letter-spacing="-6">BR</text>

          <text x="128" y="168"
                font-family="Arial Black, Arial, sans-serif"
                font-weight="900"
                font-size="128"
                text-anchor="middle"
                fill="url(#letterGrad)"
                letter-spacing="-6">BR</text>

          <clipPath id="topHalf">
            <rect x="0" y="40" width="256" height="60"/>
          </clipPath>
          <text x="128" y="168"
                font-family="Arial Black, Arial, sans-serif"
                font-weight="900"
                font-size="128"
                text-anchor="middle"
                fill="url(#glossGrad)"
                letter-spacing="-6"
                clip-path="url(#topHalf)">BR</text>
        </g>
      </svg>`
}