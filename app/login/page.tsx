"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MainNav } from "@/components/main-nav"
import { Footer } from "@/components/footer"
import { PhoneLogin } from "@/components/auth/phone-login"
import { WechatLogin } from "@/components/auth/wechat-login"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container mx-auto flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center py-12 grid-background">
        <div className="w-full max-w-md mx-auto">
          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="phone">手机号登录</TabsTrigger>
              <TabsTrigger value="wechat">微信登录</TabsTrigger>
            </TabsList>
            <TabsContent value="phone">
              <PhoneLogin redirectUrl="/learning-plan" />
            </TabsContent>
            <TabsContent value="wechat">
              <WechatLogin redirectUrl="/learning-plan" />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
