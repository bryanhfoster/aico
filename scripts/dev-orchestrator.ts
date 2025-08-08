import { execa } from 'execa';
import getPort from 'get-port';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

async function main() {
  const portsFile = join(process.cwd(), '.dev-ports.json');

  const clientPort = await getPort({ port: 5173 });
  const serverPort = await getPort({ port: 5175 });

  const env = {
    ...process.env,
    VITE_SERVER_HTTP_URL: `http://localhost:${serverPort}`,
    VITE_SERVER_WS_URL: `ws://localhost:${serverPort}`,
    PORT: String(serverPort),
    VITE_PORT: String(clientPort)
  };

  const info = { clientPort, serverPort, baseURL: `http://localhost:${clientPort}` } as const;
  writeFileSync(portsFile, JSON.stringify(info, null, 2), 'utf8');
  console.log('Ports written to .dev-ports.json', info);

  const server = execa('npm', ['run', 'dev:server'], { stdio: 'inherit', env });
  const client = execa('npm', ['run', 'dev:client'], { stdio: 'inherit', env });

  await Promise.all([server, client]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


