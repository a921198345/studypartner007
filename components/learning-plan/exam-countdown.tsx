import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ExamCountdownProps {
  examName: string
  daysLeft: number
}

export function ExamCountdown({ examName, daysLeft }: ExamCountdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">距离考试</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-medium mb-2">{examName}</h3>
          <div className="text-3xl font-bold text-primary mb-2">{daysLeft}</div>
          <p className="text-sm text-gray-500">天</p>
        </div>
      </CardContent>
    </Card>
  )
}
