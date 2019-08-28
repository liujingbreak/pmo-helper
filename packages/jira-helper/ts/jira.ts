// tslint:disable no-console
import fs from 'fs';
import {launch} from './puppeteer';
import * as jsYaml from 'js-yaml';
import _ from 'lodash';
import pup from 'puppeteer-core';

const log = require('log4js').getLogger('jira-helper');

export interface Issue {
  name: string;
  id: string;
  status: string;
  desc?: string;
  ver: string[];
  assignee: string;
  tasks?: Issue[];
  parentId?: string;
}

// export function columnsToIssue(...cols: string[]): Issue {
//   return {
//     name: cols[2],
//     id: cols[0],
//     status: cols[1],
//     ver: [cols[3]],
//     assignee: cols[4]
//   };
// }

export async function login() {
  const browser = await launch(false);
  const pages = await browser.pages();
  await pages[0].goto('https://issue.bkjk-inc.com',
    {timeout: 0, waitUntil: 'domcontentloaded'});
}

// export await function waitForCondition()

export async function domToIssues(page: pup.Page,
  onEachPage?: (trPairs: [Issue, pup.ElementHandle][]) => Promise<void>
) {
  let issues: Issue[] = [];
  let pageIdx = 1;
  while (true) {
    log.info('Page %s: %s', ++pageIdx, page.url());
    const currPageIssues = await fetchPage();
    issues = issues.concat(currPageIssues);
    const nextPageLink = await page.$('.pagination > a.nav-next');
    if (nextPageLink == null)
      break;
    await nextPageLink.click();
    // check first cell, wait for its DOM mutation

    const lastFirstRowId = currPageIssues[0].id;

    await page.waitForFunction((originIssueId) => {
      const td: HTMLElement | null = document.querySelector('#issuetable > tbody > tr > td');
      return td && td.innerText.length > 0 && td.innerText.trim() !== originIssueId;
    }, {polling: 'mutation'}, lastFirstRowId);
    await page.waitFor(500);
  }

  async function fetchPage() {
    const trPairs: [Issue, pup.ElementHandle][] = [];
    const done = await Promise.all(
      (await page.$$('#issuetable > tbody > tr')).map(async row => {
        const clsMap = await row.$$eval(':scope > td', els => {
          const colMap: {[k: string]: string} = {};
          els.forEach(el => {
            colMap[el.className] = (el as HTMLElement).innerText;
          });
          return colMap;
        });

        // log.info(clsMap);
        const trimedMap: {[k: string]: string} = {};
        for (const key of Object.keys(clsMap)) {
          trimedMap[key.trimLeft().split(/[\n\r]+/)[0]] = clsMap[key].trim();
        }
        // create Issue object
        const issue: Issue = {
          name: '',
          ver: [trimedMap.fixVersions],
          status: trimedMap.status,
          assignee: trimedMap.assignee,
          id: trimedMap.issuekey
        };
        if (onEachPage)
          trPairs.push([issue, row]);

        // assign issue name and issue parent id
        const links = await row.$$(':scope > td.summary a.issue-link');
        if (links.length > 1) {
          const parentId: string = await (await links[0].getProperty('innerText')).jsonValue();
          issue.parentId = parentId;
          issue.name = await (await links[1].getProperty('innerText')).jsonValue();
        } else {
          issue.name = await (await links[0].getProperty('innerText')).jsonValue();
        }

        issue.ver = await Promise.all(
          (await row.$$(':scope > td.fixVersions > *'))
          .map(async a => (await a.getProperty('innerText')).jsonValue())
        );
        return issue;
      })
    );
    if (onEachPage)
      await onEachPage(trPairs);

    return done;
  }

  return issues;
}

export async function listStory(
  // tslint:disable-next-line: max-line-length
  url = 'https://issue.bkjk-inc.com/issues/?filter=14118') {
  const browser = await launch(false);
  const pages = await browser.pages();
  await pages[0].goto(url, {timeout: 0, waitUntil: 'networkidle2'});
  await pages[0].waitFor('#issuetable > tbody', {visible: true});
  // tslint:disable-next-line: no-console
  log.info('fetching page done');
  const page = pages[0];

  const issues = await domToIssues(page, forStorys);

  log.info('Num of stories:', issues.length);

  // for (const issue of issues) {
  async function forStorys(trPairs: [Issue, pup.ElementHandle][]) {
    for (const [issue, tr] of trPairs) {
      const anchors = await tr.$$(`:scope > .issuekey > a.issue-link[data-issue-key=${issue.id}]`);

      let linkClicked = false;
      for (const anchor of anchors) {
        const bx = await anchor.boundingBox();
        if (bx && bx.height > 10 && bx.width > 10) {
          log.info('Go issue details: ', issue.id);
          await anchor.click();

          await page.waitFor(300);
          issue.tasks = await listSubtasks(page, issue);
          await page.goBack({waitUntil: 'networkidle0'});
          linkClicked = true;
          break;
        }
      }
      if (!linkClicked) {
        throw new Error(`Can not find link for ${issue.id}`);
      }
    }
  }

  const grouped = _.groupBy(issues, issue => issue.id.slice(0, issue.id.indexOf('-')));

  fs.writeFileSync('dist/list-story.yaml', jsYaml.safeDump(grouped));
  log.info('Result has been written to dist/list-story.yaml');

  await browser.close();
  // tslint:disable-next-line: no-console
  console.log('Have a nice day');
}

export async function syncToJira() {
  const browser = await launch(false);
  const pages = await browser.pages();

  const issueByProj: {[proj: string]: Issue[]} = jsYaml.load(fs.readFileSync('dist/sync-to-jira.yaml', 'utf8'));

  for (const proj of Object.keys(issueByProj)) {
    const issues = issueByProj[proj];
    log.info(issues.length);
    for (const issue of issues) {
      if (!issue.tasks)
        continue;
      log.info('Check issue', issue.id);

      const tasksWithoutId = issue.tasks.filter(task => task.id == null);
      // log.info(tasksWithoutId);
      if (tasksWithoutId.length === 0)
        continue;
      await pages[0].goto('https://issue.bkjk-inc.com/browse/' + issue.id, {timeout: 0, waitUntil: 'networkidle2'});
      const remoteTasks = await listSubtasks(pages[0], issue);
      issue.ver = await pages[0].$('#fixfor-val').then(el => el!.getProperty('innerText')).then(jh => jh.jsonValue());

      const toAdd = _.differenceBy(tasksWithoutId, remoteTasks, issue => issue.name);
      log.info(toAdd);
      for (const item of toAdd) {
        item.ver = issue.ver;
        await addSubTask(pages[0], item);
      }
    }
  }
  browser.close();
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
  await input!.type(task.ver[0]);
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

async function listSubtasks(page: pup.Page, {ver}: {ver: string[]}) {
  const tasks = await page.$$eval('#view-subtasks #issuetable > tbody > tr', (els, ver) => {
    return els.map(el => {
      const name: HTMLElement | null = el.querySelector(':scope > .stsummary > a');
      const subtask: Issue = {
        name: name ? name.innerText.trim() : '',
        id: el.getAttribute('data-issuekey')!,
        status: (el.querySelector('.status') as HTMLElement).innerText.trim(),
        ver,
        // assignee: ''
        assignee: (el.querySelector('.assignee') as HTMLElement).innerText.trim()
      };
      return subtask;
    });
  }, ver);
  return tasks;
}
