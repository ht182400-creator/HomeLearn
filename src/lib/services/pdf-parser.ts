/**
 * PDF 文本提取服务 - 使用 pdfjs-dist
 */
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')

export interface PDFParseResult {
  text: string
  pageCount: number
}

/**
 * 从 PDF Buffer 提取文本
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFParseResult> {
  // 加载 PDF
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  })
  
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  const textParts: string[] = []
  
  // 提取每一页的文本
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    
    // 提取文本
    const pageText = content.items
      .map((item: any) => item.str || '')
      .join(' ')
    
    textParts.push(pageText)
  }
  
  return {
    text: textParts.join('\n\n'),
    pageCount,
  }
}

/**
 * 清理提取的文本
 */
export function cleanText(text: string): string {
  return text
    // 移除多余的空白字符
    .replace(/\s+/g, ' ')
    // 移除控制字符
    .replace(/[\x00-\x1F\x7F]/g, '')
    // 清理多余空格
    .trim()
}
