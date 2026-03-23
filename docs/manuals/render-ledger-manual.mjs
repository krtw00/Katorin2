import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredEnvKeys = [
  "LEDGER_MANUAL_BASE_URL",
  "LEDGER_MANUAL_LOGIN_ID",
  "LEDGER_MANUAL_PASSWORD",
];

for (const key of requiredEnvKeys) {
  if (!process.env[key]) {
    throw new Error(`Missing required env: ${key}`);
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.join(scriptDir, "ledger-operations-manual.template.tex");
const outputPath = path.join(scriptDir, "ledger-operations-manual.tex");

const replacements = {
  "__BASE_URL__": process.env.LEDGER_MANUAL_BASE_URL,
  "__LOGIN_ID__": process.env.LEDGER_MANUAL_LOGIN_ID,
  "__PASSWORD__": process.env.LEDGER_MANUAL_PASSWORD,
  "__GENERATED_AT__": new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date()),
};

let tex = await fs.readFile(templatePath, "utf8");
for (const [placeholder, value] of Object.entries(replacements)) {
  tex = tex.split(placeholder).join(value.replace(/\\/g, "\\textbackslash{}"));
}

await fs.writeFile(outputPath, tex, "utf8");
console.log(`rendered ${outputPath}`);
