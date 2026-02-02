import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LlmService } from './llm.service';
import { ContextService } from '../context/context.service';
import { DatabaseHelper } from '../database/database.helper';
import { PromptRequestDto, PromptResponseDto } from './dto/prompt.dto';

@Controller('api')
export class LlmController {
  constructor(
    private readonly llmService: LlmService,
    private readonly contextService: ContextService,
    private readonly dbHelper: DatabaseHelper,
  ) {}

  /**
   * Main endpoint for LLM prompts with context compression
   */
  @Post('prompt')
  @HttpCode(HttpStatus.OK)
  async prompt(@Body() request: PromptRequestDto): Promise<PromptResponseDto> {
    return this.llmService.callLlm(request);
  }

  /**
   * Get context history for a session
   */
  @Get('context/session/:sessionId')
  async getSessionContext(@Param('sessionId') sessionId: string) {
    const contexts = await this.contextService.getContextBySession(sessionId);
    return {
      sessionId,
      count: contexts.length,
      contexts: contexts.map((c) => ({
        id: c.id,
        prompt: c.originalPrompt,
        response: c.response,
        sumResponse: c.sumResponse,
        createdAt: c.createdAt,
      })),
    };
  }

  /**
   * Get latest compressed context for a session (used for next prompt)
   */
  @Get('context/compressed/:sessionId')
  async getCompressedContext(@Param('sessionId') sessionId: string) {
    const latest = await this.contextService.getLatestSummarizedContext(sessionId);
    return {
      sessionId,
      latestCompressedContext: latest,
    };
  }

  /**
   * Get a specific context record
   */
  @Get('context/:id')
  async getContext(@Param('id') id: string) {
    return this.contextService.getContextById(id);
  }

  /**
   * Get recent context records
   */
  @Get('contexts')
  async getRecentContexts(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.contextService.getRecentContexts(limitNum);
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async health() {
    const [dbHealth, llmHealth] = await Promise.all([
      this.dbHelper.healthCheck(),
      this.llmService.healthCheck(),
    ]);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        llm: llmHealth,
      },
    };
  }
}
