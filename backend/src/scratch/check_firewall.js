const { execSync } = require("child_process");

try {
  // Query netsh to see if port 5000 is allowed
  console.log("=== CHECKING INBOUND RULE FOR PORT 5000 via Netsh ===");
  const netshOut = execSync("netsh advfirewall firewall show rule name=all").toString();
  
  // Find lines containing 5000
  const lines = netshOut.split("\n");
  let found = false;
  let currentRule = [];
  
  for (const line of lines) {
    if (line.startsWith("Rule Name:")) {
      if (currentRule.join("\n").includes("5000")) {
        console.log(currentRule.join("\n"));
        console.log("------------------------");
        found = true;
      }
      currentRule = [line.trim()];
    } else if (line.trim()) {
      currentRule.push(line.trim());
    }
  }
  if (currentRule.join("\n").includes("5000")) {
    console.log(currentRule.join("\n"));
    console.log("------------------------");
    found = true;
  }
  
  if (!found) {
    console.log("No firewall rules specifically matching '5000' found in netsh.");
  }
} catch (err) {
  console.error("Error running netsh command:", err.message);
}
