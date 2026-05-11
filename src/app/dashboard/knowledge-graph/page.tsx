'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { presetGraphs, subjectOptions, getNodeSize, getNodeColor, getEdgeStyle, type KnowledgeNode, type KnowledgeEdge, type KnowledgeGraph } from '@/lib/knowledge-graph/types';

export default function KnowledgeGraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('math');
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<KnowledgeNode | null>(null);
  const [zoom, setZoom] = useState([1]);
  const [showLabels, setShowLabels] = useState(true);
  const [showMastery, setShowMastery] = useState(true);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // 加载图谱数据
  useEffect(() => {
    const graphData = presetGraphs[selectedSubject];
    if (graphData) {
      setGraph(graphData);
      setSelectedNode(null);
    }
  }, [selectedSubject]);

  // 计算力导向布局
  useEffect(() => {
    if (!graph) return;

    // 简单的力导向布局算法
    const positions: Record<string, { x: number; y: number }> = {};
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    // 初始化位置
    graph.nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / graph.nodes.length;
      const radius = Math.min(width, height) * 0.35;
      positions[node.id] = {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
      };
    });

    // 力导向迭代
    const iterations = 100;
    const repulsion = 5000;
    const attraction = 0.01;
    const damping = 0.9;

    const velocities: Record<string, { x: number; y: number }> = {};
    graph.nodes.forEach(node => {
      velocities[node.id] = { x: 0, y: 0 };
    });

    for (let i = 0; i < iterations; i++) {
      // 计算斥力
      graph.nodes.forEach(node1 => {
        graph.nodes.forEach(node2 => {
          if (node1.id === node2.id) return;
          const dx = positions[node1.id].x - positions[node2.id].x;
          const dy = positions[node1.id].y - positions[node2.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          velocities[node1.id].x += (dx / dist) * force;
          velocities[node1.id].y += (dy / dist) * force;
        });
      });

      // 计算引力
      graph.edges.forEach(edge => {
        const source = positions[edge.source];
        const target = positions[edge.target];
        if (!source || !target) return;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        velocities[edge.source].x += dx * attraction;
        velocities[edge.source].y += dy * attraction;
        velocities[edge.target].x -= dx * attraction;
        velocities[edge.target].y -= dy * attraction;
      });

      // 更新位置
      graph.nodes.forEach(node => {
        positions[node.id].x += velocities[node.id].x;
        positions[node.id].y += velocities[node.id].y;
        velocities[node.id].x *= damping;
        velocities[node.id].y *= damping;

        // 边界约束
        positions[node.id].x = Math.max(50, Math.min(width - 50, positions[node.id].x));
        positions[node.id].y = Math.max(50, Math.min(height - 50, positions[node.id].y));
      });
    }

    setNodePositions(positions);
  }, [graph]);

  // 绘制图谱
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !graph) return;

    const container = containerRef.current;
    if (!container) return;

    // 设置画布大小
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const currentZoom = zoom[0];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(currentZoom, currentZoom);

    // 绘制边
    graph.edges.forEach(edge => {
      const sourcePos = nodePositions[edge.source];
      const targetPos = nodePositions[edge.target];
      if (!sourcePos || !targetPos) return;

      const style = getEdgeStyle(edge.type);
      ctx.beginPath();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2;
      if (style.dashArray) {
        ctx.setLineDash(style.dashArray.split(',').map(Number));
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.stroke();

      // 绘制箭头
      const angle = Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x);
      const arrowLength = 10;
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.moveTo(targetPos.x, targetPos.y);
      ctx.lineTo(
        targetPos.x - arrowLength * Math.cos(angle - Math.PI / 6),
        targetPos.y - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(targetPos.x, targetPos.y);
      ctx.lineTo(
        targetPos.x - arrowLength * Math.cos(angle + Math.PI / 6),
        targetPos.y - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    });

    // 绘制节点
    graph.nodes.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;

      const size = getNodeSize(node.importance);
      const color = getNodeColor(showMastery ? node.mastery : undefined);
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;

      // 绘制圆
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // 边框
      ctx.strokeStyle = isSelected ? '#1e40af' : isHovered ? '#3b82f6' : '#fff';
      ctx.lineWidth = isSelected || isHovered ? 3 : 2;
      ctx.stroke();

      // 绘制标签
      if (showLabels) {
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, pos.x, pos.y + size / 2 + 16);
      }
    });

    ctx.restore();
  }, [graph, nodePositions, selectedNode, hoveredNode, zoom, showLabels, showMastery]);

  // 处理画布点击
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom[0];
    const y = (e.clientY - rect.top) / zoom[0];

    // 查找点击的节点
    let clickedNode: KnowledgeNode | null = null;
    graph.nodes.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;
      const size = getNodeSize(node.importance);
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist <= size / 2) {
        clickedNode = node;
      }
    });

    setSelectedNode(clickedNode);
  };

  // 处理鼠标移动
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom[0];
    const y = (e.clientY - rect.top) / zoom[0];

    let hovered: KnowledgeNode | null = null;
    graph.nodes.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;
      const size = getNodeSize(node.importance);
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist <= size / 2) {
        hovered = node;
      }
    });

    setHoveredNode(hovered);
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">知识图谱</h1>
        <p className="text-gray-500 mt-2">可视化知识点关系，发现学习薄弱点</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：控制面板 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 科目选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">选择科目</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map(subject => (
                    <SelectItem key={subject.value} value={subject.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                        {subject.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* 显示设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">显示设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  缩放: {Math.round(zoom[0] * 100)}%
                </label>
                <Slider
                  value={zoom}
                  onValueChange={setZoom}
                  min={[0.5]}
                  max={[2]}
                  step={[0.1]}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">显示标签</span>
                <Button
                  variant={showLabels ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowLabels(!showLabels)}
                >
                  {showLabels ? '显示' : '隐藏'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">显示掌握度</span>
                <Button
                  variant={showMastery ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowMastery(!showMastery)}
                >
                  {showMastery ? '显示' : '隐藏'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 图例 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">图例</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-sm font-medium mb-1">节点颜色（掌握度）</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-green-500" /> 80%+ 掌握
                  <span className="w-4 h-4 rounded-full bg-yellow-500" /> 60-80%
                  <span className="w-4 h-4 rounded-full bg-orange-500" /> 40-60%
                  <span className="w-4 h-4 rounded-full bg-red-500" /> 40%以下
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm font-medium mb-1">边类型</div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <svg width="24" height="12">
                      <line x1="0" y1="6" x2="24" y2="6" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
                    </svg>
                    先修关系（虚线）
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="24" height="12">
                      <line x1="0" y1="6" x2="24" y2="6" stroke="#94a3b8" strokeWidth="2" />
                    </svg>
                    相关关系（实线）
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">统计信息</CardTitle>
            </CardHeader>
            <CardContent>
              {graph && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>知识点数量</span>
                    <Badge>{graph.nodes.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>关联数量</span>
                    <Badge>{graph.edges.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>平均掌握度</span>
                    <Badge variant="outline">
                      {Math.round(
                        graph.nodes.reduce((sum, n) => sum + (n.mastery || 0), 0) / graph.nodes.length
                      )}%
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：图谱画布 */}
        <div className="lg:col-span-3">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{subjectOptions.find(s => s.value === selectedSubject)?.label} 知识图谱</span>
                {hoveredNode && (
                  <Badge>{hoveredNode.label}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                点击节点查看详情，拖动调整视角
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={containerRef} className="relative w-full h-[500px] bg-gray-50 rounded-b-lg">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full"
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                />
              </div>
            </CardContent>
          </Card>

          {/* 选中节点详情 */}
          {selectedNode && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">{selectedNode.label}</CardTitle>
                <CardDescription>
                  <Badge variant="outline" className="mr-2">
                    {selectedNode.type === 'chapter' ? '章节' :
                     selectedNode.type === 'topic' ? '专题' : '概念'}
                  </Badge>
                  <Badge variant="outline">年级 {selectedNode.grade}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedNode.mastery || 0}%
                    </div>
                    <div className="text-sm text-gray-500">掌握度</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedNode.importance}
                    </div>
                    <div className="text-sm text-gray-500">重要程度</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedNode.questionCount || 0}
                    </div>
                    <div className="text-sm text-gray-500">关联题目</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1">开始练习</Button>
                  <Button variant="outline" className="flex-1">查看详情</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
