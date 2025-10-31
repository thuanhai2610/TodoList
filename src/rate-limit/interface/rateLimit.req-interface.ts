import { IncomingHttpHeaders } from 'http';

export interface ReqHttpRateLimit {
  ip?: string;
  headers?: IncomingHttpHeaders;
}

export interface WsClientRateLimit {
  handshake?: {
    headers?: {
      'cf-connecting-ip'?: string;
    };
    address?: string;
  };
  request?: {
    headers?: {
      'cf-connecting-ip'?: string;
    };
  };
}
