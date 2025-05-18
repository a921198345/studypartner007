"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function AiCharacters() {
  const characters = [
    {
      name: "萌萌",
      type: "萝莉",
      gender: "女",
      image: "/placeholder.svg?height=300&width=300",
      description: "活泼可爱的萝莉形象，用简单易懂的语言解释复杂法律概念",
    },
    {
      name: "静静",
      type: "御姐",
      gender: "女",
      image: "/placeholder.svg?height=300&width=300",
      description: "成熟稳重的御姐形象，专业严谨的法律解析",
    },
    {
      name: "小雨",
      type: "温柔可爱少女",
      gender: "女",
      image: "/placeholder.svg?height=300&width=300",
      description: "温柔体贴的少女形象，耐心细致的学习指导",
    },
    {
      name: "阳阳",
      type: "活泼可爱少女",
      gender: "女",
      image: "/placeholder.svg?height=300&width=300",
      description: "活力四射的少女形象，鼓励激励的学习陪伴",
    },
    {
      name: "大叔",
      type: "大叔",
      gender: "男",
      image: "/placeholder.svg?height=300&width=300",
      description: "经验丰富的大叔形象，深入浅出的法律讲解",
    },
    {
      name: "阳光",
      type: "阳光少年",
      gender: "男",
      image: "/placeholder.svg?height=300&width=300",
      description: "朝气蓬勃的少年形象，积极向上的学习伙伴",
    },
    {
      name: "冷峰",
      type: "冷酷系",
      gender: "男",
      image: "/placeholder.svg?height=300&width=300",
      description: "冷静理性的形象，精准简洁的法律分析",
    },
    {
      name: "王子",
      type: "王子系",
      gender: "男",
      image: "/placeholder.svg?height=300&width=300",
      description: "优雅绅士的王子形象，温文尔雅的学习指导",
    },
  ]

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">选择你的AI学习搭子</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">多种AI角色个性，为你提供个性化的学习陪伴体验</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {characters.map((character, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
            >
              <Card className="character-card h-full">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={character.image || "/placeholder.svg"}
                    alt={character.name}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">{character.name}</h3>
                    <span className="badge">{character.gender}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{character.type}</p>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{character.description}</p>
                  <Button variant="outline" size="sm" className="w-full outline-button">
                    选择
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
