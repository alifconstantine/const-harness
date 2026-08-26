export interface FileIconProps {
  filename: string
  size?: number
  className?: string
}

/**
 * File icon component that maps file extension to appropriate language badge or icon.
 */
export function FileIcon({ filename, size = 16, className }: FileIconProps) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  if (ext === 'tsx' || ext === 'jsx') {
    // React Atom Icon
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ color: '#00d8ff', flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.5" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="currentColor" strokeWidth="1.5" transform="rotate(120 12 12)" />
      </svg>
    )
  }

  if (ext === 'ts' || ext === 'mts' || ext === 'cts') {
    // TypeScript Badge
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: '#3178c6',
          color: '#ffffff',
          borderRadius: 3,
          fontSize: Math.max(9, Math.floor(size * 0.58)),
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          fontFamily: 'monospace',
          flexShrink: 0,
        }}
      >
        TS
      </div>
    )
  }

  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
    // JavaScript Badge
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: '#f7df1e',
          color: '#000000',
          borderRadius: 3,
          fontSize: Math.max(9, Math.floor(size * 0.58)),
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          fontFamily: 'monospace',
          flexShrink: 0,
        }}
      >
        JS
      </div>
    )
  }

  if (ext === 'py') {
    // Python Icon
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: '#3776ab',
          color: '#ffd43b',
          borderRadius: 3,
          fontSize: Math.max(8, Math.floor(size * 0.55)),
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          fontFamily: 'monospace',
          flexShrink: 0,
        }}
      >
        PY
      </div>
    )
  }

  if (ext === 'json') {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: '#eab308',
          color: '#000',
          borderRadius: 3,
          fontSize: Math.max(8, Math.floor(size * 0.5)),
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        &#123;&#125;
      </div>
    )
  }

  if (ext === 'css' || ext === 'scss' || ext === 'less') {
    // Purple CSS icon
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: '#8b5cf6',
          color: '#ffffff',
          borderRadius: 3,
          fontSize: Math.max(7, Math.floor(size * 0.44)),
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          fontFamily: 'monospace',
          flexShrink: 0,
        }}
      >
        CSS
      </div>
    )
  }

  // Generic File Icon
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ color: 'var(--dsw-alias-label-tertiary, #888888)', flexShrink: 0 }}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
