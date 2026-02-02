import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContextStore } from './entities/context.entity';
import { ContextService } from './context.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContextStore])],
  providers: [ContextService],
  exports: [ContextService],
})
export class ContextModule {}
