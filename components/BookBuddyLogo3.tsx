"use client"

interface BookBuddyLogo3Props {
  className?: string
  size?: number
}

export function BookBuddyLogo3({ className = "", size = 32 }: BookBuddyLogo3Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 现代化的书本设计 */}
      <path
        d="M6 10H20V38H6C6 38 6 10 6 10Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M28 10H42V38H28V10Z"
        fill="currentColor"
        opacity="0.2"
      />
      
      {/* 中间装订线 */}
      <rect x="20" y="10" width="8" height="28" fill="currentColor" opacity="0.3" />
      
      {/* 左侧简约人形 */}
      <circle cx="13" cy="20" r="2" fill="currentColor" />
      <path
        d="M11 24H15V30H11V24Z"
        fill="currentColor"
      />
      
      {/* 右侧简约人形 */}
      <circle cx="35" cy="20" r="2" fill="currentColor" />
      <path
        d="M33 24H37V30H33V24Z"
        fill="currentColor"
      />
      
      {/* 中心符号 - 加号表示合作 */}
      <path
        d="M24 20V28M20 24H28"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}