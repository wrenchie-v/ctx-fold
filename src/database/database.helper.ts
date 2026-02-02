import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHelper implements OnModuleInit {
  private readonly logger = new Logger(DatabaseHelper.name);

  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    await this.checkConnection();
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (this.dataSource.isInitialized) {
        this.logger.log('✅ Database connection established');
        return true;
      }
      await this.dataSource.initialize();
      this.logger.log('✅ Database connection initialized');
      return true;
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async executeRawQuery<T>(query: string, params?: any[]): Promise<T> {
    return this.dataSource.query(query, params);
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }
}
