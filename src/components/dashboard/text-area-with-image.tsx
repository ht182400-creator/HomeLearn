"use client";

import { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Image, Loader2 } from "lucide-react";

interface TextAreaWithImageProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  id?: string;
}

export function TextAreaWithImage({
  value,
  onChange,
  placeholder = "请输入内容...",
  className,
  rows = 4,
  id,
}: TextAreaWithImageProps) {
  const [uploading, setUploading] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  // 将图片插入编辑器
  const insertImageToEditor = useCallback(
    async (file: File, insertPos?: number) => {
      setUploading(true);

      try {
        // 转换为 Base64
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          
          // 插入 Markdown 图片语法
          const textarea = document.getElementById(
            id || "textarea-with-image"
          ) as HTMLTextAreaElement;
          const start = insertPos ?? textarea?.selectionStart ?? value.length;
          
          const imageMarkdown = `\n![${file.name}](${base64})\n`;
          const newValue = value.substring(0, start) + imageMarkdown + value.substring(start);
          onChange(newValue);
        };
        reader.onerror = () => {
          alert("图片读取失败，请重试");
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("图片上传失败:", error);
        alert("图片上传失败，请重试");
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, id]
  );

  // 处理粘贴事件 - 支持 Ctrl+V 粘贴图片
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData.items;
      
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault(); // 阻止默认粘贴文本
          
          const file = item.getAsFile();
          if (file) {
            // 检查文件大小
            if (file.size > 5 * 1024 * 1024) {
              alert("图片大小不能超过 5MB");
              return;
            }
            
            const textarea = document.getElementById(
              id || "textarea-with-image"
            ) as HTMLTextAreaElement;
            const start = textarea?.selectionStart ?? value.length;
            
            await insertImageToEditor(file, start);
          }
          return;
        }
      }
    },
    [value, onChange, insertImageToEditor, id]
  );

  // 处理右键菜单
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    },
    []
  );

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  // 右键菜单：粘贴图片
  const handleContextMenuPasteImage = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const file = new File([blob], "clipboard-image.png", { type });
            
            if (file.size > 5 * 1024 * 1024) {
              alert("图片大小不能超过 5MB");
              return;
            }
            
            const textarea = document.getElementById(
              id || "textarea-with-image"
            ) as HTMLTextAreaElement;
            const start = textarea?.selectionStart ?? value.length;
            
            await insertImageToEditor(file, start);
            closeContextMenu();
            return;
          }
        }
      }
      alert("剪贴板中没有图片");
    } catch (error) {
      console.error("粘贴图片失败:", error);
      alert("无法访问剪贴板，请确保已授予剪贴板权限");
    }
    closeContextMenu();
  }, [value, onChange, insertImageToEditor, closeContextMenu, id]);

  return (
    <div className={cn("relative", className)}>
      {uploading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>处理中...</span>
          </div>
        </div>
      )}
      
      <textarea
        id={id || "textarea-with-image"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        onContextMenu={handleContextMenu}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm"
        )}
      />

      {/* 右键菜单 */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-white border rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              type="button"
              onClick={handleContextMenuPasteImage}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Image className="h-4 w-4" />
              粘贴图片
            </button>
            <div className="border-t my-1" />
            <button
              type="button"
              onClick={() => {
                document.execCommand("paste");
                closeContextMenu();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            >
              粘贴文本
            </button>
          </div>
        </>
      )}
      
      <p className="text-xs text-gray-500 mt-1">
        支持粘贴图片：Ctrl+V 或 右键选择&quot;粘贴图片&quot;
      </p>
    </div>
  );
}
