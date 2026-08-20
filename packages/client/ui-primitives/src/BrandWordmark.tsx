// Const Harness brand wordmark: Const Logo + CONST + HARNESS badge plate in one svg.
// Native 190x24. Ink rides currentColor; badge text is inverted.

import type { IconProps } from './icons/props.ts'

/**
 * Render the full brand wordmark.
 * @param props.size - height in px (default 24; width keeps the 190:24 ratio).
 * @param props.className - extra class for layout placement.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className }: IconProps) {
  return (
    <svg
      width={(size * 190) / 24}
      height={size}
      className={className}
      viewBox="0 0 190 24"
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
        x="26"
        y="17"
        fill="currentColor"
        fontFamily="'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="15"
        fontWeight="800"
        letterSpacing="0.05em"
      >
        CONST
      </text>
      <rect x="90" y="5" width="76" height="14" rx="3" fill="currentColor" />
      <text
        x="128"
        y="15.5"
        textAnchor="middle"
        fill="var(--dsw-alias-label-primary-inverted, #fff)"
        fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="9"
        fontWeight="800"
        letterSpacing="0.12em"
      >
        HARNESS
      </text>
    </svg>
  )
}
