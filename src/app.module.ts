import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { LlmModule } from './llm/llm.module';
import { ContextModule } from './context/context.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ContextModule,
    LlmModule,
  ],
})
export class AppModule {}
