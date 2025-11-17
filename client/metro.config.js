const { getDefaultConfig } = require("expo/metro-config");
const { mergeConfig } = require("metro-config");

const { createProxyMiddleware } = require("http-proxy-middleware");
const connect = require("connect");
const { config: envConfig } = require("dotenv");

envConfig({ path: ".env" });

const API_PORT = process.env.EXPO_PUBLIC_API_PORT || "1002";
const API_URL = `http://localhost:${API_PORT}`;

const config = getDefaultConfig(__dirname);

const ALIASES = {
  tslib: require.resolve("tslib/tslib.es6.js"),
};

const apiProxy = createProxyMiddleware({
  target: API_URL,
  // pathRewrite: {
  //   "^/": "/api/",
  // },
  changeOrigin: true,
  ws: true,
  secure: false,
  logLevel: "debug",
  onError: (err, req, res) => {
    console.error("Proxy error:", err);
    if (!res.headersSent) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: "Proxy error", message: err.message }));
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${API_URL}${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(
      `[PROXY RESPONSE] ${proxyRes.statusCode} ${req.method} ${req.url}`
    );
  },
});

const extendedConfig = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      return context.resolveRequest(
        context,
        ALIASES[moduleName] ?? moduleName,
        platform
      );
    },
  },
  server: {
    enhanceMiddleware: (middleware, server) => {
      const app = connect().use(middleware);

      if (process.env.NODE_ENV === "development") {
        app.use("/api", (req, res, next) => {
          req.url = `/api${req.url}`;
          return apiProxy(req, res, next);
        });
      }

      return app;
    },
  },
};
module.exports = mergeConfig(config, extendedConfig);
