// tslint:disable no-console

import {from, of, forkJoin, Observable} from 'rxjs';
import {Page} from 'puppeteer-core';
import * as tr from './trello';
import {mergeMap, map, reduce} from 'rxjs/operators';
import * as jsYaml from 'js-yaml';
import {launch, waitForVisible} from './puppeteer';
import {Issue} from './jira';
const log = require('log4js').getLogger('jira-helper');

export interface TrelloBoard {
  name: string;
  cards: TrelloCard[];
}

export interface TrelloCard {
  title: string;
  shortId: string;
}

export async function listTrello() {
  const browser = await launch(false);

  const pages = await browser.pages();
  // const page = await browser.newPage();
  console.time('get page');
  // tslint:disable-next-line: max-line-length
  const url = 'https://trello.com/b/i6yaHbFX';
  log.info('GET ' + url);

  await pages[0].goto(url, {timeout: 0, waitUntil: 'networkidle2'});
  console.log('fetching trello done');
  console.timeEnd('get page');
  const columns = await listColumn(pages[0]);
  console.log(jsYaml.safeDump(columns));
  await browser.close();
  console.log('Have a nice day');
}

async function listColumn(page: Page): Promise<tr.TrelloBoard[]> {
  await page.waitFor('#board', {visible: true});
  const columns = await page.$$('#board > .list-wrapper > .list');

  return of(...columns).pipe(
    mergeMap(columnEl => {
      return forkJoin(
        from(columnEl.$('.list-header h2')).pipe(
          mergeMap(bdTitle => from(bdTitle!.getProperty('innerText'))),
          mergeMap(value => from(value.jsonValue() as Promise<string>))
        ),
        from(columnEl.$$('.list-card .list-card-title')).pipe(
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
    reduce<tr.TrelloBoard>((columns, bd) => {
      columns.push(bd);
      return columns;
    }, [])
  ).toPromise();
}

async function syncFromJira(page: Page, issues: Issue[]) {
  const columns = await page.$$('#board > .list-wrapper > .list');
  const colNames: string[] = await Promise.all(columns.map(async col => (await
    (await col.$('.list-header h2'))!.getProperty('innerText')
    ).jsonValue()
  ));

  const colNameSet = new Set(colNames.map(name => /^([\S]+)/.exec(name)![1])); // get space separated prefix
  console.log('existing column for projects:\n', Array.from(colNameSet.values()).join('\n'));

  for (const issue of issues) {
    const colName = issue.id.slice(0, issue.id.indexOf('-'));
    if (!colNameSet.has(colName)) {
      await createColumn(page, colName);
    }
  }
}

export async function test() {
  const browser = await launch(false);
  const page = (await browser.pages())[0];
  await page.goto(
    // tslint:disable-next-line: max-line-length
    'https://trello.com/b/i6yaHbFX',
    {waitUntil: 'networkidle2', timeout: 120000});
  // await createColumn(page);
  await syncFromJira(page, [{
    id: 'BCL-TEST',
    name: 'test issue',
    status: '',
    ver: ['abc'],
    assignee: 'superman'
  }]);
}
async function createColumn(page: Page, name: string) {
  const column = await page.$('#board > .js-add-list');
  if (column == null)
    throw new Error('Add column button is not found');
  await page.waitForSelector('#board > .js-add-list a.open-add-list', {visible: true});
  await (await column.$('a.open-add-list'))!.click();
  await page.waitFor(400);
  await (await column.$('input[type=text]'))!.type(name, {delay: 150});
  const button = await column.$('input.js-save-edit');
  await button!.click();
  await waitForVisible(button!, false);
  console.log('Column %s added', name);
}

