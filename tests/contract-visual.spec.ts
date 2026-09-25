import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test('verify contract specimens', async ({ page }) => {
  const stdFilePath = 'file://' + path.resolve('tmp/contract-specimens/standard_contract_specimen.html');
  await page.goto(stdFilePath, { waitUntil: 'networkidle' });

  const verificationDir = '/home/jules/verification';
  if (!fs.existsSync(verificationDir)) fs.mkdirSync(verificationDir, { recursive: true });

  const screenshotPath = path.join(verificationDir, 'contract_verification.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await page.pdf({ path: path.resolve('tmp/contract-specimens/standard_contract_specimen.pdf'), format: 'A4', printBackground: true });

  const nurseFilePath = 'file://' + path.resolve('tmp/contract-specimens/international_nurse_contract_specimen.html');
  await page.goto(nurseFilePath, { waitUntil: 'networkidle' });
  await page.pdf({ path: path.resolve('tmp/contract-specimens/international_nurse_contract_specimen.pdf'), format: 'A4', printBackground: true });
});
