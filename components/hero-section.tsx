"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import { Brain } from "lucide-react"

export function HeroSection() {
  return (
    <div className="relative overflow-hidden py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <div className="flex flex-col justify-center">
            <motion.h1
              className="text-5xl font-bold tracking-tight text-black mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              让法考学习
              <br />
              <span className="accent-text">更加高效</span>
            </motion.h1>
            <motion.p
              className="mt-4 text-lg leading-7 text-gray-600 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              基于最新法考知识库的AI智能问答，结构化知识导图，历年真题库在线练习， 量身定制学习计划，助力你早日上岸！
            </motion.p>
            <motion.div
              className="flex items-center gap-x-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link href="/register">
                <Button className="primary-button">立即开始</Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" className="outline-button">
                  了解更多
                </Button>
              </Link>
            </motion.div>
          </div>
          <motion.div
            className="flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="relative bg-white rounded-lg p-6 card-shadow w-full max-w-md">
              <h2 className="text-xl font-bold mb-2">法考学习助手</h2>
              <p className="text-gray-600 mb-6">实时学习分析与智能辅导</p>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>今日学习进度</span>
                    <span className="font-medium">65%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-value" style={{ width: "65%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>知识点掌握</span>
                    <span className="font-medium">78%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-value" style={{ width: "78%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>模拟考试正确率</span>
                    <span className="font-medium">82%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-value" style={{ width: "82%" }}></div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-[#E9B949]/20 flex items-center justify-center mr-3">
                    <Brain className="h-5 w-5 text-[#E9B949]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">AI助手已就绪</p>
                    <p className="text-xs text-gray-500">随时解答你的问题</p>
                  </div>
                </div>
                <Button className="primary-button">开始对话</Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
