import path from 'node:path';
import { config } from '../config/env.js';
import { openDb } from './index.js';
import { seed } from './seed.js';

// Windows refuses to delete a database file the dev server has open, so reset in place.
const file = path.resolve(config.databasePath);
const db = openDb(file);
seed(db, Date.now(), path.resolve(config.uploadsDir));
db.close();
console.log(`Seeded demo data into ${file}`);
