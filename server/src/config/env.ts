// Read once at startup so the rest of the server never touches process.env.
export const config = {
  port: Number(process.env.PORT ?? 3001),
  databasePath: process.env.DATABASE_PATH ?? './data/apex.db',
  demoMode: process.env.DEMO_MODE === 'true',
  appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:5173',
};
