export function varint(n) {
  let v = BigInt(n); const bytes = [];
  do { let b = Number(v & 127n); v >>= 7n; bytes.push(b | (v ? 128 : 0)); } while (v);
  return Buffer.from(bytes);
}
export const num = (field, value) => Buffer.concat([varint(field * 8), varint(value)]);
export const msg = (field, ...parts) => { const b = Buffer.concat(parts); return Buffer.concat([varint(field * 8 + 2), varint(b.length), b]); };
export function generation({ input = 1000, cached = 3000, output = 200, thinking = 50, response = 150, wait = 2, stream = 4, limit = 200000 } = {}) {
  const duration = (field, seconds) => msg(field, num(1, Math.floor(seconds)), num(2, Math.round((seconds % 1) * 1e9)));
  return msg(1, msg(4, num(2, input), num(3, output), num(5, cached), num(9, thinking), num(10, response)), msg(9, msg(10, num(4, limit))), duration(11, wait), duration(12, stream));
}
