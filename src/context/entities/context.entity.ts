import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('context_store')
export class ContextStore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  sessionId: string;

  @Column({ type: 'text' })
  originalPrompt: string;

  @Column({ type: 'text' })
  modifiedPrompt: string;

  @Column({ type: 'longtext', nullable: true })
  context: string;

  @Column({ type: 'longtext' })
  response: string;

  @Column({ type: 'text' })
  sumResponse: string;

  @Column({ type: 'int', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', default: 0 })
  responseTokens: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string;

  @Column({ type: 'float', default: 0 })
  latencyMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
