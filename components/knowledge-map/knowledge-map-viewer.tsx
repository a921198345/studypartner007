"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lock, Brain } from "lucide-react"
import { MapControls } from "./map-controls"
import { KnowledgePointDetail } from "./knowledge-point-detail"

interface KnowledgeNode {
  id: string
  name: string
  children?: KnowledgeNode[]
  content?: string
}

interface KnowledgeMapViewerProps {
  subject: string
  initialNode?: string
  isMember?: boolean
}

export function KnowledgeMapViewer({ subject, initialNode, isMember = false }: KnowledgeMapViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const mapRef = useRef<HTMLDivElement>(null)

  // 检查是否可以访问该学科
  const canAccess = isMember || subject === "民法"

  // 模拟知识点数据
  const dummyData: KnowledgeNode = {
    id: "root",
    name: subject,
    children: [
      {
        id: "node1",
        name: "民法总则",
        children: [
          {
            id: "node1-1",
            name: "民事法律行为",
            children: [
              {
                id: "node1-1-1",
                name: "有效要件",
                content:
                  "根据《民法典》第一百四十三条，具备以下条件的民事法律行为有效：一是行为人具有相应的民事行为能力；二是意思表示真实；三是不违反法律、行政法规的强制性规定，不违背公序良俗。",
              },
              {
                id: "node1-1-2",
                name: "无效与可撤销",
                content:
                  "无效民事法律行为自始没有法律约束力。可撤销民事法律行为是指行为人基于欺诈、胁迫等原因实施的民事法律行为，受欺诈、胁迫的一方有权请求人民法院或者仲裁机构予以撤销。",
              },
            ],
          },
          {
            id: "node1-2",
            name: "民事责任",
            content: "民事责任是指民事主体违反民事义务依法应当承担的不利后果。",
          },
        ],
      },
      {
        id: "node2",
        name: "物权法",
        children: [
          {
            id: "node2-1",
            name: "物权的种类",
            content: "物权包括所有权、用益物权和担保物权。",
          },
        ],
      },
    ],
  }

  // 模拟加载知识点数据
  useEffect(() => {
    // 如果有初始节点，则展开到该节点
    if (initialNode) {
      // 这里应该有一个递归查找节点的函数
      // 并设置expandedNodes包含从根节点到目标节点的路径

      // 模拟找到节点
      if (initialNode === "node1-1-1") {
        setExpandedNodes(new Set(["node1", "node1-1", "node1-1-1"]))
        setSelectedNode({
          id: "node1-1-1",
          name: "有效要件",
          content:
            "根据《民法典》第一百四十三条，具备以下条件的民事法律行为有效：一是行为人具有相应的民事行为能力；二是意思表示真实；三是不违反法律、行政法规的强制性规定，不违背公序良俗。",
        })
      }
    } else {
      // 默认展开到第二级（共三层）
      setExpandedNodes(new Set(["node1"]))
    }
  }, [initialNode])

  const handleNodeClick = (node: KnowledgeNode) => {
    // 如果节点已展开，则折叠
    if (expandedNodes.has(node.id)) {
      const newExpandedNodes = new Set(expandedNodes)
      newExpandedNodes.delete(node.id)
      setExpandedNodes(newExpandedNodes)
    } else {
      // 否则展开节点
      setExpandedNodes(new Set([...expandedNodes, node.id]))
    }

    // 设置选中节点
    setSelectedNode(node)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5))
  }

  // 递归渲染节点
  const renderNode = (node: KnowledgeNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNode?.id === node.id

    return (
      <div key={node.id} className="ml-6">
        <div
          className={`
            p-2 rounded-lg cursor-pointer transition-all
            ${isSelected ? "bg-primary/10 border border-primary" : "hover:bg-gray-100"}
          `}
          onClick={() => handleNodeClick(node)}
        >
          <div className="flex items-center">
            {node.children && node.children.length > 0 && (
              <span className="mr-2 text-xs">{isExpanded ? "▼" : "►"}</span>
            )}
            <span>{node.name}</span>
          </div>
        </div>

        {isExpanded && node.children && (
          <div className="mt-1">{node.children.map((child) => renderNode(child, level + 1))}</div>
        )}
      </div>
    )
  }

  if (!canAccess) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <CardContent className="text-center p-6">
          <Lock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">会员专享内容</h3>
          <p className="text-gray-500 mb-6">免费用户仅可查看"民法"学科的知识导图</p>
          <Button>升级会员</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="bg-white rounded-lg p-4 card-shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <Brain className="mr-2 h-5 w-5 text-[#E9B949]" />
          {subject}知识导图
        </h2>
        <Badge className="badge-outline">共 156 个知识点</Badge>
      </div>

      <div className="flex gap-4">
        <div className="w-2/3">
          <div className="bg-gray-50 rounded-lg border p-4 min-h-[600px] relative grid-background overflow-auto">
            <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} zoom={zoom} />

            <div
              ref={mapRef}
              className="transition-transform"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              {renderNode(dummyData)}
            </div>
          </div>
        </div>

        <div className="w-1/3">
          <KnowledgePointDetail node={selectedNode} isMember={isMember} />
        </div>
      </div>
    </div>
  )
}
