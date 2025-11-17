#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ENV_FILE = path.join(__dirname, "..", ".env");

function loadEnv() {
  const env = { ...process.env };

  if (fs.existsSync(ENV_FILE)) {
    const content = fs.readFileSync(ENV_FILE, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join("=");
        }
      }
    }
  }

  return env;
}

const env = loadEnv();
const CLIENT_PORT = env.EXPO_PUBLIC_CLIENT_PORT || "1001";

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error("Usage: node load-env.js <command> [args...]");
  process.exit(1);
}

const fullArgs = args.map((arg) => arg.replace("$CLIENT_PORT", CLIENT_PORT));

const proc = spawn(command, fullArgs, {
  stdio: "inherit",
  shell: true,
  env: {
    ...env,
    RCT_METRO_PORT: CLIENT_PORT,
  },
});

proc.on("exit", (code) => {
  process.exit(code || 0);
});
