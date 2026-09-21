import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

/** ioredis emits 'error' on every failed reconnect; without a listener it spams the log. */
export function attachRedisLogging(client: Redis, name: string) {
  const logger = new Logger(name);
  let lastMessage = '';
  client.on('error', (err) => {
    // log a repeated error once instead of on every retry
    if (err.message === lastMessage) return;
    lastMessage = err.message;
    logger.error(err.message);
  });
  client.on('ready', () => {
    lastMessage = '';
    logger.log('connected');
  });
  return client;
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        attachRedisLogging(
          new Redis(config.getOrThrow<string>('REDIS_URL')),
          'Redis',
        ),
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
