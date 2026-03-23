import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredEnvKeys = [
  "LEDGER_MANUAL_BASE_URL",
  "LEDGER_MANUAL_LOGIN_ID",
  "LEDGER_MANUAL_PASSWORD",
  "LEDGER_MANUAL_ONBOARDING_LOGIN_ID",
  "LEDGER_MANUAL_ONBOARDING_PASSWORD",
  "LEDGER_MANUAL_REGULAR_LEAGUE_ID",
  "LEDGER_MANUAL_REGULAR_PHASE_ID",
  "LEDGER_MANUAL_REGULAR_WEEK_ID",
  "LEDGER_MANUAL_REGULAR_RESULT_ENTRY_MATCH_ID",
  "LEDGER_MANUAL_TOURNAMENT_LEAGUE_ID",
  "LEDGER_MANUAL_TOURNAMENT_PHASE_ID",
  "LEDGER_MANUAL_TOURNAMENT_MATCH_ID",
];

for (const key of requiredEnvKeys) {
  if (!process.env[key]) {
    throw new Error(`Missing required env: ${key}`);
  }
}

const baseUrl = process.env.LEDGER_MANUAL_BASE_URL.replace(/\/+$/, "");
const loginId = process.env.LEDGER_MANUAL_LOGIN_ID;
const password = process.env.LEDGER_MANUAL_PASSWORD;
const onboardingLoginId = process.env.LEDGER_MANUAL_ONBOARDING_LOGIN_ID;
const onboardingPassword = process.env.LEDGER_MANUAL_ONBOARDING_PASSWORD;
const regularLeagueId = process.env.LEDGER_MANUAL_REGULAR_LEAGUE_ID;
const regularPhaseId = process.env.LEDGER_MANUAL_REGULAR_PHASE_ID;
const regularWeekId = process.env.LEDGER_MANUAL_REGULAR_WEEK_ID;
const regularResultEntryMatchId = process.env.LEDGER_MANUAL_REGULAR_RESULT_ENTRY_MATCH_ID;
const tournamentLeagueId = process.env.LEDGER_MANUAL_TOURNAMENT_LEAGUE_ID;
const tournamentPhaseId = process.env.LEDGER_MANUAL_TOURNAMENT_PHASE_ID;
const tournamentMatchId = process.env.LEDGER_MANUAL_TOURNAMENT_MATCH_ID;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(scriptDir, "images");

const shots = [
  { name: "01-registration.png", path: "/ja/registration/new", waitFor: ".login-panel", selector: ".login-panel", viewport: { width: 1400, height: 1200 } },
  { name: "02-organizer-setup.png", path: "/ja/organizer_setup/new", waitFor: ".login-panel", selector: ".login-panel", viewport: { width: 1400, height: 1100 } },
  { name: "03-login.png", path: "/ja/session/new", waitFor: ".login-panel", selector: ".login-panel", viewport: { width: 1400, height: 1100 } },
  { name: "04-dashboard.png", path: "/ja/dashboard", waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1200 } },
  { name: "05-leagues.png", path: "/ja/leagues", waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1200 } },
  { name: "06-stage-assets.png", path: "/ja/stage_assets", waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1200 } },
  { name: "07-league-overview.png", path: `/ja/leagues/${regularLeagueId}`, waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1400 } },
  { name: "08-team-list.png", path: `/ja/leagues/${regularLeagueId}/teams`, waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1400 } },
  { name: "09-csv-import.png", path: `/ja/leagues/${regularLeagueId}/team_import/new`, waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1400 } },
  { name: "10-regular-phase.png", path: `/ja/leagues/${regularLeagueId}/phases/${regularPhaseId}`, waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1400 } },
  { name: "11-week-view.png", path: `/ja/phases/${regularPhaseId}/weeks/${regularWeekId}`, waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1500 } },
  { name: "12-result-entry.png", path: `/ja/matches/${regularResultEntryMatchId}/result_entry/edit`, waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1600 } },
  { name: "13-tournament-phase.png", path: `/ja/leagues/${tournamentLeagueId}/phases/${tournamentPhaseId}`, waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1300 } },
  { name: "14-bracket.png", path: `/ja/leagues/${tournamentLeagueId}/phases/${tournamentPhaseId}/bracket`, waitFor: ".bracket-canvas", selector: ".bracket-canvas", viewport: { width: 2800, height: 2200 } },
  { name: "15-tournament-match-edit.png", path: `/ja/matches/${tournamentMatchId}/edit`, waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1400 } },
  { name: "16-organizer-members.png", path: "/ja/organizer_members", waitFor: "main.content", selector: "main.content", viewport: { width: 1600, height: 1400 } },
];

async function login(page, currentLoginId, currentPassword) {
  await page.goto(`${baseUrl}/ja/session/new`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="login_id"]');
  await page.fill('input[name="login_id"]', currentLoginId);
  await page.fill('input[name="password"]', currentPassword);
  await Promise.all([
    page.waitForURL(/\/ja\/(dashboard|organizer_setup\/new)/),
    page.locator('input[type="submit"], button[type="submit"]').click(),
  ]);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(400);
}

async function captureShot(page, shot) {
  await page.setViewportSize(shot.viewport);
  await page.goto(`${baseUrl}${shot.path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(shot.waitFor);
  await page.waitForTimeout(500);

  const outputPath = path.join(outputDir, shot.name);
  await page.locator(shot.selector).screenshot({ path: outputPath });
  console.log(`captured ${shot.name}`);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 1,
  });

  const registrationPage = await context.newPage();
  await captureShot(registrationPage, shots[0]);

  const onboardingPage = await context.newPage();
  await login(onboardingPage, onboardingLoginId, onboardingPassword);
  await captureShot(onboardingPage, shots[1]);

  const appPage = await context.newPage();
  await captureShot(appPage, shots[2]);
  await login(appPage, loginId, password);

  for (const shot of shots.slice(3)) {
    await captureShot(appPage, shot);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
