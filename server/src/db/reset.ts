import path from 'node:path';
import { config } from '../config/env.js';
import { openDb } from './index.js';
import { seed } from './seed.js';

// Reset in place instead of deleting the file. Windows refuses to delete a database
// that the running dev server has open, and reseeding during a demo is the normal case.
const file = path.resolve(config.databasePath);
const db = openDb(file);
seed(db);
db.close();
console.log(`Seeded demo data into ${file}`);
