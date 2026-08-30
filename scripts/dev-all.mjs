// Runs the backend and the Vite dev server together, so the whole app is
// reachable on one host: http://localhost:5173  (Vite proxies /api + /socket.io)
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const children = [];
let shuttingDown = false;

function run(label, file, args, cwd) {
  const child = spawn(process.execPath, [file, ...args], { cwd, stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`\n[${label}] exited (${signal || code}) — stopping the other process.`);
    stopAll();
    process.exitCode = code ?? 1;
  });
  children.push(child);
  return child;
}

function stopAll() {
  shuttingDown = true;
  for (const c of children) {
    if (!c.killed) c.kill();
  }
}

process.on("SIGINT", () => { stopAll(); process.exit(0); });
process.on("SIGTERM", () => { stopAll(); process.exit(0); });

console.log(
  "\nBitloom dev — backend + frontend on one host (Vite proxies /api and /socket.io).\n" +
  "The backend takes ~10s to boot while Firebase Admin initialises; API calls\n" +
  "made before then will fail until you see the 🚀 line.\n"
);

run("api", path.join(root, "backend", "server.js"), [], path.join(root, "backend"));
run("web", path.join(root, "node_modules", "vite", "bin", "vite.js"), [], root);
