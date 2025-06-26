"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SubjectSelectorProps {
  selectedSubject: string
  onSubjectChange: (subject: string) => void
}

export function SubjectSelector({ selectedSubject, onSubjectChange }: SubjectSelectorProps) {
  const subjects = [
    "刑法",
    "民法",
    "刑事诉讼法",
    "民事诉讼法",
    "行政法与行政诉讼法",
    "商经知",
    "三国法",
    "理论法",
  ]

  return (
    <Select value={selectedSubject} onValueChange={onSubjectChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="选择科目" />
      </SelectTrigger>
      <SelectContent>
        {subjects.map((subject) => (
          <SelectItem key={subject} value={subject}>
            {subject}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
