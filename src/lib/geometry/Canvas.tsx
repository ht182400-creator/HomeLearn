'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Shape, Point, CanvasState, ShapeType, defaultColors, mathUtils } from './shapes'

interface CanvasProps {
  state: CanvasState
  onStateChange: (state: CanvasState) => void
  width?: number
  height?: number
  readOnly?: boolean
}

export const GeometryCanvas: React.FC<CanvasProps> = ({
  state,
  onStateChange,
  width = 600,
  height = 400,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragTarget, setDragTarget] = useState<string | null>(null)
  const [tempPoint, setTempPoint] = useState<Point | null>(null)

  // 绘制
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 绘制背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // 应用缩放和偏移
    ctx.save()
    ctx.translate(state.panX, state.panY)
    ctx.scale(state.zoom, state.zoom)

    // 绘制网格
    if (state.gridEnabled) {
      drawGrid(ctx, width, height, state.zoom)
    }

    // 绘制所有图形
    state.shapes.forEach((shape) => {
      drawShape(ctx, shape)
    })

    // 绘制临时点
    if (tempPoint) {
      drawPoint(ctx, tempPoint)
    }

    // 绘制选中状态
    if (state.selectedId) {
      const selected = state.shapes.find(s => s.id === state.selectedId)
      if (selected) {
        drawSelection(ctx, selected)
      }
    }

    ctx.restore()
  }, [state, width, height, tempPoint])

  // 绘制网格
  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, zoom: number) => {
    const gridSize = 20
    const scaledGridSize = gridSize * zoom

    ctx.strokeStyle = defaultColors.grid
    ctx.lineWidth = 0.5

    // 垂直线
    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    // 水平线
    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // 原点标记
    ctx.fillStyle = '#9ca3af'
    ctx.beginPath()
    ctx.arc(0, 0, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillText('O', 8, 12)
  }

  // 绘制点
  const drawPoint = (ctx: CanvasRenderingContext2D, point: Point) => {
    const size = point.size || 5
    ctx.fillStyle = point.color || defaultColors.point
    ctx.beginPath()
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2)
    ctx.fill()

    // 绘制标签
    if (point.label && state.showLabels) {
      ctx.fillStyle = '#374151'
      ctx.font = '14px Arial'
      ctx.fillText(point.label, point.x + 8, point.y - 8)
    }
  }

  // 绘制线段
  const drawSegment = (ctx: CanvasRenderingContext2D, start: Point, end: Point, 
    color?: string, lineStyle?: string, label?: string) => {
    ctx.strokeStyle = color || defaultColors.stroke
    ctx.lineWidth = 2

    if (lineStyle === 'dashed') {
      ctx.setLineDash([5, 5])
    } else if (lineStyle === 'dotted') {
      ctx.setLineDash([2, 2])
    } else {
      ctx.setLineDash([])
    }

    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    ctx.setLineDash([])

    // 绘制端点
    drawPoint(ctx, start)
    drawPoint(ctx, end)

    // 绘制标签
    if (label && state.showLabels) {
      const midX = (start.x + end.x) / 2
      const midY = (start.y + end.y) / 2
      ctx.fillStyle = color || '#374151'
      ctx.font = '12px Arial'
      ctx.fillText(label, midX + 5, midY - 5)
    }
  }

  // 绘制圆
  const drawCircle = (ctx: CanvasRenderingContext2D, center: Point, radius: number, color?: string) => {
    ctx.strokeStyle = color || defaultColors.stroke
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
    ctx.stroke()

    // 绘制圆心
    drawPoint(ctx, center)
  }

  // 绘制多边形
  const drawPolygon = (ctx: CanvasRenderingContext2D, vertices: Point[], color?: string, filled?: boolean) => {
    if (vertices.length < 3) return

    ctx.strokeStyle = color || defaultColors.stroke
    ctx.lineWidth = 2

    if (filled) {
      ctx.fillStyle = defaultColors.fill
    }

    ctx.beginPath()
    ctx.moveTo(vertices[0].x, vertices[0].y)
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y)
    }
    ctx.closePath()

    if (filled) {
      ctx.fill()
    }
    ctx.stroke()

    // 绘制顶点
    vertices.forEach(v => drawPoint(ctx, v))
  }

  // 绘制图形
  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    switch (shape.type) {
      case 'point':
        drawPoint(ctx, shape)
        break
      case 'line':
      case 'segment':
      case 'ray':
        drawSegment(ctx, shape.start, shape.end, shape.color, shape.lineStyle, shape.label)
        break
      case 'circle':
        drawCircle(ctx, shape.center, shape.radius, shape.color)
        break
      case 'polygon':
        drawPolygon(ctx, shape.vertices, shape.color, shape.filled)
        break
      case 'angle':
        // 简化角度绘制
        drawSegment(ctx, shape.vertex, shape.point1, shape.color)
        drawSegment(ctx, shape.vertex, shape.point2, shape.color)
        drawPoint(ctx, shape.vertex)
        drawPoint(ctx, shape.point1)
        drawPoint(ctx, shape.point2)
        break
    }
  }

  // 绘制选中状态
  const drawSelection = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.strokeStyle = defaultColors.selection
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])

    if (shape.type === 'point') {
      ctx.beginPath()
      ctx.arc(shape.x, shape.y, 8, 0, Math.PI * 2)
      ctx.stroke()
    } else if (shape.type === 'circle') {
      ctx.beginPath()
      ctx.arc(shape.center.x, shape.center.y, shape.radius + 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.setLineDash([])
  }

  // 获取点击位置对应的点
  const getPointAtPosition = (x: number, y: number): Point | null => {
    const adjustedX = (x - state.panX) / state.zoom
    const adjustedY = (y - state.panY) / state.zoom

    for (const shape of state.shapes) {
      if (shape.type === 'point') {
        const dist = Math.sqrt(Math.pow(shape.x - adjustedX, 2) + Math.pow(shape.y - adjustedY, 2))
        if (dist < 10) {
          return shape
        }
      }
    }

    return null
  }

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const point = getPointAtPosition(x, y)

    if (point) {
      setIsDragging(true)
      setDragTarget(point.id)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (isDragging && dragTarget) {
      const adjustedX = (x - state.panX) / state.zoom
      const adjustedY = (y - state.panY) / state.zoom

      const newShapes = state.shapes.map(shape => {
        if (shape.type === 'point' && shape.id === dragTarget) {
          return { ...shape, x: adjustedX, y: adjustedY }
        }
        // 更新相关线段
        if ('start' in shape && shape.start.id === dragTarget) {
          return { ...shape, start: { ...shape.start, x: adjustedX, y: adjustedY } }
        }
        if ('end' in shape && shape.end.id === dragTarget) {
          return { ...shape, end: { ...shape.end, x: adjustedX, y: adjustedY } }
        }
        if ('center' in shape && shape.center.id === dragTarget) {
          return { ...shape, center: { ...shape.center, x: adjustedX, y: adjustedY } }
        }
        return shape
      })

      onStateChange({ ...state, shapes: newShapes })
    } else {
      setTempPoint({ id: 'temp', type: 'point', x, y })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragTarget(null)
    setTempPoint(null)
  }

  // 监听状态变化，重绘
  useEffect(() => {
    draw()
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border rounded-lg cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}

export default GeometryCanvas
