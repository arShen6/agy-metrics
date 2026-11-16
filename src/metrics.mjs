// Original implementation. Wire-field compatibility notes: docs/protocol.md.
function fields(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error('Invalid protobuf bytes');
  const result = new Map(); let offset = 0;
  const integer = () => {
    let value = 0n;
    for (let shift = 0n; shift < 70n; shift += 7n) {
      if (offset >= bytes.length) throw new Error('Truncated protobuf varint');
      const byte = bytes[offset++]; value |= BigInt(byte & 127) << shift;
      if (!(byte & 128)) {
        if (value > 18446744073709551615n) throw new Error('Oversized protobuf integer');
        return value > BigInt(Number.MAX_SAFE_INTEGER) ? value : Number(value);
      }
    }
    throw new Error('Invalid protobuf varint');
  };
  while (offset < bytes.length) {
    const tag = integer();
    if (typeof tag !== 'number') throw new Error('Invalid protobuf tag');
    const field = Math.floor(tag / 8), wire = tag % 8;
    if (field < 1 || field > 536870911) throw new Error('Invalid protobuf tag');
    if (wire === 0) { result.set(field, integer()); continue; }
    let length;
    if (wire === 2) length = integer();
    else if (wire === 1) length = 8;
    else if (wire === 5) length = 4;
    else throw new Error('Unsupported protobuf wire type');
    if (typeof length !== 'number' || length > bytes.length - offset) throw new Error('Truncated protobuf field');
    const data = bytes.subarray(offset, offset + length);
    result.set(field, wire === 2 ? data : { wire, data }); offset += length;
  }
  return result;
}
const child = (map, key) => {
  if (!map.has(key)) return new Map();
  if (!(map.get(key) instanceof Uint8Array)) throw new Error('Invalid protobuf message');
  return fields(map.get(key));
};
const value = (map, key) => {
  if (!map.has(key)) return 0;
  if (typeof map.get(key) !== 'number') throw new Error('Invalid protobuf numeric field');
  return map.get(key);
};
function seconds(map, key) {
  if (!map.has(key)) return null;
  const duration = child(map, key), nanos = value(duration, 2);
  if (nanos >= 1e9) throw new Error('Invalid protobuf duration');
  return value(duration, 1) + nanos / 1e9;
}

export function decodeGeneration({ idx, data }) {
  const call = child(fields(data), 1), usage = child(call, 4);
  return {
    index: Number(idx), input: value(usage, 2), output: value(usage, 3), cached: value(usage, 5),
    thinking: value(usage, 9), response: value(usage, 10),
    waitSeconds: seconds(call, 11), streamSeconds: seconds(call, 12),
    contextLimit: value(child(child(call, 9), 10), 4) || null
  };
}

export function summarize(records, { contextLimit = null } = {}) {
  const calls = records.filter(r => r.input > 0 || r.cached > 0 || r.output > 0);
  if (!calls.length) return { hasData: false, status: 'waiting' };
  const last = calls.at(-1), elapsed = last.waitSeconds !== null && last.streamSeconds !== null
    ? last.waitSeconds + last.streamSeconds : null;
  const streaming = last.streamSeconds > 0 ? last.output / last.streamSeconds : null;
  const endToEndSpeed = elapsed > 0 ? last.output / elapsed : null;
  // Very short flushes are often buffered delivery, not measured model decoding.
  const plausible = last.streamSeconds >= 0.5 && streaming > 0 && streaming <= 600
    && (elapsed === null || last.streamSeconds / elapsed >= 0.15 || (last.streamSeconds >= 2 && streaming <= 250));
  const limit = Number.isFinite(contextLimit) && contextLimit > 0 ? contextLimit : last.contextLimit;
  const used = last.input + last.cached;
  const total = { calls: calls.length, input: 0, cached: 0, output: 0, thinking: 0, response: 0 };
  for (const call of calls) for (const key of ['input','cached','output','thinking','response']) total[key] += call[key];
  total.cachePercent = total.input + total.cached > 0 ? 100 * total.cached / (total.input + total.cached) : null;
  return {
    hasData: true, status: 'ready',
    latest: { ...last, speed: plausible ? streaming : endToEndSpeed,
      mode: plausible ? 'stream' : 'end-to-end', endToEndSpeed, totalSeconds: elapsed },
    context: { used, limit, percent: limit ? 100 * used / limit : null,
      source: contextLimit > 0 ? 'override' : limit ? 'metadata' : 'unknown' }, total
  };
}
