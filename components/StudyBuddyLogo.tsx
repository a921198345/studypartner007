"use client"

interface StudyBuddyLogoProps {
  className?: string
  size?: number
}

export function StudyBuddyLogo({ className = "", size = 32 }: StudyBuddyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 背景圆 */}
      <circle cx="24" cy="24" r="22" fill="currentColor" opacity="0.1" />
      
      {/* 左侧人物轮廓 */}
      <path
        d="M16 20C16 17.2386 18.2386 15 21 15C23.7614 15 26 17.2386 26 20C26 22.7614 23.7614 25 21 25C18.2386 25 16 22.7614 16 20Z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M14 35C14 31.134 17.134 28 21 28C24.866 28 28 31.134 28 35V38H14V35Z"
        fill="currentColor"
        opacity="0.8"
      />
      
      {/* 右侧人物轮廓 */}
      <path
        d="M22 14C22 11.2386 24.2386 9 27 9C29.7614 9 32 11.2386 32 14C32 16.7614 29.7614 19 27 19C24.2386 19 22 16.7614 22 14Z"
        fill="currentColor"
      />
      <path
        d="M20 29C20 25.134 23.134 22 27 22C30.866 22 34 25.134 34 29V32H20V29Z"
        fill="currentColor"
      />
      
      {/* 书本图标 */}
      <rect
        x="30"
        y="28"
        width="12"
        height="14"
        rx="1"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M32 30H40M32 33H40M32 36H38"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* 连接线 - 表示合作关系 */}
      <path
        d="M24 24C24 24 26 26 28 26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}