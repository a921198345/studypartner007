"use client"

interface BookBuddyLogo1Props {
  className?: string
  size?: number
}

export function BookBuddyLogo1({ className = "", size = 32 }: BookBuddyLogo1Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 打开的书本 - 更圆润的设计 */}
      <path
        d="M24 40C24 40 6 36 6 22V10C6 10 15 6 24 10C33 6 42 10 42 10V22C42 36 24 40 24 40Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* 书脊 */}
      <line
        x1="24"
        y1="10"
        x2="24"
        y2="40"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      
      {/* 左侧人物 - 微笑表情 */}
      <circle cx="16" cy="18" r="2.5" fill="currentColor" />
      {/* 微笑弧线 */}
      <path 
        d="M14 22C14 22 15 23.5 16 23.5C17 23.5 18 22 18 22" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      
      {/* 右侧人物 - 微笑表情 */}
      <circle cx="32" cy="18" r="2.5" fill="currentColor" />
      {/* 微笑弧线 */}
      <path 
        d="M30 22C30 22 31 23.5 32 23.5C33 23.5 34 22 34 22" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      
      {/* 装饰性元素 - 学习符号 */}
      <circle cx="24" cy="30" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="24" cy="35" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  )
}