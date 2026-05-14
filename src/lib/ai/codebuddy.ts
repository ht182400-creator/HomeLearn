/**
 * CodeBuddy AI 适配器 - 内置实现
 * 使用 Node.js 原生调用 CodeBuddy API，无需启动独立的 codebuddy2api 服务
 * 
 * 支持的模型: auto-chat, deepseek-v4-flash, glm-5.1, kimi-k2.6 等
 * 凭证存储在 .codebuddy_creds 目录（与 codebuddy2api 兼容）
 */

import { CodeBuddyNative, getCodeBuddyNative, CODEBUDDY_MODELS } from '../codebuddy/codebuddy-native';

// CodeBuddy 支持的模型列表
export { CODEBUDDY_MODELS };

export type CodeBuddyModel = typeof CODEBUDDY_MODELS[number];

interface CodeBuddyConfig {
  credsDir?: string;           // 凭证目录，默认 .codebuddy_creds
  rotationCount?: number;       // 轮换次数，默认 1
  apiEndpoint?: string;         // CodeBuddy API 端点
  models?: string;             // 可用模型列表
}

export class CodeBuddyAdapter {
  private client: CodeBuddyNative;
  private model: CodeBuddyModel;

  constructor(config?: CodeBuddyConfig) {
    this.client = getCodeBuddyNative({
      credsDir: config?.credsDir,
      rotationCount: config?.rotationCount,
      apiEndpoint: config?.apiEndpoint,
      models: config?.models,
    });
    this.model = (config?.models?.split(',')[0]?.trim() as CodeBuddyModel) || 'auto';
  }

  /**
   * 聊天补全 (非流式)
   */
  async chat(messages: any[]): Promise<string> {
    return this.client.chat(messages, this.model);
  }

  /**
   * 聊天补全 (流式)
   */
  async *chatStream(messages: any[]): AsyncGenerator<string, void, unknown> {
    yield* this.client.chatStream(messages, this.model);
  }

  /**
   * 获取适配器名称
   */
  getName(): string {
    return 'CodeBuddy Craft (Native)';
  }

  /**
   * 获取当前模型
   */
  getModel(): CodeBuddyModel {
    return this.model;
  }

  /**
   * 检查是否有有效凭证
   */
  hasCredentials(): boolean {
    return this.client.hasCredentials();
  }

  /**
   * 获取凭证数量
   */
  getCredentialCount(): number {
    return this.client.getCredentialCount();
  }
}

/**
 * 创建 CodeBuddy 适配器实例
 */
export function createCodeBuddyAdapter(): CodeBuddyAdapter | null {
  // 从环境变量读取配置
  const credsDir = process.env.CODEBUDDY_CREDS_DIR || '.codebuddy_creds';
  const apiEndpoint = process.env.CODEBUDDY_API_ENDPOINT || 'https://www.codebuddy.cn/v2';
  const model = (process.env.CODEBUDDY_MODEL as CodeBuddyModel) || 'auto';
  const rotationCount = parseInt(process.env.CODEBUDDY_ROTATION_COUNT || '1', 10);
  const models = process.env.CODEBUDDY_MODELS;

  // 检查是否显式禁用了 CodeBuddy
  const explicitlyDisabled = process.env.CODEBUDDY_ENABLED === 'false';

  // 如果显式禁用，则不启用
  if (explicitlyDisabled) {
    console.log('[CodeBuddy] CodeBuddy is explicitly disabled (CODEBUDDY_ENABLED=false)');
    return null;
  }

  // 验证模型是否有效
  const validModel = CODEBUDDY_MODELS.includes(model as any) ? model : 'auto';

  const adapter = new CodeBuddyAdapter({
    credsDir,
    rotationCount,
    apiEndpoint,
    models: models || validModel,
  });

  // 检查是否有有效凭证
  if (!adapter.hasCredentials()) {
    console.warn('[CodeBuddy] No valid credentials found in .codebuddy_creds directory');
    console.warn('[CodeBuddy] Please add credentials using: node scripts/add-codebuddy-credential.js');
    return null;
  }

  console.log(`[CodeBuddy] Adapter initialized with ${adapter.getCredentialCount()} credential(s)`);
  return adapter;
}
