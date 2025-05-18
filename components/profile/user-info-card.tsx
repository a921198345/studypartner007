"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"

interface UserInfoCardProps {
  user: {
    id: string
    name: string
    phone: string
    avatar?: string
    membershipStatus: "free_user" | "active_member"
    membershipExpiry?: Date
  }
  onUpgrade?: () => void
}

export function UserInfoCard({ user, onUpgrade }: UserInfoCardProps) {
  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center text-center">
        <Avatar className="h-24 w-24 mb-4">
          <AvatarImage src={user.avatar || "/placeholder.svg?height=96&width=96"} alt={user.name} />
          <AvatarFallback>{user.name[0]}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold mb-1">{user.name}</h2>
        <p className="text-sm text-gray-500 mb-3">{user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}</p>
        <Badge variant="outline" className="mb-4">
          {user.membershipStatus === "active_member" ? "会员用户" : "免费用户"}
          {user.membershipStatus === "active_member" && user.membershipExpiry && (
            <span className="ml-1">({new Date(user.membershipExpiry).toLocaleDateString()} 到期)</span>
          )}
        </Badge>
        {user.membershipStatus === "free_user" && (
          <Button className="w-full" onClick={onUpgrade}>
            <CreditCard className="h-4 w-4 mr-2" />
            升级会员
          </Button>
        )}
        {user.membershipStatus === "active_member" && (
          <Button className="w-full" onClick={onUpgrade}>
            <CreditCard className="h-4 w-4 mr-2" />
            续费会员
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
