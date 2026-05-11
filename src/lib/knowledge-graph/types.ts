/**
 * 知识图谱模块
 * 可视化知识点关系
 */

// 节点类型
export interface KnowledgeNode {
  id: string;
  label: string;
  subject: string;
  grade: number;
  type: 'concept' | 'topic' | 'chapter';
  importance: number; // 1-5，影响节点大小
  mastery?: number; // 掌握程度 0-100
  questionCount?: number; // 关联题目数
  x?: number;
  y?: number;
}

// 边类型
export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: 'prerequisite' | 'related' | 'belongTo';
  label?: string;
}

// 知识图谱数据
export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// 子图（用于展示局部知识图谱）
export interface KnowledgeSubgraph {
  rootNode: KnowledgeNode;
  relatedNodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// 预设知识图谱数据
export const presetGraphs: Record<string, KnowledgeGraph> = {
  math: {
    nodes: [
      { id: 'math-1', label: '数与代数', subject: '数学', grade: 7, type: 'chapter', importance: 5, mastery: 85 },
      { id: 'math-1-1', label: '有理数', subject: '数学', grade: 7, type: 'topic', importance: 4, mastery: 90 },
      { id: 'math-1-2', label: '整式', subject: '数学', grade: 7, type: 'topic', importance: 4, mastery: 75 },
      { id: 'math-1-3', label: '一元一次方程', subject: '数学', grade: 7, type: 'topic', importance: 5, mastery: 60 },
      { id: 'math-2', label: '图形与几何', subject: '数学', grade: 7, type: 'chapter', importance: 5, mastery: 70 },
      { id: 'math-2-1', label: '直线与角', subject: '数学', grade: 7, type: 'topic', importance: 4, mastery: 80 },
      { id: 'math-2-2', label: '三角形', subject: '数学', grade: 7, type: 'topic', importance: 5, mastery: 65 },
      { id: 'math-3', label: '函数', subject: '数学', grade: 8, type: 'chapter', importance: 5, mastery: 45 },
      { id: 'math-3-1', label: '一次函数', subject: '数学', grade: 8, type: 'topic', importance: 5, mastery: 50 },
      { id: 'math-3-2', label: '反比例函数', subject: '数学', grade: 8, type: 'topic', importance: 4, mastery: 40 },
    ],
    edges: [
      { id: 'e1', source: 'math-1-1', target: 'math-1-2', type: 'prerequisite', label: '基础' },
      { id: 'e2', source: 'math-1-2', target: 'math-1-3', type: 'prerequisite', label: '基础' },
      { id: 'e3', source: 'math-1-1', target: 'math-2-1', type: 'related', label: '相关' },
      { id: 'e4', source: 'math-2-1', target: 'math-2-2', type: 'prerequisite', label: '基础' },
      { id: 'e5', source: 'math-1-3', target: 'math-3-1', type: 'prerequisite', label: '基础' },
      { id: 'e6', source: 'math-3-1', target: 'math-3-2', type: 'related', label: '相关' },
      { id: 'e7', source: 'math-2-2', target: 'math-3', type: 'belongTo' },
      { id: 'e8', source: 'math-3', target: 'math-2', type: 'related' },
    ],
  },
  english: {
    nodes: [
      { id: 'en-1', label: '语法基础', subject: '英语', grade: 7, type: 'chapter', importance: 5, mastery: 80 },
      { id: 'en-1-1', label: '时态', subject: '英语', grade: 7, type: 'topic', importance: 5, mastery: 75 },
      { id: 'en-1-2', label: '语态', subject: '英语', grade: 8, type: 'topic', importance: 4, mastery: 60 },
      { id: 'en-1-3', label: '从句', subject: '英语', grade: 9, type: 'topic', importance: 5, mastery: 50 },
      { id: 'en-2', label: '词汇', subject: '英语', grade: 7, type: 'chapter', importance: 5, mastery: 70 },
      { id: 'en-2-1', label: '名词', subject: '英语', grade: 7, type: 'topic', importance: 4, mastery: 85 },
      { id: 'en-2-2', label: '动词', subject: '英语', grade: 7, type: 'topic', importance: 5, mastery: 65 },
      { id: 'en-2-3', label: '形容词', subject: '英语', grade: 7, type: 'topic', importance: 4, mastery: 80 },
    ],
    edges: [
      { id: 'e1', source: 'en-1-1', target: 'en-1-2', type: 'prerequisite', label: '基础' },
      { id: 'e2', source: 'en-1-2', target: 'en-1-3', type: 'prerequisite', label: '基础' },
      { id: 'e3', source: 'en-2-1', target: 'en-2-2', type: 'related' },
      { id: 'e4', source: 'en-2-1', target: 'en-2-3', type: 'related' },
      { id: 'e5', source: 'en-1-1', target: 'en-2-2', type: 'related' },
    ],
  },
  physics: {
    nodes: [
      { id: 'ph-1', label: '力学', subject: '物理', grade: 8, type: 'chapter', importance: 5, mastery: 65 },
      { id: 'ph-1-1', label: '速度', subject: '物理', grade: 8, type: 'topic', importance: 4, mastery: 70 },
      { id: 'ph-1-2', label: '力与运动', subject: '物理', grade: 8, type: 'topic', importance: 5, mastery: 55 },
      { id: 'ph-1-3', label: '功与能', subject: '物理', grade: 9, type: 'topic', importance: 5, mastery: 45 },
      { id: 'ph-2', label: '电磁学', subject: '物理', grade: 9, type: 'chapter', importance: 5, mastery: 50 },
      { id: 'ph-2-1', label: '电流', subject: '物理', grade: 9, type: 'topic', importance: 4, mastery: 60 },
      { id: 'ph-2-2', label: '磁场', subject: '物理', grade: 9, type: 'topic', importance: 4, mastery: 40 },
    ],
    edges: [
      { id: 'e1', source: 'ph-1-1', target: 'ph-1-2', type: 'prerequisite', label: '基础' },
      { id: 'e2', source: 'ph-1-2', target: 'ph-1-3', type: 'prerequisite', label: '基础' },
      { id: 'e3', source: 'ph-2-1', target: 'ph-2-2', type: 'related' },
      { id: 'e4', source: 'ph-1-3', target: 'ph-2', type: 'related' },
    ],
  },
};

// 科目列表
export const subjectOptions = [
  { value: 'math', label: '数学', color: '#3b82f6' },
  { value: 'english', label: '英语', color: '#10b981' },
  { value: 'physics', label: '物理', color: '#f59e0b' },
  { value: 'chinese', label: '语文', color: '#ef4444' },
  { value: 'chemistry', label: '化学', color: '#8b5cf6' },
];

// 节点大小映射
export function getNodeSize(importance: number): number {
  return 20 + importance * 8;
}

// 节点颜色映射
export function getNodeColor(mastery?: number): string {
  if (mastery === undefined) return '#94a3b8';
  if (mastery >= 80) return '#22c55e'; // 绿色 - 掌握
  if (mastery >= 60) return '#eab308'; // 黄色 - 一般
  if (mastery >= 40) return '#f97316'; // 橙色 - 较弱
  return '#ef4444'; // 红色 - 薄弱
}

// 边的样式映射
export function getEdgeStyle(type: KnowledgeEdge['type']): { color: string; dashArray?: string } {
  switch (type) {
    case 'prerequisite':
      return { color: '#3b82f6', dashArray: '5,5' };
    case 'related':
      return { color: '#94a3b8' };
    case 'belongTo':
      return { color: '#a855f7' };
    default:
      return { color: '#94a3b8' };
  }
}

// 生成唯一 ID
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 计算节点度数
export function calculateNodeDegree(nodeId: string, edges: KnowledgeEdge[]): number {
  return edges.filter(e => e.source === nodeId || e.target === nodeId).length;
}
