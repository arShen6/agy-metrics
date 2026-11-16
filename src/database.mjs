import { DatabaseSync } from 'node:sqlite';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { decodeGeneration, summarize } from './metrics.mjs';

export const CONVERSATION_ID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
function fingerprint(path) {
  return [path, `${path}-wal`].map(file => {
    try { const s = statSync(file, { bigint: true }); return `${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`; }
    catch (e) { if (e.code === 'ENOENT') return '-'; throw e; }
  }).join('|');
}

export class MetricsReader {
  constructor(directory, options = {}) { this.directory = directory; this.options = options; this.cache = new Map(); }
  read(conversationId, { force = false } = {}) {
    if (!CONVERSATION_ID.test(conversationId)) throw new Error('Invalid conversation ID');
    const path = join(this.directory, `${conversationId}.db`); let db;
    try {
      const signature = fingerprint(path), cached = this.cache.get(conversationId);
      if (signature.startsWith('-|')) return { conversationId, hasData: false, status: 'missing' };
      if (!force && cached?.signature === signature) return cached.payload;
      db = new DatabaseSync(path, { readOnly: true });
      db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=100; BEGIN');
      const rows = db.prepare('SELECT idx, data FROM gen_metadata ORDER BY idx ASC').all();
      const records = []; let skippedRows = 0;
      for (const row of rows) { try { records.push(decodeGeneration(row)); } catch { skippedRows++; } }
      const payload = { conversationId, ...summarize(records, this.options), skippedRows };
      db.exec('COMMIT');
      this.cache.delete(conversationId); this.cache.set(conversationId, { signature, payload });
      if (this.cache.size > 8) this.cache.delete(this.cache.keys().next().value);
      return payload;
    } catch (error) {
      const message = String(error.message);
      const status = /locked|busy/i.test(message) ? 'busy' : /no such table|no such column/i.test(message)
        ? 'unsupported-schema' : 'unreadable';
      // Do not mark failures as cached: transient locks are retried next poll.
      return { conversationId, hasData: false, status };
    } finally { db?.close(); }
  }
}
