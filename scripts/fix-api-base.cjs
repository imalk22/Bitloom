const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "src", "App.jsx");
let s = fs.readFileSync(file, "utf8");

const replacements = [
  ['fetch("http://localhost:3001/api/pnl-mode")', "fetch(`${API_BASE}/api/pnl-mode`)"],
  ['fetch("http://localhost:3001/api/admin/login"', "fetch(`${API_BASE}/api/admin/login`"],
  ["fetch(`http://localhost:3001/api/pnl-mode?${q}`)", "fetch(`${API_BASE}/api/pnl-mode?${q}`)"],
  ["fetch(`http://localhost:3001/api/admin/chats?${q}`)", "fetch(`${API_BASE}/api/admin/chats?${q}`)"],
  ["fetch(`http://localhost:3001/api/admin/stats?${q}`)", "fetch(`${API_BASE}/api/admin/stats?${q}`)"],
];

for (const [from, to] of replacements) {
  if (!s.includes(from)) {
    console.warn("missing:", from.slice(0, 60));
  } else {
    s = s.split(from).join(to);
  }
}

fs.writeFileSync(file, s);
console.log("remaining localhost:", (s.match(/localhost:3001/g) || []).length);
