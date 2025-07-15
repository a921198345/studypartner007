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
      {/* 知识网络 - 分子结构象征知识点互联 */}
      {/* 顶部节点 */}
      <circle cx="24" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      
      {/* 左侧节点 */}
      <circle cx="12" cy="24" r="3" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      
      {/* 右侧节点 */}
      <circle cx="36" cy="24" r="3" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      
      {/* 底部节点 */}
      <circle cx="24" cy="38" r="3" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      
      {/* 连接线 - 形成菱形网络结构 */}
      <line x1="24" y1="13" x2="15" y2="21" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="13" x2="33" y2="21" stroke="currentColor" strokeWidth="2"/>
      <line x1="15" y1="27" x2="24" y2="35" stroke="currentColor" strokeWidth="2"/>
      <line x1="33" y1="27" x2="24" y2="35" stroke="currentColor" strokeWidth="2"/>
      <line x1="15" y1="24" x2="33" y2="24" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}