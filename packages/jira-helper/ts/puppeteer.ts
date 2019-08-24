// tslint:disable: no-console
import pup from 'puppeteer-core';
import * as tr from './trello';
const log = require('log4js').getLogger('jira-helper');
// import Path from 'path';

// import os from 'os';
export function login() {
  return launch();
}

async function launch(headless = false) {
  let executablePath: string;
  // let userDataDir: string;

  switch (process.platform) {
    // Refer to https://chromium.googlesource.com/chromium/src/+/master/docs/user_data_dir.md#Mac-OS-X
    case 'darwin':
      executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      break;
    case 'win32':
    default:
      console.log('jira-helper does not support this platform', process.platform);
    // process.exit(1);
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

export async function run() {
  const browser = await launch(true);
  const pages = await browser.pages();
  // const page = await browser.newPage();
  // tslint:disable-next-line: max-line-length
  await pages[0].goto('https://trello.com/b/i6yaHbFX/%E8%B4%9D%E7%94%A8%E9%87%91%E8%B4%9D%E5%88%86%E6%9C%9F%E4%BA%A7%E5%93%81%E5%8E%9F%E4%BF%A1%E7%94%A8%E4%BA%8B%E4%B8%9A%E9%83%A8%E5%89%8D%E7%AB%AF%E5%9B%A2%E9%98%9F',
    {timeout: 0, waitUntil: 'load'});
  console.log('fetching trello done');
  await listBoards(pages[0]);

  await browser.close();
  console.log('Have a nice day');
}

async function listBoards(page: pup.Page): Promise<tr.TrelloBoard[]> {
  await page.waitFor('#board', {visible: true});
  const boards = await page.$$('#board > .list-wrapper > .list');
  const values: tr.TrelloBoard[] = await Promise.all(boards.map(async bd => {
    const boardNameP = getProp<string>(bd.$('.list-header h2'));

    const cardsP = bd.$$('.list-card .list-card-title')
    .then(els => Promise.all(els.map(async el => (await el.getProperty('innerText')).jsonValue() as Promise<string>)));
    const [name, cards] = await Promise.all([boardNameP, cardsP]);
    log.info('[ %s ]\n', name, cards.map(card => `  - ${card}`).join('\n'));
    return {
      name: name || '',
      cards: cards.map(card => ({title: card}))
    };
  }));
  return values;
}

async function getProp<T extends string | number>(elp: Promise<pup.ElementHandle | null>, prop = 'innerHTML') {
  const el = await elp;
  if (el == null)
    return null;
  return (await el.getProperty(prop)).jsonValue() as Promise<T>;
}


