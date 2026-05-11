/**
 * 几何画板工具函数
 */

// 几何元素类型
export type ShapeType = 'point' | 'line' | 'segment' | 'ray' | 'circle' | 'arc' | 'polygon' | 'angle'

// 几何元素接口
export interface Point {
  id: string
  type: 'point'
  x: number
  y: number
  label?: string
  color?: string
  size?: number
}

export interface LineElement {
  id: string
  type: 'line' | 'segment' | 'ray'
  start: Point
  end: Point
  label?: string
  color?: string
  lineStyle?: 'solid' | 'dashed' | 'dotted'
}

export interface CircleElement {
  id: string
  type: 'circle'
  center: Point
  radius: number
  label?: string
  color?: string
}

export interface ArcElement {
  id: string
  type: 'arc'
  center: Point
  startAngle: number
  endAngle: number
  radius: number
  label?: string
  color?: string
}

export interface PolygonElement {
  id: string
  type: 'polygon'
  vertices: Point[]
  label?: string
  color?: string
  filled?: boolean
}

export interface AngleElement {
  id: string
  type: 'angle'
  vertex: Point
  point1: Point
  point2: Point
  label?: string
  color?: string
  measure?: number
}

export type Shape = Point | LineElement | CircleElement | ArcElement | PolygonElement | AngleElement

// 画布状态
export interface CanvasState {
  shapes: Shape[]
  selectedId: string | null
  zoom: number
  panX: number
  panY: number
  gridEnabled: boolean
  snapEnabled: boolean
  showLabels: boolean
}

// 工具类型
export type ToolType = 
  | 'select'      // 选择工具
  | 'point'        // 点工具
  | 'line'         // 直线工具
  | 'segment'      // 线段工具
  | 'ray'          // 射线工具
  | 'circle'       // 圆工具
  | 'polygon'      // 多边形工具
  | 'angle'        // 角度工具
  | 'measure'      // 测量工具
  | 'text'         // 文本工具

// 预设图形模板
export interface ShapeTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: 'basic' | 'triangle' | 'circle' | 'coordinate'
  shapes: Shape[]
}

// 默认颜色
export const defaultColors = {
  stroke: '#374151',
  fill: '#dbeafe',
  grid: '#e5e7eb',
  selection: '#3b82f6',
  point: '#ef4444',
  angle: '#10b981',
}

// 预设颜色
export const colorPalette = [
  { name: '黑色', value: '#374151' },
  { name: '红色', value: '#ef4444' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '绿色', value: '#10b981' },
  { name: '黄色', value: '#f59e0b' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '粉色', value: '#ec4899' },
  { name: '青色', value: '#06b6d4' },
]

// 预设图形模板
export const shapeTemplates: ShapeTemplate[] = [
  {
    id: 'triangle',
    name: '三角形',
    description: '等边三角形',
    icon: '△',
    category: 'triangle',
    shapes: [
      { id: 'A', type: 'point', x: 200, y: 100, label: 'A', color: defaultColors.point },
      { id: 'B', type: 'point', x: 100, y: 300, label: 'B', color: defaultColors.point },
      { id: 'C', type: 'point', x: 300, y: 300, label: 'C', color: defaultColors.point },
      {
        id: 'AB', type: 'segment', 
        start: { id: 'A', type: 'point', x: 200, y: 100, label: 'A' },
        end: { id: 'B', type: 'point', x: 100, y: 300, label: 'B' },
        color: defaultColors.stroke
      },
      {
        id: 'BC', type: 'segment',
        start: { id: 'B', type: 'point', x: 100, y: 300, label: 'B' },
        end: { id: 'C', type: 'point', x: 300, y: 300, label: 'C' },
        color: defaultColors.stroke
      },
      {
        id: 'CA', type: 'segment',
        start: { id: 'C', type: 'point', x: 300, y: 300, label: 'C' },
        end: { id: 'A', type: 'point', x: 200, y: 100, label: 'A' },
        color: defaultColors.stroke
      },
    ],
  },
  {
    id: 'right-triangle',
    name: '直角三角形',
    description: '直角三角形（勾股定理）',
    icon: '▢',
    category: 'triangle',
    shapes: [
      { id: 'O', type: 'point', x: 100, y: 300, label: 'O', color: defaultColors.point },
      { id: 'A', type: 'point', x: 300, y: 300, label: 'A', color: defaultColors.point },
      { id: 'B', type: 'point', x: 100, y: 100, label: 'B', color: defaultColors.point },
      {
        id: 'OA', type: 'segment',
        start: { id: 'O', type: 'point', x: 100, y: 300, label: 'O' },
        end: { id: 'A', type: 'point', x: 300, y: 300, label: 'A' },
        color: defaultColors.stroke
      },
      {
        id: 'OB', type: 'segment',
        start: { id: 'O', type: 'point', x: 100, y: 300, label: 'O' },
        end: { id: 'B', type: 'point', x: 100, y: 100, label: 'B' },
        color: defaultColors.stroke
      },
      {
        id: 'BA', type: 'segment',
        start: { id: 'B', type: 'point', x: 100, y: 100, label: 'B' },
        end: { id: 'A', type: 'point', x: 300, y: 300, label: 'A' },
        color: defaultColors.stroke
      },
    ],
  },
  {
    id: 'circle-basic',
    name: '圆',
    description: '基础圆',
    icon: '○',
    category: 'circle',
    shapes: [
      { id: 'O', type: 'point', x: 200, y: 200, label: 'O', color: defaultColors.point },
      {
        id: 'circle1', type: 'circle',
        center: { id: 'O', type: 'point', x: 200, y: 200, label: 'O' },
        radius: 100,
        color: defaultColors.stroke
      },
    ],
  },
  {
    id: 'circle-with-radius',
    name: '圆（显示半径）',
    description: '圆心到圆上任意点的线段为半径',
    icon: '◎',
    category: 'circle',
    shapes: [
      { id: 'O', type: 'point', x: 200, y: 200, label: 'O', color: defaultColors.point },
      { id: 'A', type: 'point', x: 200, y: 100, label: 'A', color: defaultColors.point },
      {
        id: 'circle1', type: 'circle',
        center: { id: 'O', type: 'point', x: 200, y: 200, label: 'O' },
        radius: 100,
        color: defaultColors.stroke
      },
      {
        id: 'OA', type: 'segment',
        start: { id: 'O', type: 'point', x: 200, y: 200, label: 'O' },
        end: { id: 'A', type: 'point', x: 200, y: 100, label: 'A' },
        label: 'r',
        color: defaultColors.stroke
      },
    ],
  },
  {
    id: 'coordinate-plane',
    name: '平面直角坐标系',
    description: 'X轴和Y轴组成的坐标系',
    icon: '+',
    category: 'coordinate',
    shapes: [
      { id: 'O', type: 'point', x: 200, y: 200, label: 'O', color: defaultColors.point },
      { id: 'X', type: 'point', x: 350, y: 200, label: 'X', color: defaultColors.point },
      { id: 'Y', type: 'point', x: 200, y: 50, label: 'Y', color: defaultColors.point },
      {
        id: 'OX', type: 'segment',
        start: { id: 'O', type: 'point', x: 200, y: 200, label: 'O' },
        end: { id: 'X', type: 'point', x: 350, y: 200, label: 'X' },
        color: defaultColors.stroke
      },
      {
        id: 'OY', type: 'segment',
        start: { id: 'O', type: 'point', x: 200, y: 200, label: 'O' },
        end: { id: 'Y', type: 'point', x: 200, y: 50, label: 'Y' },
        color: defaultColors.stroke
      },
    ],
  },
  {
    id: 'parallelogram',
    name: '平行四边形',
    description: '对边平行的四边形',
    icon: '◇',
    category: 'basic',
    shapes: [
      { id: 'A', type: 'point', x: 100, y: 200, label: 'A', color: defaultColors.point },
      { id: 'B', type: 'point', x: 250, y: 200, label: 'B', color: defaultColors.point },
      { id: 'C', type: 'point', x: 300, y: 300, label: 'C', color: defaultColors.point },
      { id: 'D', type: 'point', x: 150, y: 300, label: 'D', color: defaultColors.point },
      {
        id: 'AB', type: 'segment',
        start: { id: 'A', type: 'point', x: 100, y: 200, label: 'A' },
        end: { id: 'B', type: 'point', x: 250, y: 200, label: 'B' },
        color: defaultColors.stroke
      },
      {
        id: 'BC', type: 'segment',
        start: { id: 'B', type: 'point', x: 250, y: 200, label: 'B' },
        end: { id: 'C', type: 'point', x: 300, y: 300, label: 'C' },
        color: defaultColors.stroke
      },
      {
        id: 'CD', type: 'segment',
        start: { id: 'C', type: 'point', x: 300, y: 300, label: 'C' },
        end: { id: 'D', type: 'point', x: 150, y: 300, label: 'D' },
        color: defaultColors.stroke
      },
      {
        id: 'DA', type: 'segment',
        start: { id: 'D', type: 'point', x: 150, y: 300, label: 'D' },
        end: { id: 'A', type: 'point', x: 100, y: 200, label: 'A' },
        color: defaultColors.stroke
      },
    ],
  },
]

// 工具配置
export const toolConfigs: Array<{ type: ToolType; name: string; icon: string; shortcut: string }> = [
  { type: 'select', name: '选择', icon: '↖', shortcut: 'V' },
  { type: 'point', name: '点', icon: '•', shortcut: 'P' },
  { type: 'segment', name: '线段', icon: '—', shortcut: 'L' },
  { type: 'line', name: '直线', icon: '╱', shortcut: 'I' },
  { type: 'ray', name: '射线', icon: '→', shortcut: 'R' },
  { type: 'circle', name: '圆', icon: '○', shortcut: 'C' },
  { type: 'polygon', name: '多边形', icon: '⬠', shortcut: 'G' },
  { type: 'angle', name: '角度', icon: '∠', shortcut: 'A' },
  { type: 'measure', name: '测量', icon: '📏', shortcut: 'M' },
  { type: 'text', name: '文字', icon: 'T', shortcut: 'T' },
]

// 数学计算工具
export const mathUtils = {
  // 计算两点之间的距离
  distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  },

  // 计算线段中点
  midpoint(p1: Point, p2: Point): Point {
    return {
      id: 'M',
      type: 'point',
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    }
  },

  // 计算两点连线的斜率
  slope(p1: Point, p2: Point): number {
    if (p2.x === p1.x) return Infinity // 垂直线
    return (p2.y - p1.y) / (p2.x - p1.x)
  },

  // 计算三角形面积（海伦公式）
  triangleArea(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2
    return Math.sqrt(s * (s - a) * (s - b) * (s - c))
  },

  // 计算两点连线的角度（弧度）
  angle(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x)
  },

  // 弧度转角度
  radToDeg(rad: number): number {
    return rad * (180 / Math.PI)
  },

  // 角度转弧度
  degToRad(deg: number): number {
    return deg * (Math.PI / 180)
  },

  // 判断点是否在圆内
  pointInCircle(point: Point, center: Point, radius: number): boolean {
    return this.distance(point, center) <= radius
  },

  // 生成唯一ID
  generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
}
