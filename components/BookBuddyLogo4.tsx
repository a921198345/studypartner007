"use client"

interface BookBuddyLogo4Props {
  className?: string
  size?: number
}

export function BookBuddyLogo4({ className = "", size = 32 }: BookBuddyLogo4Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 书页翻开效果 */}
      <path
        d="M24 12C20 8 12 8 8 12V36C12 32 20 32 24 36C28 32 36 32 40 36V12C36 8 28 8 24 12Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      
      {/* 左页内容 - 抽象人形 */}
      <rect x="14" y="18" width="4" height="4" rx="2" fill="currentColor" />
      <rect x="13" y="24" width="6" height="6" rx="1" fill="currentColor" />
      
      {/* 右页内容 - 抽象人形 */}
      <rect x="30" y="18" width="4" height="4" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="29" y="24" width="6" height="6" rx="1" fill="currentColor" opacity="0.8" />
      
      {/* 中心线 */}
      <line
        x1="24"
        y1="12"
        x2="24"
        y2="36"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
      />
      
      {/* 交流线条 */}
      <path
        d="M18 26C20 24 22 24 24 26C26 24 28 24 30 26"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}