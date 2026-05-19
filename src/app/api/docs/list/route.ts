/**
 * 获取文档列表
 * GET /api/docs/list
 */

import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const docsDir = join(process.cwd(), "Doc");
    
    // 读取目录下的所有文件
    const files = await readdir(docsDir);
    
    // 只返回 .md 文件，并获取文件信息
    const mdFiles = await Promise.all(
      files
        .filter(file => file.endsWith(".md"))
        .map(async (file) => {
          const filePath = join(docsDir, file);
          const content = await readFile(filePath, "utf-8");
          
          // 提取文件开头的标题（第一个 # 开头的内容）
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : file.replace(".md", "");
          
          // 提取创建时间（如果存在）
          const createMatch = content.match(/创建时间[：:]\s*(\d{4}-\d{2}-\d{2})/);
          const createTime = createMatch ? createMatch[1] : null;
          
          // 提取更新时间（如果存在）
          const updateMatch = content.match(/更新时间[：:]\s*(\d{4}-\d{2}-\d{2})/);
          const updateTime = updateMatch ? updateMatch[1] : null;
          
          return {
            name: file,
            title,
            createTime,
            updateTime,
            path: `/doc/${encodeURIComponent(file)}`,
          };
        })
    );
    
    // 按更新时间倒序排列
    mdFiles.sort((a, b) => {
      if (a.updateTime && b.updateTime) {
        return b.updateTime.localeCompare(a.updateTime);
      }
      return a.name.localeCompare(b.name);
    });
    
    return NextResponse.json({
      success: true,
      data: mdFiles,
      total: mdFiles.length,
    });
  } catch (error) {
    console.error("获取文档列表失败:", error);
    return NextResponse.json(
      { error: "获取文档列表失败" },
      { status: 500 }
    );
  }
}
