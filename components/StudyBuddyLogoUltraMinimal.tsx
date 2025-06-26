"use client"

interface StudyBuddyLogoUltraMinimalProps {
  className?: string
  size?: number
}

export function StudyBuddyLogoUltraMinimal({ className = "", size = 32 }: StudyBuddyLogoUltraMinimalProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 左边的方形（代表第一个人） */}
      <rect
        x="10"
        y="14"
        width="14"
        height="20"
        rx="2"
        fill="currentColor"
      />
      
      {/* 右边的方形（代表第二个人） */}
      <rect
        x="24"
        y="14"
        width="14"
        height="20"
        rx="2"
        fill="currentColor"
        opacity="0.7"
      />
      
      {/* 连接线（代表合作关系） */}
      <rect
        x="20"
        y="22"
        width="8"
        height="4"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  )
}