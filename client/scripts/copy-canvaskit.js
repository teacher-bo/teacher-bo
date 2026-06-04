const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const source = path.join(distDir, "canvaskit.wasm");
const targetDir = path.join(distDir, "_expo", "static", "js", "web");
const target = path.join(targetDir, "canvaskit.wasm");

if (!fs.existsSync(source)) {
  throw new Error(`Missing CanvasKit source: ${source}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);

console.log(`Copied CanvasKit WASM to ${path.relative(distDir, target)}`);
