import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MetricsReader } from '../src/database.mjs';
import { generation } from './fixtures.mjs';
const id='12345678-1234-1234-1234-123456789abc';

test('reads a real WAL database; tail updates replace totals and deletion resets them', () => {
  const dir=mkdtempSync(join(tmpdir(),'agy-test-')); const path=join(dir,id+'.db');
  const writer=new DatabaseSync(path); const reader=new MetricsReader(dir);
  try {
    writer.exec('PRAGMA journal_mode=WAL; CREATE TABLE gen_metadata (idx INTEGER PRIMARY KEY, data BLOB)');
    writer.prepare('INSERT INTO gen_metadata VALUES (?,?)').run(0,generation());
    assert.equal(reader.read(id).total.output,200);
    writer.prepare('UPDATE gen_metadata SET data=? WHERE idx=0').run(generation({output:300}));
    assert.equal(reader.read(id).total.output,300);
    writer.prepare('INSERT INTO gen_metadata VALUES (?,?)').run(1,generation());
    assert.equal(reader.read(id).total.output,500);
    writer.exec('DELETE FROM gen_metadata');
    assert.equal(reader.read(id).hasData,false);
  } finally { writer.close(); rmSync(dir,{recursive:true,force:true}); }
});
test('missing DB is not created, traversal is rejected, unsupported schema is explained', () => {
  const dir=mkdtempSync(join(tmpdir(),'agy-test-')); const reader=new MetricsReader(dir);
  try {
    assert.equal(reader.read(id).status,'missing'); assert.equal(existsSync(join(dir,id+'.db')),false);
    assert.throws(()=>reader.read('../secrets'),/conversation/i);
    const db=new DatabaseSync(join(dir,id+'.db')); db.exec('CREATE TABLE other (x TEXT)'); db.close();
    assert.equal(reader.read(id).status,'unsupported-schema');
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('malformed rows are counted and source bytes remain unchanged', () => {
  const dir=mkdtempSync(join(tmpdir(),'agy-test-')); const path=join(dir,id+'.db');
  try {
    const db=new DatabaseSync(path); db.exec('CREATE TABLE gen_metadata (idx INTEGER PRIMARY KEY, data BLOB)');
    db.prepare('INSERT INTO gen_metadata VALUES (?,?)').run(0,generation());
    db.prepare('INSERT INTO gen_metadata VALUES (?,?)').run(1,Buffer.from([10,255])); db.close();
    const before=readFileSync(path); const result=new MetricsReader(dir).read(id);
    assert.equal(result.skippedRows,1); assert.equal(result.total.output,200);
    assert.deepEqual(readFileSync(path),before);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
