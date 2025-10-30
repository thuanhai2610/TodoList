import { RateLimitConfig } from './rate-interface';

export const RATE_LIMIT_CONFIG: RateLimitConfig = {
  TTL: 10000,
  LIMIT: 10,
  BLOCK_DURATION: 15 * 1000,
  MAX_HTTP_BODY_SIZE: '100kb',
  MAX_URL_BYTES: 2048,
  MAX_WS_MESSAGE_BYTES: 4096,
};
