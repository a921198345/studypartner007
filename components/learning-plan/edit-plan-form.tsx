"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Trash2 } from "lucide-react"

interface Task {
  id: string
  title: string
  description: string
  duration: number // 分钟
  progress: number // 百分比
  subject: string
}

interface EditPlanFormProps {
  task?: Task
  onSave: (task: Task) => void
  onDelete?: () => void
  onCancel: () => void
}

export function EditPlanForm({ task, onSave, onDelete, onCancel }: EditPlanFormProps) {
  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [duration, setDuration] = useState(task?.duration ? task.duration / 60 : 1) // 转换为小时
  const [progress, setProgress] = useState(task?.progress || 0)
  const [subject, setSubject] = useState(task?.subject || "民法")

  // 学科列表
  const subjects = [
    "民法",
    "刑法",
    "民事诉讼法",
    "刑事诉讼法",
    "商法与经济法",
    "理论法学",
    "行政法与行政诉讼法",
    "三国法",
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: task?.id || "",
      title,
      description,
      duration: duration * 60, // 转换为分钟
      progress,
      subject,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">任务标题</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：民法总则"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">学科</Label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger>
            <SelectValue placeholder="选择学科" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">学习内容</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如：第三章 民事法律行为&#10;第一节 一般规定&#10;第二节 意思表示"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="duration">学习时长（小时）</Label>
          <span className="text-sm">{duration}小时</span>
        </div>
        <Slider
          id="duration"
          value={[duration]}
          min={0.5}
          max={4}
          step={0.5}
          onValueChange={(value) => setDuration(value[0])}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0.5小时</span>
          <span>4小时</span>
        </div>
      </div>

      {task && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="progress">当前进度</Label>
            <span className="text-sm">{progress}%</span>
          </div>
          <Slider
            id="progress"
            value={[progress]}
            min={0}
            max={100}
            step={5}
            onValueChange={(value) => setProgress(value[0])}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <div>
          {onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> 删除
            </Button>
          )}
        </div>
        <div className="space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit">保存</Button>
        </div>
      </div>
    </form>
  )
}
