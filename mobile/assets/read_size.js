const fs = require('fs');
const filePath = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\c0816247-6a3d-4283-9fd7-24d77bfdc824\\.system_generated\\steps\\14731\\content.md';
const content = fs.readFileSync(filePath, 'utf8');

// Find all JSON blocks in script tags
const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
while ((match = regex.exec(content)) !== null) {
  const scriptContent = match[1];
  if (scriptContent.includes('builds') || scriptContent.includes('artifact')) {
    console.log("Found script tag containing build/artifact context:");
    // Print first 500 chars of matching script tags
    console.log(scriptContent.substring(0, 1000));
  }
}
