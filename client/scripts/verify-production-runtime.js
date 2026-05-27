const { io } = require("socket.io-client");

const normalizeUrl = (value) => value.replace(/\/$/, "");

const clientUrl = normalizeUrl(
  process.env.CLIENT_PUBLIC_URL ||
    process.env.EXPO_PUBLIC_URL ||
    "https://teacher-bo.leed.at"
);
const apiUrl = normalizeUrl(
  process.env.CLIENT_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    "https://b92c_b9ejghdi28.leed.at"
);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readText = async (url, options) => {
  const response = await fetch(url, options);
  const body = await response.text();

  return { response, body };
};

const verifyClientAssets = async () => {
  const { response, body } = await readText(`${clientUrl}/`, {
    cache: "no-store",
  });

  assert(response.ok, `client index failed: ${response.status}`);

  const refs = [...body.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => href.startsWith("/_expo/") || href === "/favicon.ico");

  const assetUrls = [...new Set(refs.map((href) => new URL(href, clientUrl)))];
  assert(assetUrls.some((url) => url.pathname.endsWith(".js")), "missing JS asset");

  for (const url of assetUrls) {
    const assetResponse = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    assert(assetResponse.ok, `asset failed: ${assetResponse.status} ${url}`);
  }
};

const verifyApi = async () => {
  const health = await readText(`${apiUrl}/health`, {
    cache: "no-store",
  });
  assert(health.response.ok, `health failed: ${health.response.status}`);
  assert(
    health.body.includes("Board Game Assistant"),
    `unexpected health body: ${health.body}`
  );

  const preflight = await fetch(`${apiUrl}/api/graphql`, {
    method: "OPTIONS",
    headers: {
      Origin: clientUrl,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  assert(
    preflight.status === 204 || preflight.status === 200,
    `preflight failed: ${preflight.status}`
  );

  const graphql = await readText(`${apiUrl}/api/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: clientUrl,
    },
    body: JSON.stringify({ query: "{ __typename }" }),
  });
  assert(graphql.response.ok, `graphql failed: ${graphql.response.status}`);
  assert(
    graphql.body.includes('"__typename":"Query"'),
    `unexpected graphql body: ${graphql.body}`
  );
};

const verifySocket = async () => {
  await new Promise((resolve, reject) => {
    const socket = io(apiUrl, {
      transports: ["websocket"],
      forceNew: true,
      timeout: 10000,
      reconnection: false,
      query: { vad: "false" },
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error("socket connection timed out"));
    }, 12000);

    socket.on("connect", () => {
      clearTimeout(timeout);
      socket.disconnect();
      resolve();
    });

    socket.on("connect_error", (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(error);
    });
  });
};

const run = async () => {
  await verifyClientAssets();
  await verifyApi();
  await verifySocket();
  console.log("production runtime verification passed");
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
