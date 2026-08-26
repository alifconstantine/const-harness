// Const AI brand logo icon (Mirrored +32° 6-Block Razor Blade C mark).

import type { IconProps } from './icons/props.ts'

/**
 * Render the official Const AI logo icon.
 * @param props.size - width/height in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns the logo svg.
 */
export function ConstLogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 512 512"
      fill="currentColor"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="const-logo-clip">
          <path
            fillRule="evenodd"
            d="M432 72C250 36 40 136 40 256C40 376 250 476 432 440C320 384 180 320 180 256C180 192 320 128 432 72Z"
          />
        </clipPath>
      </defs>
      <g
        transform="translate(512 0) scale(-1 1) rotate(32 256 256)"
        clipPath="url(#const-logo-clip)"
      >
        <rect x="-60" y="38" width="632" height="60" />
        <rect x="-60" y="113" width="632" height="60" />
        <rect x="-60" y="188" width="632" height="60" />
        <rect x="-60" y="264" width="632" height="60" />
        <rect x="-60" y="339" width="632" height="60" />
        <rect x="-60" y="414" width="632" height="60" />
      </g>
    </svg>
  )
}

export const FishLogo = ConstLogo
