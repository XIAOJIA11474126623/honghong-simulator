export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIInvokeOptions {
  model?: string;
  timeout?: number;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
}

export interface AIInvokeResult {
  content: string;
  usage?: AIUsage;
}

export interface AIProviderError {
  code: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
}

export interface AIProvider {
  invoke(messages: AIMessage[], options?: AIInvokeOptions): Promise<AIInvokeResult>;
}
