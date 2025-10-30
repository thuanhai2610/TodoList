import { UnauthorizedException } from '@nestjs/common';
import {
  ReqHttpRateLimit,
  WsClientRateLimit,
} from 'src/rate-limit/rateLimit.req-interface';

export function getHttpIp(req: ReqHttpRateLimit): string {
  const cfIp =
    req.headers?.['cf-connecting-ip'] || req.headers?.['CF-Connecting-IP'];
  if (cfIp && typeof cfIp === 'string') {
    return cfIp;
  }
  if (cfIp) throw new UnauthorizedException('Ip is undefined');
  if (req.ip) {
    return req.ip;
  }

  return 'unknown';
}

export function getWsIp(client: WsClientRateLimit): string {
  const handshakeHeaders = client.handshake?.headers;
  if (handshakeHeaders) {
    const cfIp =
      handshakeHeaders['cf-connecting-ip'] ||
      handshakeHeaders['CF-Connecting-IP'];
    if (cfIp) {
      return cfIp;
    }
  }
  if (client.handshake?.address) {
    return client.handshake.address;
  }
  return 'unknown';
}
