"use client"

interface StudyBuddyLogoCleanProps {
  className?: string
  size?: number
}

export function StudyBuddyLogoClean({ className = "", size = 32 }: StudyBuddyLogoCleanProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 使用单一路径创建两个连接的圆形 */}
      <path
        d="M32 24C32 19.5817 28.4183 16 24 16C21.8783 16 19.9656 16.8426 18.5607 18.2132C17.1607 16.8375 15.2504 16 13.1333 16C8.71504 16 5.13333 19.5817 5.13333 24C5.13333 28.4183 8.71504 32 13.1333 32C15.2504 32 17.1607 31.1625 18.5607 29.7868C19.9656 31.1574 21.8783 32 24 32C28.4183 32 32 28.4183 32 24Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      
      {/* 书本图标叠加 */}
      <path
        d="M37 20V34L42 32V18L37 20Z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M35 19L30 17V31L35 33V19Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  )
}