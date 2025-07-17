"use client"

import React from "react"

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
      suppressHydrationWarning={true}
    >
      <circle cx="24" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="12" cy="24" r="3" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="36" cy="24" r="3" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="24" cy="38" r="3" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <line x1="24" y1="13" x2="15" y2="21" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="13" x2="33" y2="21" stroke="currentColor" strokeWidth="2"/>
      <line x1="15" y1="27" x2="24" y2="35" stroke="currentColor" strokeWidth="2"/>
      <line x1="33" y1="27" x2="24" y2="35" stroke="currentColor" strokeWidth="2"/>
      <line x1="15" y1="24" x2="33" y2="24" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}