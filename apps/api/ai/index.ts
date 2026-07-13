import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../.env"),
];

let loadedFrom: string | null = null;
for (const envPath of candidateEnvPaths) {
  if (!fs.existsSync(envPath)) continue;
  dotenv.config({ path: envPath });
  if (process.env.OPENAI_API_KEY) {
    loadedFrom = envPath;
    break;
  }
}

const apiKey = process.env.OPENAI_API_KEY;

console.log("ENV path:", loadedFrom ?? "(not found)");
console.log("Key loaded:", !!apiKey);

if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY");
}

export const openai = new OpenAI({
  apiKey,
});