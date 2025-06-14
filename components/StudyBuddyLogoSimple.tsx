"use client"

interface StudyBuddyLogoSimpleProps {
  className?: string
  size?: number
}

export function StudyBuddyLogoSimple({ className = "", size = 32 }: StudyBuddyLogoSimpleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 打开的书本 */}
      <path
        d="M24 38C24 38 8 34 8 24V12C8 12 16 8 24 12C32 8 40 12 40 12V24C40 34 24 38 24 38Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* 书脊 */}
      <line
        x1="24"
        y1="12"
        x2="24"
        y2="38"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      
      {/* 两个简化的人形，代表学习伙伴 */}
      <circle cx="17" cy="20" r="3" fill="currentColor" />
      <path d="M14 28C14 26 15.5 24 17 24C18.5 24 20 26 20 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      
      <circle cx="31" cy="20" r="3" fill="currentColor" />
      <path d="M28 28C28 26 29.5 24 31 24C32.5 24 34 26 34 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}