import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "../../lib/utils";

export interface MessageBubbleProps {
  sender: 'user' | 'ai';
  text: string;
  timestamp?: string;
  aiName?: string;
  aiAvatar?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  sender,
  text,
  timestamp = new Date().toISOString(),
  aiName = "法考助手",
  aiAvatar = "/placeholder.svg"
}) => {
  return (
    <div className={cn(
      "flex",
      sender === 'user' ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex flex-col max-w-[80%] rounded-lg p-4",
        sender === 'user' 
          ? "bg-primary text-primary-foreground rounded-tr-none" 
          : "bg-muted rounded-tl-none"
      )}>
        {/* AI头像和名称只在AI消息中显示 */}
        {sender === 'ai' && (
          <div className="flex items-center mb-2">
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={aiAvatar} />
              <AvatarFallback>{aiName[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{aiName}</span>
          </div>
        )}
        
        {/* 消息内容 - 支持换行 */}
        <div className="whitespace-pre-wrap break-words">
          {text}
        </div>
        
        {/* 时间戳 */}
        <div className="text-xs mt-2 text-right opacity-70">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble; 