const { io } = require("socket.io-client");

const normalizeUrl = (value) => value.replace(/\/$/, "");

const clientUrl = normalizeUrl(
  process.env.CLIENT_PUBLIC_URL ||
    process.env.EXPO_PUBLIC_URL ||
    "https://teacher-bo.leed.at",
);
const apiUrl = normalizeUrl(
  process.env.CLIENT_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    "https://b92c_b9ejghdi28.leed.at",
);
const socketUrl = normalizeUrl(
  process.env.CLIENT_PUBLIC_SOCKET_URL ||
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    process.env.CLIENT_PUBLIC_URL ||
    process.env.EXPO_PUBLIC_URL ||
    "https://teacher-bo.leed.at",
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

const extractAssetRefs = (body) => {
  return [...body.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => href.startsWith("/_expo/") || href === "/favicon.ico");
};

const verifyClientAssets = async () => {
  const routeBodies = [];

  for (const route of ["/", "/test"]) {
    const { response, body } = await readText(`${clientUrl}${route}`, {
      cache: "no-store",
    });

    assert(response.ok, `client route failed: ${route} ${response.status}`);
    routeBodies.push(body);
  }

  const refs = routeBodies.flatMap(extractAssetRefs);

  const assetUrls = [...new Set(refs.map((href) => new URL(href, clientUrl)))];
  const jsUrls = assetUrls.filter((url) => url.pathname.endsWith(".js"));
  assert(jsUrls.length > 0, "missing JS asset");

  for (const url of assetUrls) {
    const assetResponse = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    assert(assetResponse.ok, `asset failed: ${assetResponse.status} ${url}`);
  }

  const runtimeBundle =
    jsUrls.find((url) => url.pathname.includes("/index-")) ?? jsUrls[0];
  const bundle = await readText(runtimeBundle, {
    cache: "no-store",
  });
  assert(
    bundle.response.ok,
    `bundle failed: ${bundle.response.status} ${runtimeBundle}`,
  );
  assert(
    [`SOCKET_URL:"${socketUrl}"`, `"SOCKET_URL":"${socketUrl}"`].some(
      (fragment) => bundle.body.includes(fragment),
    ),
    `bundle socket url mismatch: expected ${socketUrl}`,
  );
};

const verifyApi = async () => {
  const health = await readText(`${apiUrl}/health`, {
    cache: "no-store",
  });
  assert(health.response.ok, `health failed: ${health.response.status}`);
  assert(
    health.body.includes("Board Game Assistant"),
    `unexpected health body: ${health.body}`,
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
    `preflight failed: ${preflight.status}`,
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
    `unexpected graphql body: ${graphql.body}`,
  );
};

const verifySocket = async () => {
  await new Promise((resolve, reject) => {
    const socket = io(socketUrl, {
      transports: ["websocket"],
      forceNew: true,
      timeout: 10000,
      reconnection: false,
      query: { vad: "false" },
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`socket connection timed out: ${socketUrl}`));
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
