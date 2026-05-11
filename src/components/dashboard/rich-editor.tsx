"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

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

        <span className="text-xs text-gray-500">提示：使用 **加粗**、*斜体*、`代码`</span>
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
        id="question-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full min-h-[200px] p-4 border rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {/* 预览提示 */}
      <p className="text-xs text-gray-500">
        支持 Markdown 语法：输入完成后点击&quot;预览&quot;查看格式化效果
      </p>
    </div>
  );
}
