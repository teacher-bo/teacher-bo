#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ENV_FILE = path.join(__dirname, "..", ".env");

function getLocalIP() {
  try {
    const command =
      "ifconfig | grep \"inet \" | grep -v 127.0.0.1 | awk '{print $2}' | head -1";
    const ip = execSync(command, { encoding: "utf-8" }).trim();

    if (!ip) {
      console.warn("⚠️  Could not detect local IP address");
      return null;
    }

    console.log(`📡 Detected local IP: ${ip}`);
    return ip;
  } catch (error) {
    console.error("❌ Error detecting IP:", error.message);
    return null;
  }
}

function updateEnvFile(ip) {
  if (!ip) {
    console.log("⏭️  Skipping .env update (no IP detected)");
    return;
  }

  try {
    let envContent = "";

    if (fs.existsSync(ENV_FILE)) {
      envContent = fs.readFileSync(ENV_FILE, "utf-8");
    }

    const ipPattern = /^EXPO_PUBLIC_DEV_LOCAL_IP=.*$/m;
    const newIp = `EXPO_PUBLIC_DEV_LOCAL_IP=${ip}`;

    if (ipPattern.test(envContent)) {
      envContent = envContent.replace(ipPattern, newIp);
    } else {
      envContent += `\n${newIp}`;
    }

    fs.writeFileSync(ENV_FILE, envContent.trim() + "\n");
    console.log(`✅ Updated .env file for mobile devices`);
    console.log(`   ${newIp}`);
    console.log(`   Web platform will use localhost automatically`);
  } catch (error) {
    console.error("❌ Error updating .env file:", error.message);
  }
}

const isDevelopment = process.env.NODE_ENV !== "production";

if (isDevelopment) {
  console.log("🔧 Development mode detected - updating local IP...");
  const localIP = getLocalIP();
  updateEnvFile(localIP);
} else {
  console.log("📦 Production mode - skipping IP update");
}
