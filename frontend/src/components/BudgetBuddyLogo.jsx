// BudgetBuddy logo — two overlapping emerald circles with stylized "B"s.
// Two variants:
//   - "icon": just the mark (square SVG)
//   - "horizontal": mark + "Budget" (dark) + "Buddy" (emerald) wordmark
// Sizes: sm | md | lg | xl

const EMERALD = '#10b981'

// Pixel dimensions per size for the icon mark and the wordmark text.
const SIZES = {
  sm: { icon: 28, text: 'text-lg' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 56, text: 'text-3xl' },
  xl: { icon: 72, text: 'text-4xl' },
}

function LogoMark({ pixels }) {
  return (
    <svg
      width={pixels}
      height={pixels}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BudgetBuddy"
    >
      {/* Large circle with B */}
      <circle cx="24" cy="27" r="22" fill={EMERALD} />
      <path
        d="M17 16h9.5c4.2 0 7 2.2 7 5.8 0 2.4-1.3 4.1-3.4 4.9 2.6.7 4.2 2.6 4.2 5.4 0 3.9-3 6.3-7.6 6.3H17V16zm8.6 9.1c1.9 0 3.1-1 3.1-2.6 0-1.6-1.2-2.5-3.1-2.5h-3.8v5.1h3.8zm.5 9.2c2 0 3.2-1 3.2-2.7 0-1.7-1.2-2.7-3.3-2.7h-4.2v5.4h4.3z"
        fill="#ffffff"
      />
      {/* Small overlapping circle with smaller B */}
      <circle cx="46" cy="46" r="14" fill={EMERALD} />
      <path
        d="M41 39h6c2.7 0 4.5 1.4 4.5 3.7 0 1.5-.8 2.6-2.2 3.1 1.7.4 2.7 1.6 2.7 3.4 0 2.5-1.9 4-4.9 4H41V39zm5.5 5.8c1.2 0 2-.6 2-1.6 0-1-.8-1.6-2-1.6h-2.4v3.2h2.4zm.3 5.9c1.3 0 2.1-.6 2.1-1.7 0-1.1-.8-1.7-2.1-1.7h-2.7v3.4h2.7z"
        fill="#ffffff"
      />
    </svg>
  )
}

export default function BudgetBuddyLogo({ variant = 'horizontal', size = 'md', className = '' }) {
  const { icon, text } = SIZES[size] || SIZES.md

  if (variant === 'icon') {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <LogoMark pixels={icon} />
      </span>
    )
  }

  const wordmark = (
    <span className={`font-bold tracking-tight ${text}`}>
      <span style={{ color: 'var(--foreground, #030213)' }}>Budget</span>
      <span style={{ color: EMERALD }}>Buddy</span>
    </span>
  )

  // Stacked ("full") variant: mark centered above the wordmark.
  if (variant === 'stacked') {
    return (
      <span className={`inline-flex flex-col items-center gap-3 ${className}`}>
        <LogoMark pixels={icon} />
        {wordmark}
      </span>
    )
  }

  // Horizontal: mark beside the wordmark.
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark pixels={icon} />
      {wordmark}
    </span>
  )
}
