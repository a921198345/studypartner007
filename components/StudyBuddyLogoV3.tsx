"use client"

interface StudyBuddyLogoV3Props {
  className?: string
  size?: number
}

export function StudyBuddyLogoV3({ className = "", size = 32 }: StudyBuddyLogoV3Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 主圆形背景 */}
      <circle cx="24" cy="24" r="20" fill="currentColor" opacity="0.1" />
      
      {/* 左侧人物 - 简化设计 */}
      <path
        d="M18 16C18 14.3431 19.3431 13 21 13C22.6569 13 24 14.3431 24 16C24 17.6569 22.6569 19 21 19C19.3431 19 18 17.6569 18 16Z"
        fill="currentColor"
      />
      <path
        d="M16 28C16 25.2386 18.2386 23 21 23C23.7614 23 26 25.2386 26 28V32C26 32.5523 25.5523 33 25 33H17C16.4477 33 16 32.5523 16 32V28Z"
        fill="currentColor"
      />
      
      {/* 右侧人物 - 简化设计 */}
      <path
        d="M24 16C24 14.3431 25.3431 13 27 13C28.6569 13 30 14.3431 30 16C30 17.6569 28.6569 19 27 19C25.3431 19 24 17.6569 24 16Z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M22 28C22 25.2386 24.2386 23 27 23C29.7614 23 32 25.2386 32 28V32C32 32.5523 31.5523 33 31 33H23C22.4477 33 22 32.5523 22 32V28Z"
        fill="currentColor"
        opacity="0.8"
      />
      
      {/* 中间的书本 - 连接两人 */}
      <rect
        x="20"
        y="26"
        width="8"
        height="10"
        rx="1"
        fill="white"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="24"
        y1="27"
        x2="24"
        y2="35"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      
      {/* 光芒效果 - 表示学习的启发 */}
      <path
        d="M24 8L25.5 11L28.5 11.5L26 14L26.5 17L24 15.5L21.5 17L22 14L19.5 11.5L22.5 11L24 8Z"
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
  )
}