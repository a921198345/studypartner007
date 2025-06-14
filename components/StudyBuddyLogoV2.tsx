"use client"

interface StudyBuddyLogoV2Props {
  className?: string
  size?: number
}

export function StudyBuddyLogoV2({ className = "", size = 32 }: StudyBuddyLogoV2Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
      </defs>
      
      {/* 书本背景 */}
      <path
        d="M8 12C8 10.8954 8.89543 10 10 10H38C39.1046 10 40 10.8954 40 12V36C40 37.1046 39.1046 38 38 38H10C8.89543 38 8 37.1046 8 36V12Z"
        fill="url(#bookGradient)"
        opacity="0.2"
      />
      
      {/* 书脊 */}
      <rect x="23" y="10" width="2" height="28" fill="currentColor" opacity="0.3" />
      
      {/* 左侧小人 - 学生形象 */}
      <circle cx="17" cy="19" r="4" fill="currentColor" opacity="0.9" />
      <path
        d="M17 24C13.5 24 11 26.5 11 30V34H23V30C23 26.5 20.5 24 17 24Z"
        fill="currentColor"
        opacity="0.9"
      />
      
      {/* 右侧小人 - 搭子形象 */}
      <circle cx="31" cy="19" r="4" fill="currentColor" />
      <path
        d="M31 24C27.5 24 25 26.5 25 30V34H37V30C37 26.5 34.5 24 31 24Z"
        fill="currentColor"
      />
      
      {/* 连接的心形 - 表示友谊和互助 */}
      <path
        d="M24 26C24 26 22 24 20 24C18 24 16.5 25.5 16.5 27C16.5 29 19 31 24 33C29 31 31.5 29 31.5 27C31.5 25.5 30 24 28 24C26 24 24 26 24 26Z"
        fill="currentColor"
        opacity="0.4"
      />
      
      {/* 书页线条 */}
      <path
        d="M13 14H21M13 17H19M13 20H20"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M27 14H35M29 17H35M28 20H35"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )
}