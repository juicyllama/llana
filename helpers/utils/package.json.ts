import fs from 'fs';
import path from 'path';
import { cli_success } from './logging.js';

export async function addScriptToPackageJson(scriptName: string, scriptCommand: string) {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    if (!packageJson.scripts[scriptName]) {
      packageJson.scripts[scriptName] = scriptCommand;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      cli_success(`Script "${scriptName}" added to package.json`);
    }
  } catch (err) {
    console.error(`Error reading or writing package.json: ${err}`);
  }
}