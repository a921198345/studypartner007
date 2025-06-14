"use client"

interface StudyBuddyLogoMinimalProps {
  className?: string
  size?: number
}

export function StudyBuddyLogoMinimal({ className = "", size = 32 }: StudyBuddyLogoMinimalProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 两个圆形代表两个学习伙伴 */}
      <circle cx="18" cy="24" r="8" fill="currentColor" />
      <circle cx="30" cy="24" r="8" fill="currentColor" opacity="0.7" />
      
      {/* 重叠部分形成连接 */}
      <path
        d="M24 17.07C21.67 15.17 18.48 14 15 14C9.48 14 5 18.48 5 24C5 29.52 9.48 34 15 34C18.48 34 21.67 32.83 24 30.93C26.33 32.83 29.52 34 33 34C38.52 34 43 29.52 43 24C43 18.48 38.52 14 33 14C29.52 14 26.33 15.17 24 17.07Z"
        fill="currentColor"
        opacity="0.1"
      />
      
      {/* 中心的加号，表示合作 */}
      <path
        d="M24 20V28M20 24H28"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}