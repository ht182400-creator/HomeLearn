"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { FileText, ArrowLeft, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DocContent {
  name: string;
  content: string;
}

interface PageProps {
  params: { name: string };
}

/**
 * 修复非标准 Markdown 表格格式
 * 处理两种常见问题：
 * 1. 缺少表头分隔行（|---|---|）→ 自动补全
 * 2. 表格前缺少空行（GFM 要求表格前必须有空行）→ 自动插入
 * @param content - 原始 Markdown 内容
 * @returns 修复后的 Markdown 内容
 */
function fixMarkdownTables(content: string): string {
  // 统一换行符，去除 \r
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmedLine = lines[i];

    // 检测以 | 开头和结尾的行（可能是表格行）
    if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
      // 收集连续的表格行
      const tableLines: string[] = [trimmedLine];
      i++;
      while (
        i < lines.length &&
        lines[i].startsWith("|") &&
        lines[i].endsWith("|")
      ) {
        tableLines.push(lines[i]);
        i++;
      }

      // 检查第二行是否是分隔符（GFM 标准表格已有正确格式）
      const hasSeparator =
        tableLines.length >= 2 &&
        /^\|[\s\-:|]+\|$/.test(tableLines[1].trim());

      if (!hasSeparator && tableLines.length >= 1) {
        // 缺少分隔行，自动补全：第一行作为表头，插入分隔符
        const colCount = Math.max(
          1,
          tableLines[0].split("|").length - 2,
        );
        const separator = "| " + "--- |".repeat(colCount);
        // 在第一行后插入分隔符
        tableLines.splice(1, 0, separator);
      }

      // 确保表格前面有空行（GFM 规范要求）
      if (result.length > 0 && result[result.length - 1].trim() !== "") {
        result.push("");
      }

      result.push(...tableLines);
      continue;
    }

    result.push(trimmedLine);
    i++;
  }

  return result.join("\n");
}

/**
 * 文档查看页面
 * 使用 react-markdown + remarkGfm 渲染 Markdown，支持 GFM 表格
 */
export default function DocViewPage({ params }: PageProps) {
  const [doc, setDoc] = useState<DocContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params?.name) {
      fetchDoc(decodeURIComponent(params.name));
    }
  }, [params]);

  /** 获取文档内容 */
  const fetchDoc = async (docName: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/docs/${encodeURIComponent(docName)}`);
      const data = await res.json();
      if (data.success) {
        setDoc(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("加载文档失败");
    } finally {
      setLoading(false);
    }
  };

  /** 复制文档内容到剪贴板（使用原始内容） */
  const copyContent = () => {
    if (doc?.content) {
      navigator.clipboard.writeText(doc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 使用 useMemo 缓存修复后的 Markdown 内容，避免重复计算
  const processedContent = useMemo(() => {
    if (!doc?.content) return "";
    return fixMarkdownTables(doc.content);
  }, [doc?.content]);

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "文档不存在"}</p>
          <Link
            href="/doc"
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            返回文档列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/doc"
              className="flex items-center gap-2 text-gray-600 hover:text-violet-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回文档列表
            </Link>

            <button
              onClick={copyContent}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  复制内容
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 文档内容 */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <article className="bg-white rounded-xl shadow-sm border p-8">
          {/* 文档标题 */}
          <header className="mb-8 pb-6 border-b">
            <div className="flex items-center gap-3 text-gray-500 text-sm mb-4">
              <FileText className="h-5 w-5" />
              <span>{doc.name}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {doc.name.replace(".md", "").replace(/^\d+_/, "")}
            </h1>
          </header>

          {/* 使用 react-markdown 渲染修复后的 Markdown 内容 */}
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {processedContent}
            </ReactMarkdown>
          </div>
        </article>
      </div>

      {/* Markdown 渲染样式 */}
      <style jsx global>{`
        .markdown-body {
          line-height: 1.8;
          color: #333;
          font-size: 15px;
        }
        /* 标题 */
        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3,
        .markdown-body h4,
        .markdown-body h5,
        .markdown-body h6 {
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          font-weight: 600;
          line-height: 1.3;
          color: #1f2937;
        }
        .markdown-body h1 {
          font-size: 2em;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 0.5em;
        }
        .markdown-body h2 {
          font-size: 1.5em;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.3em;
        }
        .markdown-body h3 {
          font-size: 1.25em;
        }
        /* 段落 */
        .markdown-body p {
          margin: 1em 0;
        }
        /* 表格样式 - GFM 规范 */
        .markdown-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.2em 0;
          overflow-x: auto;
          display: table; /* 改用 table 布局确保对齐 */
          font-size: 14px;
        }
        .markdown-body table th,
        .markdown-body table td {
          border: 1px solid #d1d5db;
          padding: 10px 14px;
          text-align: left;
          white-space: normal; /* 允许单元格内换行 */
          vertical-align: top;
        }
        .markdown-body table th {
          background-color: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        .markdown-body table tr:nth-child(even) td {
          background-color: #fafafa;
        }
        .markdown-body table tr:hover td {
          background-color: #f3f4f6;
        }
        /* 代码块 */
        .markdown-body pre {
          background-color: #1f2937;
          color: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.2em 0;
          font-size: 13px;
          line-height: 1.6;
        }
        .markdown-body code {
          background-color: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.875em;
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo,
            monospace;
        }
        .markdown-body pre code {
          background-color: transparent;
          padding: 0;
          color: inherit;
        }
        /* 列表 */
        .markdown-body ul,
        .markdown-body ol {
          margin: 1em 0;
          padding-left: 2em;
        }
        .markdown-body li {
          margin: 0.35em 0;
        }
        .markdown-body li > ul,
        .markdown-body li > ol {
          margin: 0.25em 0;
        }
        /* 引用 */
        .markdown-body blockquote {
          border-left: 4px solid #8b5cf6;
          padding: 0.5em 1em;
          margin: 1.2em 0;
          color: #6b7280;
          background-color: #faf5ff;
          border-radius: 0 6px 6px 0;
        }
        /* 链接 */
        .markdown-body a {
          color: #7c3aed;
          text-decoration: none;
          word-break: break-word;
        }
        .markdown-body a:hover {
          text-decoration: underline;
          color: #6d28d9;
        }
        /* 图片 */
        .markdown-body img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }
        /* 分割线 */
        .markdown-body hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 2em 0;
        }
        /* 粗体/斜体 */
        .markdown-body strong {
          color: #111827;
        }
        .markdown-body em {
          color: #4b5563;
        }
        /* 删除线 */
        .markdown-body del {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
