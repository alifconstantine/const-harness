// Const brand logo icon (compact rail glyph).

import type { IconProps } from './icons/props.ts'

/**
 * Render the Const logo icon for the sidebar rail.
 * @param props.size - width in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns the logo svg.
 */
export function FishLogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="13"
        fontWeight="900"
      >
        C
      </text>
    </svg>
  )
}
