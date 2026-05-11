/**
 * 知识图谱 API
 * 获取和查询知识图谱数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { presetGraphs } from '@/lib/knowledge-graph/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');
  const nodeId = searchParams.get('nodeId');

  // 获取指定科目的图谱
  if (subject) {
    const graph = presetGraphs[subject];
    if (!graph) {
      return NextResponse.json(
        { success: false, error: '未找到该科目的知识图谱' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: graph,
    });
  }

  // 获取所有图谱概览
  const overview = Object.entries(presetGraphs).map(([key, graph]) => ({
    subject: key,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    subjects: [...new Set(graph.nodes.map(n => n.subject))],
  }));

  return NextResponse.json({
    success: true,
    data: overview,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, nodeId } = body;

    // 获取指定节点及其关联的子图
    if (subject && nodeId) {
      const graph = presetGraphs[subject];
      if (!graph) {
        return NextResponse.json(
          { success: false, error: '未找到该科目的知识图谱' },
          { status: 404 }
        );
      }

      const rootNode = graph.nodes.find(n => n.id === nodeId);
      if (!rootNode) {
        return NextResponse.json(
          { success: false, error: '未找到该节点' },
          { status: 404 }
        );
      }

      // 找出直接关联的节点
      const relatedNodeIds = new Set<string>();
      const relatedEdges = graph.edges.filter(e => {
        if (e.source === nodeId || e.target === nodeId) {
          relatedNodeIds.add(e.source);
          relatedNodeIds.add(e.target);
          return true;
        }
        return false;
      });

      const relatedNodes = graph.nodes.filter(n => relatedNodeIds.has(n.id));

      return NextResponse.json({
        success: true,
        data: {
          rootNode,
          relatedNodes,
          edges: relatedEdges,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: '缺少必要参数' },
      { status: 400 }
    );
  } catch (error) {
    console.error('获取知识图谱失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
