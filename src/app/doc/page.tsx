"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Clock, Calendar } from "lucide-react";

interface DocItem {
  name: string;
  title: string;
  createTime: string | null;
  updateTime: string | null;
  path: string;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await fetch("/api/docs/list");
      const data = await res.json();
      if (data.success) {
        setDocs(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("获取文档列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 按分类分组
  const groupedDocs = docs.reduce((acc, doc) => {
    const category = doc.name.includes("FAQ") ? "FAQ" : 
                     doc.name.includes("需求分析") ? "需求分析" :
                     doc.name.includes("数据库") ? "数据库" :
                     doc.name.includes("技术") ? "技术文档" :
                     doc.name.includes("测试") ? "测试文档" :
                     doc.name.includes("history") ? "历史记录" : "其他";
    
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, DocItem[]>);

  const categoryOrder = ["需求分析", "技术文档", "数据库", "测试文档", "FAQ", "其他", "历史记录"];

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button onClick={fetchDocs} className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg">
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="h-8 w-8 text-violet-600" />
            文档中心
          </h1>
          <p className="mt-2 text-gray-600">共 {docs.length} 篇文档</p>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {categoryOrder.map((category) => {
          const categoryDocs = groupedDocs[category];
          if (!categoryDocs || categoryDocs.length === 0) return null;

          return (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-violet-600 rounded-full"></span>
                {category}
                <span className="text-sm font-normal text-gray-500">({categoryDocs.length})</span>
              </h2>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryDocs.map((doc) => (
                  <Link
                    key={doc.name}
                    href={doc.path}
                    className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-violet-300 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-violet-50 rounded-lg group-hover:bg-violet-100 transition-colors">
                        <FileText className="h-5 w-5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate group-hover:text-violet-700 transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {doc.name}
                        </p>
                      </div>
                    </div>
                    
                    {/* 时间信息 */}
                    {(doc.updateTime || doc.createTime) && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                        {doc.updateTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            更新于 {doc.updateTime}
                          </div>
                        )}
                        {doc.createTime && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            创建于 {doc.createTime}
                          </div>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
