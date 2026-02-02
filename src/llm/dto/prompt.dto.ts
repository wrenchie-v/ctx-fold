import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageDto {
  @IsString()
  role: 'system' | 'user' | 'assistant';

  @IsString()
  content: string;
}

export class PromptRequestDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  history?: MessageDto[];

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  temperature?: number;

  @IsOptional()
  maxTokens?: number;
}

export class LlmResponseDto {
  response: string;
  summarized_response: string;
}

export class PromptResponseDto {
  id: string;
  response: string;
  sumResponse: string;
  model: string;
  latencyMs: number;
  tokens: {
    prompt: number;
    response: number;
    total: number;
  };
}
