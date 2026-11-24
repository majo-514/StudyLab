export const limit = 2 * Math.log(2);
export function series(length:number) {
  if (!Number.isInteger(length) || length < 1 || length > 200) throw RangeError('近邻数须为 1 至 200 的整数');
  let sum = 0;
  return Array.from({length}, (_, index) => {
    const n = index + 1;
    const term = (n % 2 ? 2 : -2) / n;
    sum += term;
    return {n,term,sum,error:Math.abs(sum-limit),bound:2/(n+1)};
  });
}
