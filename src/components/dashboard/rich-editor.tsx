"use client";

import { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Image, Loader2 } from "lucide-react";

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

type FormatType = "bold" | "italic" | "underline" | "code" | "formula";

export function RichEditor({
  value,
  onChange,
  placeholder = "请输入内容...",
  className,
}: RichEditorProps) {
  const [showFormula, setShowFormula] = useState(false);
  const [formulaInput, setFormulaInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // 常用数学符号快捷插入
  const mathSymbols = [
    { label: "分数", insert: "\\frac{}{}" },
    { label: "平方", insert: "^2" },
    { label: "开方", insert: "\\sqrt{}" },
    { label: "下标", insert: "_{}" },
    { label: "上标", insert: "^{}" },
    { label: "乘", insert: "\\times" },
    { label: "除", insert: "\\div" },
    { label: "不等于", insert: "\\neq" },
    { label: "小于等于", insert: "\\leq" },
    { label: "大于等于", insert: "\\geq" },
    { label: "约等于", insert: "\\approx" },
    { label: "正负", insert: "\\pm" },
    { label: "无穷", insert: "\\infty" },
    { label: "角度", insert: "^{\\circ}" },
    { label: "度", insert: "\\degree" },
    { label: "派", insert: "\\pi" },
    { label: "包含", insert: "\\in" },
    { label: "子集", insert: "\\subset" },
  ];

  const applyFormat = useCallback(
    (format: FormatType) => {
      const textarea = document.getElementById(
        "question-editor"
      ) as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);

      let newText = "";
      let cursorOffset = 0;

      switch (format) {
        case "bold":
          newText = `**${selectedText}**`;
          cursorOffset = 2;
          break;
        case "italic":
          newText = `*${selectedText}*`;
          cursorOffset = 1;
          break;
        case "underline":
          newText = `<u>${selectedText}</u>`;
          cursorOffset = 3;
          break;
        case "code":
          newText = `\`${selectedText}\``;
          cursorOffset = 1;
          break;
        case "formula":
          setShowFormula(true);
          return;
        default:
          newText = selectedText;
      }

      const newValue =
        value.substring(0, start) + newText + value.substring(end);
      onChange(newValue);

      // 恢复焦点并设置光标位置
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + cursorOffset,
          start + cursorOffset + selectedText.length
        );
      }, 0);
    },
    [value, onChange]
  );

  const insertFormula = useCallback(() => {
    if (!formulaInput.trim()) return;

    const textarea = document.getElementById(
      "question-editor"
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const formula = `$ ${formulaInput} $`;

    const newValue = value.substring(0, start) + formula + value.substring(start);
    onChange(newValue);

    setFormulaInput("");
    setShowFormula(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + formula.length,
        start + formula.length
      );
    }, 0);
  }, [formulaInput, value, onChange]);

  const insertSymbol = useCallback(
    (symbol: string) => {
      const textarea = document.getElementById(
        "question-editor"
      ) as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      // 计算光标在公式内的位置，用于自动定位
      const formulaStart = formulaInput.length;
      const newFormulaInput = formulaInput + symbol;

      setFormulaInput(newFormulaInput);
      setShowFormula(true);

      setTimeout(() => {
        textarea.focus();
        // 计算新光标位置（在插入符号后）
        const newCursorPos = formulaStart + symbol.length;
        textarea.setSelectionRange(start + newCursorPos, start + newCursorPos);
      }, 0);
    },
    [formulaInput]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab 键插入空格而非切换焦点
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.target as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const newValue =
          value.substring(0, start) + "    " + value.substring(end);
        onChange(newValue);

        setTimeout(() => {
          textarea.setSelectionRange(start + 4, start + 4);
        }, 0);
      }
    },
    [value, onChange]
  );

  // 处理图片上传
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 检查文件类型
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        return;
      }

      // 检查文件大小（限制 5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert("图片大小不能超过 5MB");
        return;
      }

      await insertImageToEditor(file);
    },
    [value, onChange]
  );

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
            "question-editor"
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
        // 清空文件输入，允许重复选择同一文件
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [value, onChange]
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
              "question-editor"
            ) as HTMLTextAreaElement;
            const start = textarea?.selectionStart ?? value.length;
            
            await insertImageToEditor(file, start);
          }
          return;
        }
      }
    },
    [value, onChange, insertImageToEditor]
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
              "question-editor"
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
  }, [value, onChange, insertImageToEditor, closeContextMenu]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 rounded-lg border">
        <button
          type="button"
          onClick={() => applyFormat("bold")}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="加粗 (Ctrl+B)"
        >
          <span className="font-bold text-sm">B</span>
        </button>
        <button
          type="button"
          onClick={() => applyFormat("italic")}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="斜体 (Ctrl+I)"
        >
          <span className="italic text-sm">I</span>
        </button>
        <button
          type="button"
          onClick={() => applyFormat("underline")}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="下划线"
        >
          <span className="underline text-sm">U</span>
        </button>
        <button
          type="button"
          onClick={() => applyFormat("code")}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="代码"
        >
          <span className="font-mono text-sm bg-gray-200 px-1 rounded">
            {"</>"}
          </span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 图片上传按钮 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors",
            uploading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-200 bg-white border"
          )}
          title="插入图片"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Image className="h-4 w-4" />
              图片
            </>
          )}
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => applyFormat("formula")}
          className={cn(
            "px-3 py-1.5 rounded text-sm transition-colors",
            showFormula
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-200 bg-white border"
          )}
          title="插入公式"
        >
          公式 f(x)
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <span className="text-xs text-gray-500">提示：**加粗**、*斜体*、`代码`、图片、右键/ Ctrl+V 粘贴图片</span>
      </div>

      {/* 数学符号快捷栏 - 当显示公式时 */}
      {showFormula && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-blue-700 font-medium">快速插入：</span>
            <input
              type="text"
              value={formulaInput}
              onChange={(e) => setFormulaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertFormula();
                }
              }}
              placeholder="输入 LaTeX 公式，如: \frac{1}{2}"
              className="flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={insertFormula}
              className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
            >
              插入
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFormula(false);
                setFormulaInput("");
              }}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded text-sm"
            >
              取消
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {mathSymbols.map((symbol) => (
              <button
                key={symbol.label}
                type="button"
                onClick={() => insertSymbol(symbol.insert)}
                className="px-2 py-1 text-xs bg-white border rounded hover:bg-blue-100 transition-colors"
                title={symbol.insert}
              >
                {symbol.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 编辑器 */}
      <textarea
        ref={editorRef}
        id="question-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onContextMenu={handleContextMenu}
        placeholder={placeholder}
        className="w-full min-h-[200px] p-4 border rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

      {/* 预览提示 */}
      <p className="text-xs text-gray-500">
        支持 Markdown 语法：输入完成后点击&quot;预览&quot;查看格式化效果
      </p>
    </div>
  );
}
