import { BadRequestException } from '@nestjs/common';

export const toNumber = (value: number, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const getPagination = (
  page: number = 1,
  limit: number = 10,
): { pageNum: number; limitNum: number; skip: number; take: number } => {
  const pageNum = Math.max(1, toNumber(page, 1));
  const limitNum = Math.max(1, Math.min(100, toNumber(limit, 10)));
  const skip = (pageNum - 1) * limitNum;
  const take = limitNum;
  return { pageNum, limitNum, skip, take };
};

export const getDuration = (input?: string): string | undefined => {
  const base = new Date();
  if (!input) return base.toISOString();
  const createdAt = new Date();
  const dur = input.toLowerCase();
  const time = new Date(createdAt);

  const day = parseInt(dur.match(/(\d+)d/)?.[1] ?? '0');
  const hour = parseInt(dur.match(/(\d+)h/)?.[1] ?? '0');
  const min = parseInt(dur.match(/(\d+)m/)?.[1] ?? '0');
  if (day + hour + min === 0 && isNaN(Date.parse(dur)))
    throw new BadRequestException('Invalid duration (1h, 1d, 1d15m)');

  time.setDate(time.getDate() + day);
  time.setHours(time.getHours() + hour);
  time.setMinutes(time.getMinutes() + min);
  return time.toISOString();
};
