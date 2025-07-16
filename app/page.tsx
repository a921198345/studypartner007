"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, Brain, MessageCircle, FileText, Calendar, Zap } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { DelayedAuthGuard } from "@/components/auth/delayed-auth-guard"
import { ClientOnly } from "@/components/client-only"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex-1">
            <MainNav />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          </div>
        
          <div className="container relative">
            <div className="max-w-4xl mx-auto text-center">
              <ClientOnly fallback={
                <div className="space-y-12">
                  <div className="space-y-8">
                    <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl">
                      让法考学习{" "}
                      <span className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
                        更加高效
                      </span>
                    </h1>
                    <p className="text-xl leading-relaxed text-muted-foreground max-w-3xl mx-auto">
                      基于最新法考知识库的AI智能问答，结构化知识导图，历年真题库在线练习，
                      量身定制学习计划，助力你早日上岸！
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-6 justify-center">
                    <Button 
                      size="lg" 
                      className="gap-2 text-base px-8 py-6"
                      disabled
                    >
                      立即开始 <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 max-w-2xl mx-auto">
                    <div className="space-y-2">
                      <h4 className="text-4xl font-bold text-primary">100%</h4>
                      <p className="text-sm text-muted-foreground">知识点覆盖率</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-4xl font-bold text-primary">24/7</h4>
                      <p className="text-sm text-muted-foreground">全天候AI辅导</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-4xl font-bold text-primary">10万+</h4>
                      <p className="text-sm text-muted-foreground">用户选择</p>
                    </div>
                  </div>
                </div>
              }>
                <motion.div
                  className="space-y-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="space-y-8">
                    <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl">
                      让法考学习{" "}
                      <motion.span
                        className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                      >
                        更加高效
                      </motion.span>
                    </h1>
                    <p className="text-xl leading-relaxed text-muted-foreground max-w-3xl mx-auto">
                      基于最新法考知识库的AI智能问答，结构化知识导图，历年真题库在线练习，
                      量身定制学习计划，助力你早日上岸！
                    </p>
                  </div>
                  <motion.div
                    className="flex flex-wrap gap-6 justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <DelayedAuthGuard
                      authTitle="开始法考学习"
                      authMessage="请先登录以开始您的个性化学习计划"
                    >
                      {({ requireAuth }) => (
                        <Button 
                          size="lg" 
                          className="gap-2 text-base px-8 py-6"
                          onClick={() => requireAuth(() => router.push('/learning-plan'))}
                        >
                          立即开始 <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </DelayedAuthGuard>
                  </motion.div>
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                  >
                    <div className="space-y-2">
                      <h4 className="text-4xl font-bold text-primary">100%</h4>
                      <p className="text-sm text-muted-foreground">知识点覆盖率</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-4xl font-bold text-primary">24/7</h4>
                      <p className="text-sm text-muted-foreground">全天候AI辅导</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-4xl font-bold text-primary">10万+</h4>
                      <p className="text-sm text-muted-foreground">用户选择</p>
                    </div>
                  </motion.div>
                </motion.div>
              </ClientOnly>
            </div>
          </div>
        </section>

        <section id="features" className="py-32 bg-gradient-to-b from-background to-muted/30">
          <div className="container space-y-20">
            <ClientOnly fallback={
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                  核心功能
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  专业、高效、全面的法考学习解决方案
                </p>
              </div>
            }>
              <motion.div
                className="text-center space-y-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                  核心功能
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  专业、高效、全面的法考学习解决方案
                </p>
              </motion.div>
            </ClientOnly>
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <MessageCircle className="h-12 w-12 text-primary" />,
                  title: "智能问答",
                  description: "基于最新法考知识库（2025年）的AI实时问答，解答你的法考疑惑。",
                  color: "from-blue-500/10 to-blue-600/10",
                },
                {
                  icon: <Brain className="h-12 w-12 text-primary" />,
                  title: "结构化学习",
                  description: "分科目、可交互的法考知识导图，帮助构建完整知识体系。",
                  color: "from-purple-500/10 to-purple-600/10",
                },
                {
                  icon: <BookOpen className="h-12 w-12 text-primary" />,
                  title: "实战演练",
                  description: "历年真题库在线作答与专业解析，巩固知识点。",
                  color: "from-emerald-500/10 to-emerald-600/10",
                },
                {
                  icon: <Zap className="h-12 w-12 text-primary" />,
                  title: "智能联动",
                  description: "知识导图与AI问答、真题练习的实时智能关联，加深理解。",
                  color: "from-orange-500/10 to-orange-600/10",
                },
                {
                  icon: <Calendar className="h-12 w-12 text-primary" />,
                  title: "个性规划",
                  description: "量身定制的学习计划与AI督学动态跟进，提高学习效率。",
                  color: "from-pink-500/10 to-pink-600/10",
                },
                {
                  icon: <FileText className="h-12 w-12 text-primary" />,
                  title: "便捷记录",
                  description: "支持图文的在线学习笔记，随时记录学习心得。",
                  color: "from-indigo-500/10 to-indigo-600/10",
                },
              ].map((feature, index) => (
                <ClientOnly key={index} fallback={
                  <Card className="h-full border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-background to-muted/30">
                    <CardContent className="p-8 space-y-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                        {feature.icon}
                      </div>
                      <h3 className="text-2xl font-bold">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                }>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="h-full border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-background to-muted/30 group">
                      <CardContent className="p-8 space-y-6">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:shadow-lg`}
                        >
                          {feature.icon}
                        </motion.div>
                        <h3 className="text-2xl font-bold">{feature.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </ClientOnly>
              ))}
            </div>
          </div>
        </section>
    </main>
      <Footer />
    </div>
  )
} 