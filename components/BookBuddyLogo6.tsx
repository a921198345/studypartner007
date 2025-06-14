"use client"

interface BookBuddyLogo6Props {
  className?: string
  size?: number
}

export function BookBuddyLogo6({ className = "", size = 32 }: BookBuddyLogo6Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 立体书本效果 */}
      <path
        d="M10 14V34L24 38L38 34V14L24 10L10 14Z"
        fill="currentColor"
        opacity="0.1"
      />
      
      {/* 书本边框 */}
      <path
        d="M10 14L24 10L38 14M10 14V34L24 38L38 34V14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      
      {/* 中心分割线 */}
      <line
        x1="24"
        y1="10"
        x2="24"
        y2="38"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* 左侧人物 - 极简设计 */}
      <path
        d="M17 20C18.1046 20 19 19.1046 19 18C19 16.8954 18.1046 16 17 16C15.8954 16 15 16.8954 15 18C15 19.1046 15.8954 20 17 20Z"
        fill="currentColor"
      />
      <path
        d="M17 22L17 28M15 24H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* 右侧人物 - 极简设计 */}
      <path
        d="M31 20C32.1046 20 33 19.1046 33 18C33 16.8954 32.1046 16 31 16C29.8954 16 29 16.8954 29 18C29 19.1046 29.8954 20 31 20Z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M31 22L31 28M29 24H33"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      
      {/* 连接元素 */}
      <circle cx="24" cy="26" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  )
}