import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import {
  ReqHttpRateLimit,
  WsClientRateLimit,
} from 'src/rate-limit/rateLimit.req-interface';
import { getHttpIp, getWsIp } from 'src/rate-limit/rateLimit.utils';

@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(
    req: Record<string, object | string>,
  ): Promise<string> {
    return Promise.resolve(getHttpIp(req as ReqHttpRateLimit));
  }

  override async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, generateKey } =
      requestProps;

    const client = context.switchToWs().getClient<WsClientRateLimit>();
    const tracker = getWsIp(client);
    const namespace = throttler.name ?? '';
    const key = generateKey(context, tracker, namespace);

    const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
      await this.storageService.increment(
        key,
        ttl,
        limit,
        blockDuration,
        namespace,
      );

    if (isBlocked) {
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      });
    }
    return true;
  }
}
