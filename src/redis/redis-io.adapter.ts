import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type Redis from 'ioredis';
import type { ServerOptions } from 'socket.io';
import { REDIS, attachRedisLogging } from './redis.module';

/** Socket.IO adapter backed by Redis pub/sub so events fan out across instances. */
export class RedisIoAdapter extends IoAdapter {
  private readonly adapter: ReturnType<typeof createAdapter>;

  constructor(app: INestApplication) {
    super(app);
    const pub = app.get<Redis>(REDIS);
    const sub = attachRedisLogging(pub.duplicate(), 'RedisSub');
    this.adapter = createAdapter(pub, sub);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapter);
    return server;
  }
}
