/**
 * CodeBuddy Native - 内置 CodeBuddy API 调用
 * 用 Node.js/TypeScript 重写 codebuddy2api 核心功能，无需启动独立服务
 * 
 * 功能：
 * - Token 管理（读取 .codebuddy_creds 目录）
 * - API 请求转发
 * - 流式响应处理
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';

// ============ 类型定义 ============

/**
 * CodeBuddy 凭证数据
 */
export interface CodeBuddyCredential {
  bearer_token: string;
  user_id?: string;
  created_at?: number;
  expires_in?: number;
  refresh_token?: string;
  user_info?: {
    email?: string;
    name?: string;
  };
  token_type?: string;
  scope?: string;
  domain?: string;
  session_state?: string;
  [key: string]: any;
}

/**
 * 凭证信息（包含元数据）
 */
export interface CredentialInfo {
  index: number;
  filename: string;
  user_id: string;
  email?: string;
  name?: string;
  created_at?: number;
  expires_in?: number;
  expires_at?: number;
  time_remaining?: number;
  is_expired: boolean;
  token_type?: string;
  scope?: string;
  domain?: string;
  has_refresh_token: boolean;
  session_state?: string;
  file_path: string;
}

/**
 * CodeBuddy 配置
 */
export interface CodeBuddyConfig {
  credsDir: string;           // 凭证目录，默认为 .codebuddy_creds
  rotationCount: number;      // 轮换次数，默认 1（每个请求换一次）
  apiEndpoint: string;       // CodeBuddy API 端点
  models?: string;           // 可用模型列表
  defaultModel?: string;     // 默认模型，默认为 auto
}

// ============ 常量 ============

// 从环境变量读取配置（支持 .env 文件）
const envConfig = {
  credsDir: process.env.CODEBUDDY_CREDS_DIR || '.codebuddy_creds',
  rotationCount: parseInt(process.env.CODEBUDDY_ROTATION_COUNT || '1', 10),
  apiEndpoint: process.env.CODEBUDDY_API_ENDPOINT || 'https://www.codebuddy.cn/v2',
  models: process.env.CODEBUDDY_MODELS || 'auto-chat,deepseek-v4-flash,glm-5.1,kimi-k2.6',
  defaultModel: process.env.CODEBUDDY_MODEL || 'auto',
};

const DEFAULT_CONFIG: Partial<CodeBuddyConfig> = {
  credsDir: envConfig.credsDir,
  rotationCount: envConfig.rotationCount,
  apiEndpoint: envConfig.apiEndpoint,
  models: envConfig.models,
  defaultModel: envConfig.defaultModel,
};

// 支持的模型列表
export const CODEBUDDY_MODELS = [
  'auto', 'auto-chat',
  'deepseek-v4-flash', 'deepseek-v3.2',
  'glm-5v-turbo', 'glm-5.1', 'glm-5.0-turbo',
  'kimi-k2.6', 'kimi-k2.5',
  'minimax-m2.7', 'hunyuan', 'ily3-preview',
  'claude-4.0', 'claude-3.7',
  'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'o4-mini',
  'gemini-2.5-flash', 'gemini-2.5-pro',
] as const;

export type CodeBuddyModel = typeof CODEBUDDY_MODELS[number];

// ============ Token 管理器 ============

interface LoadedCredential {
  file_path: string;
  data: CodeBuddyCredential;
}

interface ManagerState {
  auto_rotation_enabled: boolean;
  current_index: number;
  manual_selected_index: number | null;
  manual_selected_filename: string | null;
  saved_at: number;
}

export class CodeBuddyTokenManager {
  private credsDir: string;
  private stateFile: string;
  private credentials: LoadedCredential[] = [];
  private currentIndex = 0;
  private usageCount = 0;
  private manualSelectedIndex: number | null = null;
  private autoRotationEnabled = true;
  private rotationCount: number;

  constructor(config?: Partial<CodeBuddyConfig>) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    
    // 凭证目录：支持绝对路径和相对路径
    if (path.isAbsolute(cfg.credsDir!)) {
      this.credsDir = cfg.credsDir!;
    } else {
      // 相对路径：相对于项目根目录
      this.credsDir = path.resolve(process.cwd(), cfg.credsDir!);
    }
    
    this.stateFile = path.join(this.credsDir, 'manager_state.json');
    this.rotationCount = cfg.rotationCount || 1;
    
    this.loadAllTokens();
    this.loadState();
  }

  /**
   * 加载所有凭证文件
   */
  private loadAllTokens(): void {
    this.credentials = [];
    this.currentIndex = -1;

    console.log(`[CodeBuddy] Loading credentials from: ${this.credsDir}`);

    if (!fs.existsSync(this.credsDir)) {
      fs.mkdirSync(this.credsDir, { recursive: true });
      console.log(`[CodeBuddy] Created credentials directory: ${this.credsDir}`);
      return;
    }

    const files = fs.readdirSync(this.credsDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      if (file === 'manager_state.json') continue;
      
      const filePath = path.join(this.credsDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (data.bearer_token) {
          this.credentials.push({ file_path: filePath, data });
          console.log(`[CodeBuddy] Loaded credential: ${file}`);
        } else {
          console.warn(`[CodeBuddy] Skipping invalid credential (missing bearer_token): ${file}`);
        }
      } catch (e) {
        console.error(`[CodeBuddy] Failed to load credential ${file}:`, e);
      }
    }

    console.log(`[CodeBuddy] Total credentials loaded: ${this.credentials.length}`);
  }

  /**
   * 加载保存的状态
   */
  private loadState(): void {
    try {
      if (fs.existsSync(this.stateFile)) {
        const state: ManagerState = JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
        
        // 验证手动选择的凭证是否仍然有效
        if (state.manual_selected_index !== null && 
            state.manual_selected_index >= 0 && 
            state.manual_selected_index < this.credentials.length) {
          const savedFilename = state.manual_selected_filename;
          const currentFilename = path.basename(this.credentials[state.manual_selected_index].file_path);
          if (savedFilename === currentFilename) {
            this.manualSelectedIndex = state.manual_selected_index;
            this.currentIndex = state.manual_selected_index;
          }
        }
        
        this.autoRotationEnabled = state.auto_rotation_enabled ?? true;
        
        if (this.manualSelectedIndex === null && 
            state.current_index >= 0 && 
            state.current_index < this.credentials.length) {
          this.currentIndex = state.current_index;
        }
        
        console.log(`[CodeBuddy] State loaded: auto_rotation=${this.autoRotationEnabled}, current_index=${this.currentIndex}`);
      }
    } catch (e) {
      console.warn(`[CodeBuddy] Failed to load state:`, e);
    }
  }

  /**
   * 保存状态
   */
  private saveState(): void {
    try {
      if (!fs.existsSync(this.credsDir)) {
        fs.mkdirSync(this.credsDir, { recursive: true });
      }
      
      const state: ManagerState = {
        auto_rotation_enabled: this.autoRotationEnabled,
        current_index: this.currentIndex,
        manual_selected_index: this.manualSelectedIndex,
        manual_selected_filename: this.manualSelectedIndex !== null 
          ? path.basename(this.credentials[this.manualSelectedIndex]?.file_path || '')
          : null,
        saved_at: Math.floor(Date.now() / 1000),
      };
      
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.error(`[CodeBuddy] Failed to save state:`, e);
    }
  }

  /**
   * 检查 token 是否过期
   */
  private isTokenExpired(credential: CodeBuddyCredential): boolean {
    if (!credential.created_at || !credential.expires_in) {
      return false;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const expiryTime = credential.created_at + credential.expires_in;
    const bufferTime = 300; // 提前5分钟认为过期
    
    return currentTime >= (expiryTime - bufferTime);
  }

  /**
   * 获取下一个可用凭证
   */
  getNextCredential(): CodeBuddyCredential | null {
    if (!this.credentials.length) {
      console.warn('[CodeBuddy] No credentials available');
      return null;
    }

    // 过滤掉过期的凭证
    const validIndices: number[] = [];
    for (let i = 0; i < this.credentials.length; i++) {
      if (!this.isTokenExpired(this.credentials[i].data)) {
        validIndices.push(i);
      } else {
        console.warn(`[CodeBuddy] Skipping expired credential: ${path.basename(this.credentials[i].file_path)}`);
      }
    }

    if (!validIndices.length) {
      console.error('[CodeBuddy] No valid (non-expired) credentials available');
      return null;
    }

    // 如果当前索引无效，重置到第一个有效凭证
    if (!validIndices.includes(this.currentIndex)) {
      this.currentIndex = validIndices[0];
      this.usageCount = 0;
    }

    // 如果有手动选择的凭证且未过期，优先使用
    if (this.manualSelectedIndex !== null && 
        this.manualSelectedIndex >= 0 && 
        this.manualSelectedIndex < this.credentials.length) {
      const manualCred = this.credentials[this.manualSelectedIndex];
      if (!this.isTokenExpired(manualCred.data)) {
        console.log(`[CodeBuddy] Using manually selected credential: ${path.basename(manualCred.file_path)}`);
        return manualCred.data;
      } else {
        console.warn('[CodeBuddy] Manually selected credential is expired, falling back to automatic rotation');
        this.manualSelectedIndex = null;
      }
    }

    // 检查是否需要轮换
    if (this.autoRotationEnabled && this.rotationCount > 0) {
      if (this.usageCount >= this.rotationCount) {
        const currentValidPosition = validIndices.indexOf(this.currentIndex);
        const nextValidPosition = (currentValidPosition + 1) % validIndices.length;
        this.currentIndex = validIndices[nextValidPosition];
        this.usageCount = 0;
        console.log('[CodeBuddy] Credential rotation triggered');
      }
    } else {
      // 不轮换：固定使用当前凭证
      const credential = this.credentials[this.currentIndex];
      console.log(`[CodeBuddy] Using fixed credential: ${path.basename(credential.file_path)}`);
      return credential.data;
    }

    const credential = this.credentials[this.currentIndex];
    this.usageCount++;
    
    console.log(`[CodeBuddy] Using credential: ${path.basename(credential.file_path)} (Usage: ${this.usageCount}/${this.rotationCount})`);
    return credential.data;
  }

  /**
   * 获取所有凭证信息
   */
  getCredentialsInfo(): CredentialInfo[] {
    return this.credentials.map((cred, index) => {
      const data = cred.data;
      const isExpired = this.isTokenExpired(data);
      
      let expiresAt: number | undefined;
      let timeRemaining: number | undefined;
      
      if (data.created_at && data.expires_in) {
        expiresAt = data.created_at + data.expires_in;
        timeRemaining = expiresAt - Math.floor(Date.now() / 1000);
      }

      return {
        index,
        filename: path.basename(cred.file_path),
        user_id: data.user_id || 'unknown',
        email: data.user_info?.email || data.user_id,
        name: data.user_info?.name,
        created_at: data.created_at,
        expires_in: data.expires_in,
        expires_at: expiresAt,
        time_remaining: timeRemaining,
        is_expired: isExpired,
        token_type: data.token_type || 'Bearer',
        scope: data.scope,
        domain: data.domain,
        has_refresh_token: !!data.refresh_token,
        session_state: data.session_state,
        file_path: cred.file_path,
      };
    });
  }

  /**
   * 添加凭证
   */
  addCredential(credentialData: CodeBuddyCredential, filename?: string): boolean {
    try {
      if (!filename) {
        const userId = credentialData.user_id || 'unknown';
        const timestamp = credentialData.created_at || Math.floor(Date.now() / 1000);
        const safeUserId = userId.replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 20);
        filename = `codebuddy_${safeUserId}_${timestamp}.json`;
      }
      
      if (!filename.endsWith('.json')) {
        filename += '.json';
      }
      
      const filePath = path.join(this.credsDir, filename);
      
      if (!fs.existsSync(this.credsDir)) {
        fs.mkdirSync(this.credsDir, { recursive: true });
      }
      
      if (!credentialData.created_at) {
        credentialData.created_at = Math.floor(Date.now() / 1000);
      }
      
      fs.writeFileSync(filePath, JSON.stringify(credentialData, null, 2), 'utf-8');
      console.log(`[CodeBuddy] Added new credential: ${filename}`);
      
      this.loadAllTokens();
      return true;
    } catch (e) {
      console.error('[CodeBuddy] Failed to save credential:', e);
      return false;
    }
  }

  /**
   * 删除凭证
   */
  deleteCredential(index: number): boolean {
    try {
      if (index < 0 || index >= this.credentials.length) {
        console.error(`[CodeBuddy] Invalid credential index for deletion: ${index}`);
        return false;
      }

      const filePath = this.credentials[index].file_path;
      const filename = path.basename(filePath);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[CodeBuddy] Deleted credential: ${filename}`);
      }

      this.loadAllTokens();
      
      if (this.manualSelectedIndex === index) {
        this.manualSelectedIndex = null;
      }
      
      return true;
    } catch (e) {
      console.error(`[CodeBuddy] Failed to delete credential at index ${index}:`, e);
      return false;
    }
  }

  /**
   * 手动选择凭证
   */
  setManualCredential(index: number): boolean {
    if (index >= 0 && index < this.credentials.length) {
      this.manualSelectedIndex = index;
      this.currentIndex = index;
      console.log(`[CodeBuddy] Manually selected credential: ${path.basename(this.credentials[index].file_path)}`);
      this.saveState();
      return true;
    }
    console.error(`[CodeBuddy] Invalid credential index: ${index}`);
    return false;
  }

  /**
   * 清除手动选择
   */
  clearManualSelection(): void {
    this.manualSelectedIndex = null;
    console.log('[CodeBuddy] Cleared manual selection, resumed automatic rotation');
    this.saveState();
  }

  /**
   * 切换自动轮换
   */
  toggleAutoRotation(): boolean {
    this.autoRotationEnabled = !this.autoRotationEnabled;
    console.log(`[CodeBuddy] Auto rotation: ${this.autoRotationEnabled ? 'enabled' : 'disabled'}`);
    this.saveState();
    return this.autoRotationEnabled;
  }

  /**
   * 获取凭证数量
   */
  getCount(): number {
    return this.credentials.length;
  }

  /**
   * 检查是否有有效凭证
   */
  hasValidCredential(): boolean {
    return this.credentials.some(cred => !this.isTokenExpired(cred.data));
  }
}

// ============ API 客户端 ============

/**
 * CodeBuddy API 请求头生成器
 */
function generateCodeBuddyHeaders(
  bearerToken: string,
  userId?: string,
  requestId?: string
): Record<string, string> {
  const uuid = randomUUID().replace(/-/g, '');
  
  // 判断 token 类型
  // API Key: 以 "ck_" 开头
  // Session Cookie: 包含 "|" 
  // Bearer Token (JWT): 以 "ey" 开头
  const isApiKey = bearerToken.startsWith('ck_');
  const isSessionCookie = bearerToken.includes('|');
  
  const headers: Record<string, string> = {
    'Host': 'www.codebuddy.cn',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'x-stainless-arch': 'x64',
    'x-stainless-lang': 'js',
    'x-stainless-os': 'Windows',
    'x-stainless-package-version': '5.10.1',
    'x-stainless-retry-count': '0',
    'x-stainless-runtime': 'node',
    'x-stainless-runtime-version': 'v22.13.1',
    'X-Conversation-ID': randomUUID(),
    'X-Conversation-Request-ID': crypto.randomBytes(16).toString('hex'),
    'X-Conversation-Message-ID': uuid,
    'X-Request-ID': requestId || uuid,
    'X-Agent-Intent': 'craft',
    'X-IDE-Type': 'CLI',
    'X-IDE-Name': 'CLI',
    'X-IDE-Version': '1.0.7',
    'X-Domain': 'www.codebuddy.cn',
    'User-Agent': 'CLI/1.0.7 CodeBuddy/1.0.7',
    'X-Product': 'SaaS',
    'X-User-Id': userId || 'b5be3a67-237e-4ee6-9b9a-0b9ecd7b454b',
  };
  
  // 根据 token 类型选择认证方式
  if (isApiKey) {
    // API Key 认证
    headers['Authorization'] = `Bearer ${bearerToken}`;
  } else if (isSessionCookie) {
    // Session Cookie 认证
    headers['Cookie'] = `session=${bearerToken}`;
  } else {
    // Bearer Token (JWT) 认证
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }
  
  return headers;
}

/**
 * 消息格式转换：OpenAI -> CodeBuddy
 */
function convertMessages(messages: any[]): any[] {
  const converted: any[] = [];
  
  // CodeBuddy 要求至少2条消息，如果只有1条用户消息，添加系统消息
  let filteredMessages = messages.filter(msg => {
    // 跳过包含 API 错误信息的助手消息
    if (msg.role === 'assistant' && 
        typeof msg.content === 'string' && 
        (msg.content.includes('Error: API error') || msg.content.includes('API error:'))) {
      return false;
    }
    return true;
  });
  
  if (filteredMessages.length === 1 && filteredMessages[0].role === 'user') {
    filteredMessages.unshift({
      role: 'system',
      content: 'You are a helpful assistant.',
    });
  }
  
  for (const msg of filteredMessages) {
    const role = msg.role === 'tool' ? 'user' : msg.role;
    let content = msg.content;
    
    // 处理内容
    if (Array.isArray(content)) {
      const hasToolContent = content.some(item => 
        item?.type === 'tool_result' || item?.type === 'tool_use'
      );
      
      if (hasToolContent) {
        // 包含工具调用，保持结构化
        const processedContent = content.map(item => {
          if (item?.type === 'tool_result') {
            return {
              type: 'tool_result',
              toolUseId: item.toolUseId || item.tool_use_id || `tool_${randomUUID().substring(0, 8)}`,
              content: item.content || item.text || '',
            };
          }
          if (item?.type === 'tool_use') {
            return {
              type: 'tool_use',
              id: item.id || `tool_${randomUUID().substring(0, 8)}`,
              name: item.name || '',
              input: item.input || {},
            };
          }
          return item;
        });
        
        converted.push({ role, content: processedContent });
      } else {
        // 普通内容，转为字符串
        const textParts = content
          .filter((item: any) => item?.type === 'text')
          .map((item: any) => item.text || '')
          .join('');
        converted.push({ role, content: textParts || '' });
      }
    } else if (typeof content === 'string') {
      converted.push({ role, content });
    } else {
      converted.push({ role, content: String(content || '') });
    }
  }
  
  return converted;
}

// ============ 主类 ============

export class CodeBuddyNative {
  private tokenManager: CodeBuddyTokenManager;
  private apiEndpoint: string;
  private availableModels: string[];
  private defaultModel: string;

  constructor(config?: Partial<CodeBuddyConfig>) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    
    this.tokenManager = new CodeBuddyTokenManager(cfg);
    this.apiEndpoint = cfg.apiEndpoint || DEFAULT_CONFIG.apiEndpoint!;
    this.availableModels = (cfg.models || DEFAULT_CONFIG.models || '').split(',').map(m => m.trim());
    this.defaultModel = cfg.defaultModel || DEFAULT_CONFIG.defaultModel || 'auto';
  }

  /**
   * 聊天补全 (非流式)
   * @param messages 消息列表
   * @param model 模型名称，不指定则使用环境变量 CODEBUDDY_MODEL 或默认 auto
   */
  async chat(messages: any[], model?: string): Promise<string> {
    const selectedModel = model || this.defaultModel;
    console.log(`[CodeBuddy] chat() using model: ${selectedModel} (env: ${process.env.CODEBUDDY_MODEL || 'not set'})`);
    
    const credential = this.tokenManager.getNextCredential();
    if (!credential) {
      throw new Error('No valid CodeBuddy credential available');
    }

    const codebuddyMessages = convertMessages(messages);
    const requestId = randomUUID().replace(/-/g, '');
    
    const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: generateCodeBuddyHeaders(credential.bearer_token, credential.user_id, requestId),
      body: JSON.stringify({
        model: selectedModel,
        messages: codebuddyMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CodeBuddy API error: ${response.status} - ${errorText}`);
    }

    // 流式响应 - 收集所有内容
    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) fullContent += content;
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  /**
   * 聊天补全 (流式)
   * @param messages 消息列表
   * @param model 模型名称，不指定则使用环境变量 CODEBUDDY_MODEL 或默认 auto
   */
  async *chatStream(messages: any[], model?: string): AsyncGenerator<string, void, unknown> {
    const selectedModel = model || this.defaultModel;
    console.log(`[CodeBuddy] chatStream() using model: ${selectedModel} (env: ${process.env.CODEBUDDY_MODEL || 'not set'})`);
    
    const credential = this.tokenManager.getNextCredential();
    if (!credential) {
      throw new Error('No valid CodeBuddy credential available');
    }

    const codebuddyMessages = convertMessages(messages);
    const requestId = randomUUID().replace(/-/g, '');
    
    const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: generateCodeBuddyHeaders(credential.bearer_token, credential.user_id, requestId),
      body: JSON.stringify({
        model: selectedModel,
        messages: codebuddyMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`CodeBuddy API error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || parsed.delta?.content || '';
              if (content) {
                yield content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 获取可用模型列表
   */
  getModels(): string[] {
    return [...this.availableModels];
  }

  /**
   * 获取凭证管理器
   */
  getTokenManager(): CodeBuddyTokenManager {
    return this.tokenManager;
  }

  /**
   * 检查是否有有效凭证
   */
  hasCredentials(): boolean {
    return this.tokenManager.hasValidCredential();
  }

  /**
   * 获取凭证数量
   */
  getCredentialCount(): number {
    return this.tokenManager.getCount();
  }

  /**
   * 获取当前默认模型
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
}

// ============ 单例 ============

let instance: CodeBuddyNative | null = null;

export function getCodeBuddyNative(config?: Partial<CodeBuddyConfig>): CodeBuddyNative {
  if (!instance) {
    instance = new CodeBuddyNative(config);
  }
  return instance;
}

// ============ 凭证路径辅助函数 ============

/**
 * 获取凭证目录路径
 */
export function getCredentialsDir(customPath?: string): string {
  if (customPath && path.isAbsolute(customPath)) {
    return customPath;
  }
  return path.resolve(process.cwd(), customPath || DEFAULT_CONFIG.credsDir!);
}

/**
 * 检查凭证目录是否存在
 */
export function hasCredentialsDir(customPath?: string): boolean {
  return fs.existsSync(getCredentialsDir(customPath));
}
