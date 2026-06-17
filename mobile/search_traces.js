const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\c0816247-6a3d-4283-9fd7-24d77bfdc824\\.system_generated\\logs\\transcript.jsonl';

async function parse() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let linesFound = [];
  for await (const line of rl) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      // We only care about output from commands or logs from system
      // Let's check where the logs might be. Usually they are in the tool output of run_command, or in system messages.
      // If the object represents a model run_command tool output:
      let outputText = '';
      if (obj.type === 'RUN_COMMAND' && obj.output) {
        outputText = obj.output;
      } else if (obj.tool_calls) {
        // sometimes tool calls contain outputs in the subsequent system responses
      } else if (obj.content) {
        outputText = obj.content;
      }
      
      if (outputText && (outputText.includes('[TeacherReports]') || outputText.includes('[Dashboard]') || outputText.includes('[Navigator]'))) {
        linesFound.push({
          step: obj.step_index,
          type: obj.type,
          text: outputText
        });
      }
    } catch (err) {}
  }

  console.log(`Found ${linesFound.length} matching steps.`);
  // Print the last 15 matching steps to see recent run logs
  const start = Math.max(0, linesFound.length - 30);
  for (let i = start; i < linesFound.length; i++) {
    console.log(`\n=== MATCH ${i} (Step ${linesFound[i].step}, ${linesFound[i].type}) ===`);
    // Filter lines in the text containing [TeacherReports], [Dashboard], [Navigator] or trace info
    const lines = linesFound[i].text.split('\n');
    lines.forEach(l => {
      if (l.includes('[TeacherReports]') || l.includes('[Dashboard]') || l.includes('[Navigator]') || l.includes('[COURSE API]') || l.includes('at ') || l.includes('Error') || l.includes('trace')) {
        console.log(l);
      }
    });
  }
}

parse();
