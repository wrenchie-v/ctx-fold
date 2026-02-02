import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextStore } from './entities/context.entity';

export interface StoreContextParams {
  sessionId?: string;
  originalPrompt: string;
  modifiedPrompt: string;
  context?: string;
  response: string;
  sumResponse: string;
  promptTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
  model?: string;
  latencyMs?: number;
}

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  constructor(
    @InjectRepository(ContextStore)
    private contextRepo: Repository<ContextStore>,
  ) {}

  async storeContext(params: StoreContextParams): Promise<ContextStore> {
    const record = this.contextRepo.create({
      sessionId: params.sessionId,
      originalPrompt: params.originalPrompt,
      modifiedPrompt: params.modifiedPrompt,
      context: params.context,
      response: params.response,
      sumResponse: params.sumResponse,
      promptTokens: params.promptTokens || 0,
      responseTokens: params.responseTokens || 0,
      totalTokens: params.totalTokens || 0,
      model: params.model,
      latencyMs: params.latencyMs || 0,
    });

    const saved = await this.contextRepo.save(record);
    this.logger.log(`Stored context: ${saved.id}`);
    return saved;
  }

  async getContextBySession(sessionId: string): Promise<ContextStore[]> {
    return this.contextRepo.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }

  async getContextById(id: string): Promise<ContextStore | null> {
    return this.contextRepo.findOne({ where: { id } });
  }

  async getRecentContexts(limit = 10): Promise<ContextStore[]> {
    return this.contextRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get only the LATEST summarized response for a session
   * This is used as context for the next prompt
   */
  async getLatestSummarizedContext(sessionId: string): Promise<string> {
    const latest = await this.contextRepo.findOne({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });

    if (!latest || !latest.sumResponse) {
      return '';
    }

    return latest.sumResponse;
  }

  /**
   * Get all summarized responses combined as context for next prompt
   */
  async getAllSummarizedContext(sessionId: string): Promise<string> {
    const contexts = await this.getContextBySession(sessionId);
    if (!contexts.length) return '';

    return contexts
      .map((c) => c.sumResponse)
      .filter(Boolean)
      .join('\n---\n');
  }
}
