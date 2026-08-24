const fs = require('fs');
const lines = fs.readFileSync('C:/Users/imesh/.gemini/antigravity/brain/814300c2-28be-47cb-b86c-504734afec2e/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
let foundCode = '';
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('const [activePage') && lines[i].includes('TargetFile')) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.tool_calls) {
         for (let call of obj.tool_calls) {
             if (call.arguments && call.arguments.ReplacementContent) {
                 foundCode = call.arguments.ReplacementContent;
             } else if (call.arguments && call.arguments.CodeContent) {
                 foundCode = call.arguments.CodeContent;
             }
         }
      }
    } catch(e) {}
  }
}
if (foundCode) {
  fs.writeFileSync('C:/Users/imesh/Music/trading/App_backup.jsx', foundCode);
  console.log('Saved to App_backup.jsx');
} else {
  console.log('Not found in transcript as tool call argument.');
}

