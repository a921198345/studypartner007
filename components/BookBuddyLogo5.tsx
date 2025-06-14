"use client"

interface BookBuddyLogo5Props {
  className?: string
  size?: number
}

export function BookBuddyLogo5({ className = "", size = 32 }: BookBuddyLogo5Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 书本轮廓 - 更加几何化 */}
      <path
        d="M8 12L24 8L40 12V36L24 40L8 36V12Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* 书脊高亮 */}
      <line
        x1="24"
        y1="8"
        x2="24"
        y2="40"
        stroke="currentColor"
        strokeWidth="3"
      />
      
      {/* 左侧图标人物 */}
      <circle cx="16" cy="22" r="4" fill="currentColor" />
      <circle cx="16" cy="22" r="2" fill="white" />
      
      {/* 右侧图标人物 */}
      <circle cx="32" cy="22" r="4" fill="currentColor" opacity="0.8" />
      <circle cx="32" cy="22" r="2" fill="white" />
      
      {/* 底部装饰 */}
      <rect x="14" y="30" width="4" height="2" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="22" y="30" width="4" height="2" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="30" y="30" width="4" height="2" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  )
}