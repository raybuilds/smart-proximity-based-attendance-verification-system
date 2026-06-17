const fs = require('fs');
const readline = require('readline');
const path = require('path');

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
      // Search for our logged strings in either step output or system messages or tool outputs
      const content = JSON.stringify(obj);
      if (content.includes('[COURSE API]') || content.includes('[Dashboard]') || content.includes('[TeacherReports]')) {
        console.log(`Step ${obj.step_index} (${obj.type}):`);
        // Let's print matching parts or specific logs
        // If it's a model/user input or tool output, extract the actual logged text
        if (obj.content) {
          if (obj.content.includes('[COURSE API]') || obj.content.includes('[Dashboard]') || obj.content.includes('[TeacherReports]')) {
             console.log(obj.content);
          }
        }
        if (obj.tool_calls) {
          console.log("Tool calls:", JSON.stringify(obj.tool_calls));
        }
        // Check for output/logs in tool responses or systems responses
        // Let's print the entire object line if it's small or has output
        if (obj.output) {
          console.log("Output:", obj.output);
        }
      }
    } catch (err) {
      // Ignore parse errors
    }
  }
}

parse();
