// tslint:disable: no-console
import {from, forkJoin, Observable} from 'rxjs';
import pup from 'puppeteer-core';
import * as tr from './trello';
// import * as jira from './jira';
import {Issue, columnsToIssue} from './jira';
import {mergeMap, map, reduce} from 'rxjs/operators';
import * as jsYaml from 'js-yaml';
const log = require('log4js').getLogger('jira-helper');
import Path from 'path';
import api from '__api';
import fs from 'fs';
import _ from 'lodash';

// import os from 'os';
export async function login() {
  const browser = await launch();
  const pages = await browser.pages();
  await pages[0].goto('https://trello.com',
    {timeout: 0, waitUntil: 'domcontentloaded'});
}

async function launch(headless = false): Promise<pup.Browser> {
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

export async function run() {
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

export function main() {
  console.log(api.argv);
}

export async function loginJira() {
  const browser = await launch(false);
  const pages = await browser.pages();
  await pages[0].goto('https://issue.bkjk-inc.com',
    {timeout: 0, waitUntil: 'domcontentloaded'});
}


export async function listJira(
  // tslint:disable-next-line: max-line-length
  url = 'https://issue.bkjk-inc.com/issues/?filter=14086&jql=project%20%3D%20BYJ%20AND%20issuetype%20in%20(%E4%BB%BB%E5%8A%A1%2C%20%E6%95%85%E4%BA%8B)%20AND%20resolution%20%3D%20Unresolved%20AND%20fixVersion%20%3D%20%22%E8%B4%9D%E7%94%A8%E9%87%91v1.9%2F910%22%20ORDER%20BY%20key%20DESC%2C%20summary%20DESC%2C%20updated%20DESC') {
  const browser = await launch(false);
  const pages = await browser.pages();
  await pages[0].goto(url, {timeout: 0, waitUntil: 'networkidle2'});
  await pages[0].waitFor('#issuetable > tbody', {visible: true});
  console.log('fetching page done');
  const page = pages[0];

  const table = await page.$('#issuetable > tbody');

  const keys = await table!.$$('tr');
  const issues = await Promise.all(
    keys.map(async row => {
      const issue = await row.getProperty('innerText').then(v => v.jsonValue())
        .then((str: string) => str.split(/\s+/))
        .then(cols => columnsToIssue(...cols));
      return issue;
    })
  );

  for (const issue of issues) {
    await page.$$eval('a.issue-link', (els, issue) => {
      els.some(el => {
        if (el.getAttribute('data-issue-key') === issue.id) {
          (el as HTMLElement).click();
          return true;
        }
        return false;
      });
    }, issue);
    await page.waitFor(300);
    // await page.waitForNavigation({waitUntil: 'networkidle0'});
    // await page.goto('https://issue.bkjk-inc.com/browse/' + issue.id, {timeout: 0, waitUntil: 'networkidle2'});
    issue.tasks = await listSubtasks(page, issue.id);
    await page.goBack({waitUntil: 'networkidle0'});
  }
  log.info(jsYaml.safeDump(issues));

  await browser.close();
  console.log('Have a nice day');
}

export async function syncJira() {
  const browser = await launch(false);
  const pages = await browser.pages();

  const issues: Issue[] = jsYaml.load(fs.readFileSync(__dirname + '/../add-jira.yaml', 'utf8'));
  log.info(issues.length);
  for (const issue of issues) {
    if (!issue.tasks)
      continue;
    log.info('Check issue', issue.id);

    const tasksWithoutId = issue.tasks.filter(task => task.id == null);
    // log.info(tasksWithoutId);
    if (tasksWithoutId.length === 0)
      continue;

    const remoteTasks = await listSubtasks(pages[0], issue.id);
    issue.ver = await pages[0].$('#fixfor-val').then(el => el!.getProperty('innerText')).then(jh => jh.jsonValue());

    const toAdd = _.differenceBy(tasksWithoutId, remoteTasks, issue => issue.name);
    log.info(toAdd);
    for (const item of toAdd) {
      item.ver = issue.ver;
      await addSubTask(pages[0], item);
    }
  }
  browser.close();
}

export async function issueDetail() {
  const browser = await launch(false);
  const pages = await browser.pages();
  const tasks = await listSubtasks(pages[0], 'BYJ-2141');
  log.info(tasks);
  await browser.close();
}

async function addSubTask(page: pup.Page, task: Issue) {
  log.info('adding', task);
  const moreBtn = await page.$('#opsbar-operations_more');
  if (moreBtn == null)
    throw new Error('#opsbar-operations_more not found in page'); // click 更多
  // log.warn(await moreBtn.getProperty('innerText').then(jh => jh.jsonValue()));

  await moreBtn!.click({delay: 100});
  await page.waitFor('#opsbar-operations_more_drop', {visible: true});

  const menuItems = await page.$$('#opsbar-operations_more_drop .trigger-label');
  for (const item of menuItems) {
    const text: string = await item.getProperty('innerHTML').then(jh => jh.jsonValue());
    if (text === '创建子任务') {
      await item.click();
      break;
    }
  }

  await page.waitFor('#create-subtask-dialog', {visible: true});
  const dialog = await page.$('#create-subtask-dialog');
  if (!dialog)
    throw new Error('Adding issue dialog not found');

  await dialog.$('input[name=summary]')
    .then(input => input!.type(task.name.startsWith('FE ') ? task.name : 'FE - ' + task.name));

  const input = await dialog.$('#fixVersions-textarea');
  await input!.click();
  await input!.type(task.ver);
  await page.keyboard.press('Enter');
  await dialog.$('#description-wiki-edit').then(el => el!.click());
  await page.keyboard.type(task.desc ? task.desc : task.name);

  const labels = await dialog.$$('.field-group > label');

  const texts = await Promise.all(
    labels.map(label => label.getProperty('innerText').then(v => v.jsonValue() as Promise<string>)));
  const labelMap: {[name: string]: pup.ElementHandle} = {};
  texts.forEach((text, idx) => labelMap[text.split(/[\n\r\t]+/)[0]] = labels[idx]);
  // log.info(Object.keys(labelMap));

  const matchName = /[(（]([0-9.][dhDH]?)[)）]\s*$/.exec(task.name);
  let duration = matchName ? matchName[1] : '0.5d';
  if (!duration.endsWith('d') && !duration.endsWith('h')) {
    duration = duration + 'd';
  }
  const formValues = {
    'Start date': '26/八月/19',
    'End date': '26/九月/19',
    // tslint:disable-next-line: object-literal-key-quotes
    '初始预估': duration,
    剩余的估算: duration,
    经办人: task.assignee || '刘晶'
  };

  for (const name of Object.keys(labelMap)) {
    if (!_.has(formValues, name))
      continue;
    await labelMap[name].click({delay: 50});
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.keyboard.type(formValues[name], {delay: 50});
    if (name === '经办人') {
      await new Promise(resolve => setTimeout(resolve, 500)); // wait for JIRA searching user
      await page.keyboard.press('Enter', {delay: 50});
    }
  }
  await dialog.$('#create-issue-submit').then(btn => btn!.click());
  await page.waitFor('#create-subtask-dialog', {hidden: true});

  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function listSubtasks(page: pup.Page, issueId: string) {
  // await page.goto('https://issue.bkjk-inc.com/browse/' + issueId, {timeout: 0, waitUntil: 'networkidle2'});
  const tasks = await page.$$eval('#view-subtasks #issuetable > tbody > tr', (els) => {
    // return els.length;
    return els.map(el => {
      const name: HTMLElement | null = el.querySelector('.stsummary');
      const subtask: Issue = {
        id: el.getAttribute('data-issuekey')!,
        name: name ? name.innerText : '',
        // state: '',
        state: (el.querySelector('.status') as HTMLElement).innerText,
        ver: '',
        // assignee: ''
        assignee: (el.querySelector('.assignee') as HTMLElement).innerText
      };
      return subtask;
    });
  });
  return tasks;
}
