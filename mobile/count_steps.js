const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\c0816247-6a3d-4283-9fd7-24d77bfdc824\\.system_generated\\logs\\transcript.jsonl';

async function parse() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const types = {};
  let total = 0;
  for await (const line of rl) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      types[obj.type] = (types[obj.type] || 0) + 1;
      total++;
    } catch (err) {}
  }
  console.log(`Total steps: ${total}`);
  console.log("Types:", types);
}

parse();
