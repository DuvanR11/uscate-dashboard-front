// Local UI validation with a separate Next cache. No production API or database.
process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:3197";
async function main() {
  const { default: next } = await import("next");
  const http = await import("node:http");
  const path = await import("node:path");
  const app = next({
    dev: true,
    webpack: true,
    hostname: "127.0.0.1",
    port: 3198,
    dir: path.resolve(__dirname, ".."),
    conf: {
      distDir: ".next-legal-validation",
      allowedDevOrigins: ["127.0.0.1", "localhost"],
      output: undefined,
    },
  });
  await app.prepare();
  const server = http.createServer(app.getRequestHandler());
  server.on("upgrade", app.getUpgradeHandler());
  server.listen(3198, "127.0.0.1", () =>
    console.log("Local legal UI validation ready: http://127.0.0.1:3198"),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
