// tslint:disable: no-console
import Path from 'path';
import pup from 'puppeteer-core';
import api from '__api';
const log = require('log4js').getLogger('jira-helper');

// import os from 'os';
export async function login() {
  const browser = await launch();
  const pages = await browser.pages();
  await pages[0].goto('https://trello.com',
    {timeout: 0, waitUntil: 'domcontentloaded'});
}

export async function launch(headless = false): Promise<pup.Browser> {
  let executablePath: string;

  switch (process.platform) {
    // Refer to https://chromium.googlesource.com/chromium/src/+/master/docs/user_data_dir.md#Mac-OS-X
    case 'darwin':
      executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      break;
    case 'win32':
      executablePath = Path.resolve(
      process.env['ProgramFiles(x86)'] || 'c:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe');
      break;
    default:
      const msg = 'jira-helper does not support this platform ' + process.platform;
      log.error(msg);
      throw new Error(msg);
  }
  if (api.argv.headless === true) {
    log.info('Enable headless mode');
    headless = true;
  }
  const browser = await pup.launch({
    headless,
    executablePath: executablePath!,
    userDataDir: process.cwd() + '/dist/puppeteer-temp',
    ignoreHTTPSErrors: true,
    defaultViewport: {width: 1236, height: 768}
  });
  return browser;
}

export function main() {
  console.log(api.argv);
}

export async function isVisible(el: pup.ElementHandle) {
  if (el == null)
    return false;
  const box = await el.boundingBox();
  if (box == null || box.height < 5 || box.width < 5)
    return false;
  return true;
}

export async function waitForVisible(el: pup.ElementHandle, visible = true, timeout = 30000) {
  const begin = new Date().getTime();
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 150));
    if ((await isVisible(el)) === visible)
      break;
    if (new Date().getTime() - begin > timeout) {
      throw new Error('timeout');
    }
  }
}
