import { createApp } from './app.js';
import { config } from './config/env.js';
import { loadTemplate, TemplateError } from './config/onboarding.js';
import { openDb } from './db/index.js';

// A bad onboarding template stops the server here, with the problem spelled out.
let template;
try {
  template = loadTemplate();
} catch (err) {
  if (err instanceof TemplateError) {
    console.error(`\n${err.message}\n`);
    process.exit(1);
  }
  throw err;
}

const db = openDb(config.databasePath);
createApp(db, { template }).listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
