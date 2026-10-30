import { createApp } from './app.js';
import { config } from './config/env.js';
import { openDb } from './db/index.js';

const db = openDb(config.databasePath);
createApp(db).listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
