// tslint:disable: no-console
import {from, forkJoin, Observable} from 'rxjs';
import pup from 'puppeteer-core';
import * as tr from './trello';
// import * as jira from './jira';
import {mergeMap, map, reduce} from 'rxjs/operators';
import * as jsYaml from 'js-yaml';
const log = require('log4js').getLogger('jira-helper');
import Path from 'path';
import api from '__api';
import _ from 'lodash';

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

export async function listTrello() {
  const browser = await launch(false);

  const pages = await browser.pages();
  // const page = await browser.newPage();
  console.time('get page');
  // tslint:disable-next-line: max-line-length
  const url = 'https://trello.com/b/i6yaHbFX/%E8%B4%9D%E7%94%A8%E9%87%91%E8%B4%9D%E5%88%86%E6%9C%9F%E4%BA%A7%E5%93%81%E5%8E%9F%E4%BF%A1%E7%94%A8%E4%BA%8B%E4%B8%9A%E9%83%A8%E5%89%8D%E7%AB%AF%E5%9B%A2%E9%98%9F';
  log.info('GET ' + url);

  await pages[0].goto(url, {timeout: 0, waitUntil: 'networkidle2'});
  console.log('fetching trello done');
  console.timeEnd('get page');
  const boards = await listBoards(pages[0]);
  console.log(jsYaml.safeDump(boards));
  await browser.close();
  console.log('Have a nice day');
}

async function listBoards(page: pup.Page): Promise<tr.TrelloBoard[]> {
  await page.waitFor('#board', {visible: true});
  const boards = await page.$$('#board > .list-wrapper > .list');

  return from(boards).pipe(
    mergeMap(boardEl => {
      return forkJoin(
        from(boardEl.$('.list-header h2')).pipe(
          mergeMap(bdTitle => from(bdTitle!.getProperty('innerText'))),
          mergeMap(value => from(value.jsonValue() as Promise<string>))
        ),
        from(boardEl.$$('.list-card .list-card-title')).pipe(
          mergeMap(cards => from(cards)),
          mergeMap(card => {
            return forkJoin(
              from(card.$('.card-short-id')).pipe(
                mergeMap(id => id!.getProperty('innerText')),
                mergeMap(jh => from(jh.jsonValue()) as Observable<string>)
              ),
              from(card.getProperty('innerText')).pipe(
                mergeMap(jh => from(jh.jsonValue()) as Observable<string>)
              ));
          }),
          map(([shortId, title]) => ({title, shortId} as tr.TrelloCard)),
          reduce<tr.TrelloCard>((cards, card)=> {
            cards.push(card);
            return cards;
          }, [])
        )
      );
    }),
    map(([name, cards]) => {
      // log.info(` [ ${name} ] `);
      // log.info(cards.map(card => `  - ${card.shortId}: ${card.title}`).join('\n'));
      return {name, cards} as tr.TrelloBoard;
    }),
    reduce<tr.TrelloBoard>((boards, bd) => {
      boards.push(bd);
      return boards;
    }, [])
  ).toPromise();
}

export function main() {
  console.log(api.argv);
}

