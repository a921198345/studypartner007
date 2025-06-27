import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { CheckCircle } from "lucide-react"

export function LearningTips() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">学习建议</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          <li className="flex items-start">
            <div className="rounded-full bg-primary/10 p-1 mr-2 mt-0.5">
              <CheckCircle className="h-3 w-3 text-primary" />
            </div>
            <span className="text-sm">每天保持固定的学习时间，养成良好的学习习惯</span>
          </li>
          <li className="flex items-start">
            <div className="rounded-full bg-primary/10 p-1 mr-2 mt-0.5">
              <CheckCircle className="h-3 w-3 text-primary" />
            </div>
            <span className="text-sm">学习后及时做题巩固，加深记忆</span>
          </li>
          <li className="flex items-start">
            <div className="rounded-full bg-primary/10 p-1 mr-2 mt-0.5">
              <CheckCircle className="h-3 w-3 text-primary" />
            </div>
            <span className="text-sm">利用知识导图构建知识体系，理清知识点之间的关系</span>
          </li>
          <li className="flex items-start">
            <div className="rounded-full bg-primary/10 p-1 mr-2 mt-0.5">
              <CheckCircle className="h-3 w-3 text-primary" />
            </div>
            <span className="text-sm">遇到不理解的问题，及时使用AI问答功能解决疑惑</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}
