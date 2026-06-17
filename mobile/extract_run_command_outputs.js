const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\c0816247-6a3d-4283-9fd7-24d77bfdc824\\.system_generated\\logs\\transcript.jsonl';

async function parse() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      // search all steps

      
      let cmdOutput = '';
      if (obj.type === 'RUN_COMMAND' && obj.output) {
        cmdOutput = obj.output;
      }
      
      if (cmdOutput) {
        // If the command output contains any logs of interest
        if (cmdOutput.includes('mounted') || cmdOutput.includes('focused') || cmdOutput.includes('logged') || cmdOutput.includes('API') || cmdOutput.includes('trace')) {
          console.log(`\n--- STEP ${obj.step_index} COMMAND OUTPUT ---`);
          console.log(cmdOutput);
        }
      }
    } catch (err) {}
  }
}

parse();
