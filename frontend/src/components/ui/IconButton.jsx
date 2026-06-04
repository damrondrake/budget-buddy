import { cn } from '@/lib/utils'

// Icon-only button with a guaranteed 44x44px hit area — the minimum touch
// target recommended for mobile (WCAG 2.5.5, Apple HIG). The icon stays its
// natural small size; padding/min-size expands the tappable area around it so
// neighbouring buttons (e.g. edit + delete) can't steal each other's taps.
const VARIANTS = {
  neutral: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
  edit: 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50',
  danger: 'text-gray-400 hover:text-red-500 hover:bg-red-50',
  success: 'text-emerald-600 hover:bg-emerald-50',
}

export default function IconButton({
  variant = 'neutral',
  type = 'button',
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center min-h-[44px] min-w-[44px]',
        'rounded-lg transition-colors',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
