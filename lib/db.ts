import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'nfs_memories.db');
const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS npc_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_name TEXT,
    event TEXT,
    player_action TEXT,
    intensity INTEGER,
    memory_text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS procedural_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    topology TEXT,
    complexity REAL,
    config_json TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
