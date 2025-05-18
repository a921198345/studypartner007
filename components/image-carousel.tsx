"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const images = [
  {
    src: "/placeholder.svg?height=400&width=600",
    alt: "法考知识导图",
    title: "结构化知识导图",
    description: "可视化法律知识体系，加深理解记忆",
  },
  {
    src: "/placeholder.svg?height=400&width=600",
    alt: "AI问答系统",
    title: "智能AI问答",
    description: "实时解答法考疑难问题",
  },
  {
    src: "/placeholder.svg?height=400&width=600",
    alt: "真题练习",
    title: "历年真题库",
    description: "在线练习与专业解析",
  },
]

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }
  },
}

export function ImageCarousel() {
  const [[page, direction], setPage] = useState([0, 0])

  const imageIndex = Math.abs(page % images.length)

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection])
  }

  useEffect(() => {
    const interval = setInterval(() => {
      paginate(1)
    }, 5000)

    return () => clearInterval(interval)
  }, [page])

  return (
    <div className="relative bg-card rounded-2xl border shadow-2xl overflow-hidden">
      <div className="absolute top-4 right-4 z-10 flex space-x-1">
        {images.map((_, index) => (
          <div key={index} className={`w-2 h-2 rounded-full ${index === imageIndex ? "bg-primary" : "bg-gray-300"}`} />
        ))}
      </div>

      <div className="relative h-[500px] w-full overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute w-full h-full"
          >
            <div className="relative h-full w-full">
              <img
                src={images[imageIndex].src || "/placeholder.svg"}
                alt={images[imageIndex].alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
                <h3 className="text-2xl font-bold text-white mb-2">{images[imageIndex].title}</h3>
                <p className="text-white/80">{images[imageIndex].description}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full z-10"
        onClick={() => paginate(-1)}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full z-10"
        onClick={() => paginate(1)}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  )
}
