// Local preview uses an isolated API and a separate Next cache.
process.env.NEXT_PUBLIC_API_URL = 'http://127.0.0.1:3199';
async function main() {
  const { default: next } = await import('next');
  const http = await import('node:http');
  const path = await import('node:path');
  const app = next({
    dev: true,
    webpack: true,
    hostname: '127.0.0.1',
    port: 3200,
    dir: path.resolve(__dirname, '..'),
    conf: {
      distDir: '.next-training-validation',
      allowedDevOrigins: ['127.0.0.1', 'localhost'],
      output: undefined,
    },
  });
  await app.prepare();
  const server = http.createServer(app.getRequestHandler());
  server.on('upgrade', app.getUpgradeHandler());
  server.listen(3200, '127.0.0.1', () =>
    console.log('Training preview UI ready at http://127.0.0.1:3200'),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
