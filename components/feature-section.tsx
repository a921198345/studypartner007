"use client"

import { Card, CardContent } from "../ui/card"
import { Brain, BookOpen, MessageCircle, Calendar, FileText, Zap } from "lucide-react"
import { motion } from "framer-motion"

export function FeatureSection() {
  const features = [
    {
      icon: <MessageCircle className="h-10 w-10 text-[#E9B949]" />,
      title: "智能问答",
      description: "基于最新法考知识库（2025年）的AI实时问答，解答你的法考疑惑。",
    },
    {
      icon: <Brain className="h-10 w-10 text-[#E9B949]" />,
      title: "结构化学习",
      description: "分科目、可交互的法考知识导图，帮助构建完整知识体系。",
    },
    {
      icon: <BookOpen className="h-10 w-10 text-[#E9B949]" />,
      title: "实战演练",
      description: "历年真题库在线作答与专业解析，巩固知识点。",
    },
    {
      icon: <Zap className="h-10 w-10 text-[#E9B949]" />,
      title: "智能联动",
      description: "知识导图与AI问答、真题练习的实时智能关联，加深理解。",
    },
    {
      icon: <Calendar className="h-10 w-10 text-[#E9B949]" />,
      title: "个性规划",
      description: "量身定制的学习计划与AI督学动态跟进，提高学习效率。",
    },
    {
      icon: <FileText className="h-10 w-10 text-[#E9B949]" />,
      title: "便捷记录",
      description: "支持图文的在线学习笔记，随时记录学习心得。",
    },
  ]

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">核心功能</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">我们提供全方位的法考备考支持，助力你高效学习</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="feature-card h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#E9B949]/10 flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
