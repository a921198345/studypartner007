import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { BookOpen, Lock } from "lucide-react"
import Link from "next/link"

interface KnowledgeNode {
  id: string
  name: string
  children?: KnowledgeNode[]
  content?: string
}

interface KnowledgePointDetailProps {
  node: KnowledgeNode | null
  isMember?: boolean
}

export function KnowledgePointDetail({ node, isMember = false }: KnowledgePointDetailProps) {
  // 模拟相关题目数据
  const relatedQuestions = node
    ? [
        { id: 101, year: 2023, type: "单选题", title: `关于${node.name}的说法，正确的是：` },
        { id: 203, year: 2022, type: "多选题", title: `下列关于${node.name}的表述中，正确的有：` },
      ]
    : []

  // 检查是否可以访问相关题目
  const canAccessQuestions = isMember || (node?.id.startsWith("node1") && !node?.id.includes("node2"))

  if (!node) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center text-gray-500">
          <p>请在左侧选择一个知识点查看详情</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{node.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {node.content ? (
          <div className="text-sm text-gray-700">{node.content}</div>
        ) : (
          <div className="text-sm text-gray-500 italic">该知识点暂无详细内容</div>
        )}

        {relatedQuestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <BookOpen className="h-4 w-4 mr-1 text-primary" />
              相关真题
            </h4>
            <div className="space-y-2">
              {relatedQuestions.map((question) => (
                <div key={question.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="mr-1">
                      {question.year}
                    </Badge>
                    <Badge variant="secondary">{question.type}</Badge>
                  </div>
                  <p className="line-clamp-2">{question.title}</p>
                  <div className="flex justify-end mt-1">
                    {canAccessQuestions ? (
                      <Link href={`/question-bank/${question.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          查看题目
                        </Button>
                      </Link>
                    ) : (
                      <Badge variant="outline">
                        <Lock className="h-3 w-3 mr-1" />
                        会员专享
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" size="sm">
            添加笔记
          </Button>
          <Button size="sm" className="primary-button">
            AI详解
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
