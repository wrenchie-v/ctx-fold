import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseHelper } from './database.helper';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'ctxuser'),
        password: configService.get<string>('DB_PASSWORD', 'ctxpass123'),
        database: configService.get<string>('DB_DATABASE', 'ctx_fold_db'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true, // disable in production
        logging: ['error', 'warn'],
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),
  ],
  providers: [DatabaseHelper],
  exports: [DatabaseHelper],
})
export class DatabaseModule {}
