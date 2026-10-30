// Local UI validation with a separate Next cache. No production API or database.
process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:3197";
const next = require("next");
const http = require("node:http");
const path = require("node:path");
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
app
  .prepare()
  .then(() => {
    const server = http.createServer(app.getRequestHandler());
    server.on("upgrade", app.getUpgradeHandler());
    server.listen(3198, "127.0.0.1", () =>
      console.log("Local legal UI validation ready: http://127.0.0.1:3198"),
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
