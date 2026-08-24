// Const Harness brand wordmark: Const Logo + CONST + HARNESS badge plate in one svg.
// Native 180x24. Ink rides currentColor; badge uses refined hairline outline.

import type { IconProps } from './icons/props.ts'

/**
 * Render the full brand wordmark.
 * @param props.size - height in px (default 24; width keeps the 180:24 ratio).
 * @param props.className - extra class for layout placement.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className }: IconProps) {
  return (
    <svg
      width={(size * 180) / 24}
      height={size}
      className={className}
      viewBox="0 0 180 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="const-wordmark-clip">
          <path
            fillRule="evenodd"
            d="M432 72C250 36 40 136 40 256C40 376 250 476 432 440C320 384 180 320 180 256C180 192 320 128 432 72Z"
          />
        </clipPath>
      </defs>
      <g transform="translate(1, 2) scale(0.0390625)">
        <g
          transform="translate(512 0) scale(-1 1) rotate(32 256 256)"
          clipPath="url(#const-wordmark-clip)"
          fill="currentColor"
        >
          <rect x="-60" y="38" width="632" height="60" />
          <rect x="-60" y="113" width="632" height="60" />
          <rect x="-60" y="188" width="632" height="60" />
          <rect x="-60" y="264" width="632" height="60" />
          <rect x="-60" y="339" width="632" height="60" />
          <rect x="-60" y="414" width="632" height="60" />
        </g>
      </g>
      <text
        x="27"
        y="16.5"
        fill="currentColor"
        fontFamily="'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="14.5"
        fontWeight="400"
        letterSpacing="0.08em"
      >
        CONST
      </text>
      <rect
        x="86"
        y="4.5"
        width="66"
        height="15"
        rx="3"
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.3"
      />
      <text
        x="119"
        y="15"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="8.5"
        fontWeight="500"
        letterSpacing="0.14em"
      >
        HARNESS
      </text>
    </svg>
  )
}
