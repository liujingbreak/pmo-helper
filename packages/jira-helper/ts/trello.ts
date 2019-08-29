// tslint:disable no-console

import {from, of, forkJoin, Observable} from 'rxjs';
import {Page} from 'puppeteer-core';
import * as tr from './trello';
import {mergeMap, map, reduce} from 'rxjs/operators';
import * as jsYaml from 'js-yaml';
import {launch, waitForVisible} from './puppeteer';
import {Issue} from './jira';
import axios, {AxiosResponse} from 'axios';

const log = require('log4js').getLogger('jira-helper');

const API_TOKEN = '38cfe637eacbbcf7bbd90b9ee83f31113d04b4d34fd79f13a5fe51608ba88028';
const API_KEY = '1846faaab21515d5bab05dec2fbda8bc';

export interface TrelloColumn {
  name: string;
  id?: string;
  cards: TrelloCard[];
}

export interface TrelloCard {
  title: string;
  shortId: string;
  id?: string;
}

interface TrelloApiCard {
  id: string;
  name: string;
  badges?: any[];
  labels?: any[];
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

async function listColumn(page: Page): Promise<tr.TrelloColumn[]> {
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
      return {name, cards} as tr.TrelloColumn;
    }),
    reduce<tr.TrelloColumn>((columns, bd) => {
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

export async function apiTest() {
  const res = await axios.get('https://api.trello.com/1/members/me/boards', {
    params: {
      key: API_KEY,
      token: API_TOKEN
    }});
  console.log(res.data);
}

export async function apiGetList(boardId = '5acdbf6678087812e8838ec4') {
  const res = await axios.get<TrelloColumn[]>(`https://api.trello.com/1/boards/${boardId}/lists`, {params: {
    key: API_KEY,
    token: API_TOKEN
  }});
  const list = res.data;
  const obs = list
  .map(list => from(axios.get<TrelloApiCard[]>(`https://api.trello.com/1/lists/${list.id}/cards`)));

  await forkJoin<AxiosResponse<TrelloApiCard[]>>(...obs).pipe(
    map(responses => {
      for (let i = 0, l = responses.length; i < l; i++) {
        // console.log(responses[i].data);
        // res.data[i].cards = responses[i].data;
        log.info('%s Number of cards', list[i].name, l);
      }
      console.log(responses[0].data[0]);
    })
  ).toPromise();
}

