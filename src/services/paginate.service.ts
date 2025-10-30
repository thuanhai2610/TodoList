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
