import { spawn } from 'child_process';
import { createServer } from 'vite';
import electronPath from 'electron';

async function start() {
  const server = await createServer();
  await server.listen();

  const address = server.httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 5173;
  const devUrl = `http://localhost:${port}`;

  const env = { ...process.env, VITE_DEV_SERVER_URL: devUrl };
  // Remove ELECTRON_RUN_AS_NODE so child electron runs as full GUI app
  delete env.ELECTRON_RUN_AS_NODE;

  const child = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    env,
  });

  child.on('close', (code) => {
    server.close();
    process.exit(code ?? 0);
  });
}

start().catch((err) => {
  console.error('Failed to start dev environment:', err);
  process.exit(1);
});
