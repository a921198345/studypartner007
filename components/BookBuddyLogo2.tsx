"use client"

interface BookBuddyLogo2Props {
  className?: string
  size?: number
}

export function BookBuddyLogo2({ className = "", size = 32 }: BookBuddyLogo2Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 书本背景 - 实心设计 */}
      <path
        d="M24 38L8 34V12L24 8L40 12V34L24 38Z"
        fill="currentColor"
        opacity="0.15"
      />
      
      {/* 书脊 */}
      <rect x="23" y="8" width="2" height="30" fill="currentColor" opacity="0.3" />
      
      {/* 左侧学生形象 - 简化版 */}
      <circle cx="16" cy="20" r="3" fill="currentColor" />
      <rect x="13" y="24" width="6" height="8" rx="1" fill="currentColor" />
      
      {/* 右侧学生形象 - 简化版 */}
      <circle cx="32" cy="20" r="3" fill="currentColor" opacity="0.8" />
      <rect x="29" y="24" width="6" height="8" rx="1" fill="currentColor" opacity="0.8" />
      
      {/* 连接元素 - 表示交流 */}
      <path
        d="M19 26H29"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 2"
        opacity="0.5"
      />
    </svg>
  )
}