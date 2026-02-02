import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ContextService } from '../context/context.service';
import {
  PromptRequestDto,
  LlmResponseDto,
  PromptResponseDto,
} from './dto/prompt.dto';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly httpClient: AxiosInstance;
  private readonly lmStudioUrl: string;
  private readonly defaultModel: string;

  // System message for JSON format and high-compression summarization
  private readonly systemPrompt = `You are a helpful assistant. You MUST always respond in valid JSON format with exactly two keys:

1. "response" - Your complete, detailed answer to the user's query
2. "summarized_response" - A highly compressed representation of the conversation

CRITICAL INSTRUCTIONS FOR summarized_response:
- If NO [PREVIOUS CONTEXT] is provided: compress ONLY your new response
- If [PREVIOUS CONTEXT] IS provided: MERGE the previous context with your new response into ONE compressed summary
- This creates a ROLLING summary of the entire conversation history
- Compress with maximum precision using the lowest token count possible
- The compression must be LOSSLESS - if this summarized data is given back to an LLM, it should recreate the full conversation context
- Use ANY format: abbreviations, symbols, structured notation, key-value pairs, shorthand, etc.
- Prioritize information density over readability
- Strip all fluff, keep only essential semantic content

RESPONSE FORMAT (strictly follow):
{"response": "your full detailed response", "summarized_response": "actual compressed content here"}

Do not include any text outside this JSON object.`;

  constructor(
    private configService: ConfigService,
    private contextService: ContextService,
  ) {
    this.lmStudioUrl = this.configService.get<string>(
      'LM_STUDIO_URL',
      'http://localhost:1234/v1/chat/completions',
    );
    this.defaultModel = this.configService.get<string>(
      'LM_STUDIO_MODEL',
      'local-model',
    );

    this.httpClient = axios.create({
      timeout: 120000, // 2 min timeout for LLM
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Builds user prompt with optional previous context injection
   */
  private buildUserPrompt(originalPrompt: string, context?: string): string {
    if (!context) {
      return originalPrompt;
    }

    return `[PREVIOUS CONTEXT]
${context}
[END CONTEXT]

${originalPrompt}`;
  }

  /**
   * Parses the LLM response to extract structured output
   */
  private parseStructuredResponse(rawResponse: string): LlmResponseDto {
    try {
      // Try direct JSON parse first
      const parsed = JSON.parse(rawResponse.trim());
      if (parsed.response && parsed.summarized_response) {
        return {
          response: parsed.response,
          summarized_response: parsed.summarized_response,
        };
      }
    } catch {
      // Try to extract JSON from response
      const jsonMatch = rawResponse.match(
        /\{[\s\S]*"response"[\s\S]*"summarized_response"[\s\S]*\}/,
      );
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            response: parsed.response || '',
            summarized_response: parsed.summarized_response || '',
          };
        } catch {
          // fallback
        }
      }
    }

    // Fallback: use raw response for both
    this.logger.warn('Could not parse structured response, using fallback');
    const summary =
      rawResponse.length > 200
        ? rawResponse.substring(0, 200) + '...'
        : rawResponse;

    return {
      response: rawResponse,
      summarized_response: summary,
    };
  }

  /**
   * Calls LM Studio with system message and user prompt
   */
  async callLlm(request: PromptRequestDto): Promise<PromptResponseDto> {
    const startTime = Date.now();

    // Get LATEST summarized context for this session (only most recent one)
    let existingContext = request.context || '';
    if (request.sessionId && !existingContext) {
      existingContext = await this.contextService.getLatestSummarizedContext(
        request.sessionId,
      );
    }

    // Build user prompt with context injection
    const userPrompt = this.buildUserPrompt(request.prompt, existingContext);

    // Build messages array with system message first
    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      ...(request.history || []),
      { role: 'user' as const, content: userPrompt },
    ];

    this.logger.log(`Calling LM Studio: ${this.lmStudioUrl}`);

    try {
      const requestBody = {
        model: request.model || this.defaultModel,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      };

      const response = await this.httpClient.post(
        this.lmStudioUrl,
        requestBody,
      );

      const latencyMs = Date.now() - startTime;
      const choice = response.data.choices?.[0];
      const rawContent = choice?.message?.content || '';
      const usage = response.data.usage || {};

      // Parse structured response
      const structured = this.parseStructuredResponse(rawContent);

      // Store in database
      const stored = await this.contextService.storeContext({
        sessionId: request.sessionId,
        originalPrompt: request.prompt,
        modifiedPrompt: userPrompt,
        context: existingContext,
        response: structured.response,
        sumResponse: structured.summarized_response,
        promptTokens: usage.prompt_tokens || 0,
        responseTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        model: request.model || this.defaultModel,
        latencyMs,
      });

      return {
        id: stored.id,
        response: structured.response,
        sumResponse: structured.summarized_response,
        model: request.model || this.defaultModel,
        latencyMs,
        tokens: {
          prompt: usage.prompt_tokens || 0,
          response: usage.completion_tokens || 0,
          total: usage.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error('LM Studio call failed:', error.message);
      throw new Error(`LLM call failed: ${error.message}`);
    }
  }

  /**
   * Health check for LM Studio connection
   */
  async healthCheck(): Promise<{ status: string; url: string }> {
    try {
      // LM Studio models endpoint
      await this.httpClient.get(
        this.lmStudioUrl.replace('/chat/completions', '/models'),
      );
      return { status: 'connected', url: this.lmStudioUrl };
    } catch {
      return { status: 'disconnected', url: this.lmStudioUrl };
    }
  }
}
