const fs = require("fs");
const f = "src/components/trade/BinaryTicket.jsx";
let s = fs.readFileSync(f, "utf8");
s = s.replace(
  'fetch("http://localhost:3001/api/pnl-mode")',
  "fetch(`${API_BASE}/api/pnl-mode`)"
);
s = s.replace(
  'fetch("http://localhost:3001/api/trade/resolve",',
  "fetch(`${API_BASE}/api/trade/resolve`,"
);
fs.writeFileSync(f, s);
console.log("left", (s.match(/localhost:3001/g) || []).length);
