// Const Harness brand wordmark: CONST + HARNESS badge plate in one svg.
// Native 182x24. Ink rides currentColor; badge text is inverted.

import type { IconProps } from './icons/props.ts'

/**
 * Render the full brand wordmark.
 * @param props.size - height in px (default 24; width keeps the 182:24 ratio).
 * @param props.className - extra class for layout placement.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className }: IconProps) {
  return (
    <svg
      width={(size * 182) / 24}
      height={size}
      className={className}
      viewBox="0 0 182 24"
      fill="none"
      aria-hidden="true"
    >
      <text
        x="6"
        y="17"
        fill="currentColor"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="16"
        fontWeight="800"
        letterSpacing="0.08em"
      >
        CONST
      </text>
      <rect x="80" y="5" width="72" height="14" rx="3" fill="currentColor" />
      <text
        x="116"
        y="15.5"
        textAnchor="middle"
        fill="var(--dsw-alias-label-primary-inverted, #fff)"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="9"
        fontWeight="800"
        letterSpacing="0.12em"
      >
        HARNESS
      </text>
    </svg>
  )
}
