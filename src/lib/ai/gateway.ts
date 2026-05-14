/**
 * AI 网关 - 多适配器模式
 * 支持 DeepSeek、通义千问、智谱GLM、CodeBuddy Native 自动切换
 * 
 * CodeBuddy 现在使用内置实现，无需启动独立的 codebuddy2api 服务
 */

import OpenAI from 'openai';
import { CodeBuddyAdapter, createCodeBuddyAdapter } from './codebuddy';

// AI 适配器接口
interface AIAdapter {
  name: string;
  enabled: boolean;
  weight: number;
  client?: OpenAI;
  codebuddyAdapter?: CodeBuddyAdapter;
}

// 可用模型列表
const AI_MODELS = {
  deepseek: {
    name: 'DeepSeek Chat',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  dashscope: {
    name: 'Tongyi Qianwen',
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-turbo',
  },
  zhipu: {
    name: 'Zhipu GLM',
    apiKey: process.env.ZHIPU_API_KEY || '',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
  },
} as const;

type AIModelKey = keyof typeof AI_MODELS;

class AIGateway {
  private adapters: Map<string, AIAdapter> = new Map();
  private cache: Map<string, { result: string; expires: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    this.initAdapters();
  }

  private initAdapters() {
    // 初始化 DeepSeek (主力)
    if (AI_MODELS.deepseek.apiKey) {
      this.adapters.set('deepseek', {
        name: AI_MODELS.deepseek.name,
        enabled: true,
        weight: 5,
        client: new OpenAI({
          apiKey: AI_MODELS.deepseek.apiKey,
          baseURL: AI_MODELS.deepseek.baseURL,
        }),
      });
      console.log('[AI Gateway] DeepSeek adapter initialized');
    }

    // 初始化通义千问 (备选1)
    if (AI_MODELS.dashscope.apiKey) {
      this.adapters.set('dashscope', {
        name: AI_MODELS.dashscope.name,
        enabled: true,
        weight: 3,
        client: new OpenAI({
          apiKey: AI_MODELS.dashscope.apiKey,
          baseURL: AI_MODELS.dashscope.baseURL,
        }),
      });
      console.log('[AI Gateway] Tongyi Qianwen adapter initialized');
    }

    // 初始化智谱GLM (备选2)
    if (AI_MODELS.zhipu.apiKey) {
      this.adapters.set('zhipu', {
        name: AI_MODELS.zhipu.name,
        enabled: true,
        weight: 2,
        client: new OpenAI({
          apiKey: AI_MODELS.zhipu.apiKey,
          baseURL: AI_MODELS.zhipu.baseURL,
        }),
      });
      console.log('[AI Gateway] Zhipu GLM adapter initialized');
    }

    // 初始化 CodeBuddy Native (内置实现，无需外部服务)
    const codebuddyAdapter = createCodeBuddyAdapter();
    if (codebuddyAdapter) {
      this.adapters.set('codebuddy', {
        name: codebuddyAdapter.getName(),
        enabled: true,
        weight: 4,
        codebuddyAdapter: codebuddyAdapter,
      });
      console.log('[AI Gateway] CodeBuddy Native adapter initialized');
    }

    // 如果没有可用适配器，输出警告
    if (this.adapters.size === 0) {
      console.warn('[AI Gateway] No AI adapter available! Please configure at least one AI provider.');
    }
  }

  /**
   * 智能选择适配器 (加权随机)
   */
  private selectAdapter(): AIAdapter | null {
    const available = [...this.adapters.entries()]
      .filter(([, adapter]) => adapter.enabled);

    if (available.length === 0) return null;

    const totalWeight = available.reduce((sum, [, adapter]) => sum + adapter.weight, 0);
    let random = Math.random() * totalWeight;

    for (const [, adapter] of available) {
      random -= adapter.weight;
      if (random <= 0) return adapter;
    }

    return available[0][1];
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(messages: any[]): string {
    return JSON.stringify(messages);
  }

  /**
   * 获取缓存
   */
  private getFromCache(key: string): string | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, result: string): void {
    this.cache.set(key, {
      result,
      expires: Date.now() + this.cacheTTL,
    });
  }

  /**
   * 获取模型名称
   */
  private getModelName(adapterKey: string): string {
    return AI_MODELS[adapterKey as AIModelKey]?.model || 'unknown';
  }

  /**
   * 判断是否为 CodeBuddy 适配器
   */
  private isCodeBuddyAdapter(adapter: AIAdapter): boolean {
    return !!adapter.codebuddyAdapter;
  }

  /**
   * 聊天补全 (非流式)
   */
  async chat(messages: any[]): Promise<{
    content: string;
    adapter: string;
    cached: boolean;
  }> {
    // 检查缓存
    const cacheKey = this.getCacheKey(messages);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { content: cached, adapter: 'cache', cached: true };
    }

    // 选择适配器
    const adapter = this.selectAdapter();
    if (!adapter) {
      throw new Error('No AI adapter available');
    }

    try {
      let content: string;

      if (this.isCodeBuddyAdapter(adapter)) {
        // CodeBuddy Native 适配器
        content = await adapter.codebuddyAdapter!.chat(messages);
      } else {
        // OpenAI 兼容适配器
        const model = this.getModelName([...this.adapters.entries()]
          .find(([, a]) => a === adapter)?.[0] || '');
        const response = await adapter.client!.chat.completions.create({
          model: model,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        });
        content = response.choices[0]?.message?.content || '';
      }

      // 缓存结果
      this.setCache(cacheKey, content);

      return { content, adapter: adapter.name, cached: false };
    } catch (error) {
      console.error(`[AI Gateway] Adapter ${adapter.name} failed:`, error);
      
      // 禁用失败的适配器
      adapter.enabled = false;
      
      // 尝试下一个适配器
      return this.chat(messages);
    }
  }

  /**
   * 聊天补全 (流式)
   */
  async *chatStream(
    messages: any[]
  ): AsyncGenerator<string, void, unknown> {
    const adapter = this.selectAdapter();
    if (!adapter) {
      throw new Error('No AI adapter available');
    }

    try {
      if (this.isCodeBuddyAdapter(adapter)) {
        // CodeBuddy Native 适配器 (流式)
        yield* adapter.codebuddyAdapter!.chatStream(messages);
      } else {
        // OpenAI 兼容适配器 (流式)
        const model = this.getModelName([...this.adapters.entries()]
          .find(([, a]) => a === adapter)?.[0] || '');
        const stream = await adapter.client!.chat.completions.create({
          model: model,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            yield content;
          }
        }
      }
    } catch (error) {
      console.error(`[AI Gateway] Stream adapter ${adapter.name} failed:`, error);
      adapter.enabled = false;
      yield* this.chatStream(messages);
    }
  }

  /**
   * 获取可用适配器状态
   */
  getStatus(): { name: string; enabled: boolean; weight: number }[] {
    return [...this.adapters.entries()].map(([key, adapter]) => ({
      name: adapter.name,
      enabled: adapter.enabled,
      weight: adapter.weight,
    }));
  }

  /**
   * 重置适配器状态
   */
  resetAdapters(): void {
    for (const [, adapter] of this.adapters) {
      adapter.enabled = true;
    }
  }
}

// 导出单例
export const aiGateway = new AIGateway();

// 导出类型
export type { AIAdapter };
