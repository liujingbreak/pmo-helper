// tslint:disable: no-console
import {from, forkJoin, Observable} from 'rxjs';
import pup from 'puppeteer-core';
import * as tr from './trello';
import {mergeMap, map, reduce} from 'rxjs/operators';
import * as jsYaml from 'js-yaml';
const log = require('log4js').getLogger('jira-helper');
import Path from 'path';


// import os from 'os';
export async function login() {
  const browser = await launch();
  const pages = await browser.pages();
  await pages[0].goto('https://trello.com',
    {timeout: 0, waitUntil: 'domcontentloaded'});
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
      executablePath = Path.resolve(
      process.env['ProgramFiles(x86)'] || 'c:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe');
      break;
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
      log.info(` [ ${name} ] `);
      log.info(cards.map(card => `  - ${card.shortId}: ${card.title}`).join('\n'));
      return {name, cards} as tr.TrelloBoard;
    }),
    reduce<tr.TrelloBoard>((boards, bd) => {
      boards.push(bd);
      return boards;
    }, [])
  ).toPromise();
}



