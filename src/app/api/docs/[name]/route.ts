/**
 * 获取文档内容
 * GET /api/docs/[name]
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    
    // 安全检查：只允许 .md 文件
    if (!decodedName.endsWith(".md") || decodedName.includes("..")) {
      return NextResponse.json(
        { error: "不支持的文件类型" },
        { status: 400 }
      );
    }
    
    const filePath = join(process.cwd(), "Doc", decodedName);
    
    // 读取文件内容
    const content = await readFile(filePath, "utf-8");
    
    return NextResponse.json({
      success: true,
      name: decodedName,
      content,
    });
  } catch (error) {
    console.error("读取文档失败:", error);
    return NextResponse.json(
      { error: "文档不存在" },
      { status: 404 }
    );
  }
}
