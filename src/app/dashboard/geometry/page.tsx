'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GeometryCanvas } from '@/lib/geometry/Canvas'
import { 
  CanvasState, 
  Shape, 
  ToolType, 
  toolConfigs, 
  shapeTemplates, 
  mathUtils,
  colorPalette,
  ShapeTemplate
} from '@/lib/geometry/shapes'
import {
  MousePointer2,
  Circle,
  Triangle,
  Square,
  Minus,
  Maximize2,
  Grid3X3,
  Magnet,
  Type,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Trash2,
  Palette,
  Download,
  Upload,
  HelpCircle,
} from 'lucide-react'

// 工具图标映射
const toolIcons: Record<ToolType, React.ReactNode> = {
  select: <MousePointer2 className="h-5 w-5" />,
  point: <Circle className="h-5 w-5" />,
  line: <Minus className="h-5 w-5" />,
  segment: <Minus className="h-5 w-5" />,
  ray: <Maximize2 className="h-5 w-5" />,
  circle: <Circle className="h-5 w-5" />,
  polygon: <Square className="h-5 w-5" />,
  angle: <Triangle className="h-5 w-5" />,
  measure: <Maximize2 className="h-5 w-5" />,
  text: <Type className="h-5 w-5" />,
}

export default function GeometryPage() {
  const [currentTool, setCurrentTool] = useState<ToolType>('select')
  const [canvasState, setCanvasState] = useState<CanvasState>({
    shapes: [],
    selectedId: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    gridEnabled: true,
    snapEnabled: false,
    showLabels: true,
  })
  const [selectedColor, setSelectedColor] = useState(colorPalette[0].value)
  const [showTemplates, setShowTemplates] = useState(false)
  const [measurement, setMeasurement] = useState<string | null>(null)

  // 添加图形
  const addShape = useCallback((shape: Shape) => {
    setCanvasState(prev => ({
      ...prev,
      shapes: [...prev.shapes, shape],
      selectedId: shape.id,
    }))
  }, [])

  // 添加预设模板
  const addTemplate = (template: ShapeTemplate) => {
    const newShapes = template.shapes.map(shape => ({
      ...shape,
      id: `${shape.id}_${Date.now()}`,
    }))
    setCanvasState(prev => ({
      ...prev,
      shapes: [...prev.shapes, ...newShapes],
    }))
    setShowTemplates(false)
  }

  // 清空画布
  const clearCanvas = () => {
    setCanvasState(prev => ({
      ...prev,
      shapes: [],
      selectedId: null,
    }))
    setMeasurement(null)
  }

  // 删除选中图形
  const deleteSelected = () => {
    if (!canvasState.selectedId) return
    setCanvasState(prev => ({
      ...prev,
      shapes: prev.shapes.filter(s => s.id !== prev.selectedId),
      selectedId: null,
    }))
  }

  // 测量功能
  const measureSelected = () => {
    if (!canvasState.selectedId) {
      setMeasurement(null)
      return
    }

    const shape = canvasState.shapes.find(s => s.id === canvasState.selectedId)
    if (!shape) return

    if (shape.type === 'segment') {
      const dist = mathUtils.distance(shape.start, shape.end)
      setMeasurement(`线段长度: ${dist.toFixed(2)} 单位`)
    } else if (shape.type === 'circle') {
      const circumference = 2 * Math.PI * shape.radius
      const area = Math.PI * Math.pow(shape.radius, 2)
      setMeasurement(`半径: ${shape.radius.toFixed(2)} | 周长: ${circumference.toFixed(2)} | 面积: ${area.toFixed(2)}`)
    }
  }

  // 导出为图片
  const exportImage = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `geometry_${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">几何画板</h1>
        <p className="text-muted-foreground mt-2">绘制几何图形，辅助数学学习</p>
      </div>

      <div className="flex gap-6">
        {/* 左侧工具栏 */}
        <Card className="w-64 shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">工具栏</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 基本工具 */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">选择与绘图</div>
              <div className="grid grid-cols-2 gap-1">
                {toolConfigs.slice(0, 5).map(tool => (
                  <Button
                    key={tool.type}
                    variant={currentTool === tool.type ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setCurrentTool(tool.type)}
                    title={`${tool.name} (${tool.shortcut})`}
                  >
                    {toolIcons[tool.type]}
                  </Button>
                ))}
              </div>
            </div>

            {/* 高级工具 */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">高级工具</div>
              <div className="grid grid-cols-2 gap-1">
                {toolConfigs.slice(5).map(tool => (
                  <Button
                    key={tool.type}
                    variant={currentTool === tool.type ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setCurrentTool(tool.type)}
                    title={`${tool.name} (${tool.shortcut})`}
                  >
                    {toolIcons[tool.type]}
                  </Button>
                ))}
              </div>
            </div>

            {/* 视图控制 */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">视图</div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setCanvasState(p => ({ ...p, zoom: Math.max(0.5, p.zoom - 0.1) }))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm flex-1 text-center">{Math.round(canvasState.zoom * 100)}%</span>
                <Button variant="outline" size="icon" onClick={() => setCanvasState(p => ({ ...p, zoom: Math.min(2, p.zoom + 0.1) }))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant={canvasState.gridEnabled ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setCanvasState(p => ({ ...p, gridEnabled: !p.gridEnabled }))}
                >
                  <Grid3X3 className="h-3 w-3 mr-1" />
                  网格
                </Button>
                <Button
                  variant={canvasState.showLabels ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setCanvasState(p => ({ ...p, showLabels: !p.showLabels }))}
                >
                  <Type className="h-3 w-3 mr-1" />
                  标签
                </Button>
              </div>
            </div>

            {/* 操作 */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">操作</div>
              <div className="space-y-1">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={measureSelected}>
                  <Maximize2 className="h-3 w-3 mr-2" />
                  测量选中
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={deleteSelected} disabled={!canvasState.selectedId}>
                  <Trash2 className="h-3 w-3 mr-2" />
                  删除选中
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={clearCanvas}>
                  <RotateCcw className="h-3 w-3 mr-2" />
                  清空画布
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 中间画布区域 */}
        <div className="flex-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>画布</CardTitle>
                  <CardDescription>
                    当前工具: {toolConfigs.find(t => t.type === currentTool)?.name} | 
                    图形数量: {canvasState.shapes.length}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
                    <Upload className="h-3 w-3 mr-1" />
                    预设模板
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportImage}>
                    <Download className="h-3 w-3 mr-1" />
                    导出图片
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 预设模板弹窗 */}
              {showTemplates && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-3 gap-3">
                    {shapeTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => addTemplate(template)}
                        className="p-3 bg-background rounded-lg border hover:border-primary transition-colors text-left"
                      >
                        <div className="text-2xl mb-1">{template.icon}</div>
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 画布 */}
              <div className="flex justify-center">
                <GeometryCanvas
                  state={canvasState}
                  onStateChange={setCanvasState}
                  width={700}
                  height={450}
                />
              </div>

              {/* 测量结果 */}
              {measurement && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="font-medium text-blue-800">测量结果: </span>
                  <span className="text-blue-700">{measurement}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 使用说明 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                使用说明
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 点击预设模板快速创建常见几何图形</li>
                <li>• 选中图形后可拖动调整位置</li>
                <li>• 使用测量工具可计算线段长度、圆的周长和面积</li>
                <li>• 点击网格按钮可显示/隐藏辅助网格</li>
                <li>• 点击标签按钮可显示/隐藏图形标签</li>
                <li>• 导出图片后可保存或打印</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* 右侧颜色面板 */}
        <Card className="w-48 shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5" />
              颜色
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {colorPalette.map(color => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    selectedColor === color.value ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
