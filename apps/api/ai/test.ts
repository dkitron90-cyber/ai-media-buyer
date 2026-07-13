import { runSufficiencyAgent } from "./agents/sufficiencyAgent";
import { runAnalystAgent } from "./agents/analystAgent";
import { runOptimizationAgent } from "./agents/optimizationAgent";

async function main() {
  const input = `
Campaign Name: DE Search Core
Spend: 1200
Conversions: 28
CPA: 42
Target CPA: 25
Mobile CPA significantly higher than desktop
One geography has spend but zero conversions
`;

  const suff = await runSufficiencyAgent(input);

  console.log("Sufficiency:");
  console.log(suff);

  if (suff.status === "insufficient") {
    console.log("STOP:", suff.user_message);
    return;
  }

  const analysis = await runAnalystAgent(input);

  console.log("\nAnalysis:");
  console.log(analysis);

  const optimizationInput = `
Campaign Input:
${input}

Sufficiency:
${JSON.stringify(suff, null, 2)}

Analysis:
${JSON.stringify(analysis, null, 2)}
`;

  const optimization = await runOptimizationAgent(optimizationInput);

  console.log("\nOptimization:");
  console.log(optimization);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});