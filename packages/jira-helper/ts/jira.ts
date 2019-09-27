// tslint:disable no-console
import fs from 'fs';
import {launch} from './puppeteer';
import * as jsYaml from 'js-yaml';
import _ from 'lodash';
import pup from 'puppeteer-core';
import moment from 'moment';
import api from '__api';
moment.locale('zh-cn');
const log = require('log4js').getLogger('jira-helper');

export interface Issue {
  brief?: string;
  name: string;
  id: string;
  status: string;
  desc?: string;
  ver: string[];
  assignee: string;
  tasks?: Issue[];
  parentId?: string;
  est?: number; // estimation duration
  intEst?: number; // API integration estimation duration

  '+'?: {[assignee: string]: string[]};
}

type NewTask = {[key in keyof Issue]?: Issue[key]} & {name: string};

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
    log.info('Page %s: %s', pageIdx++, page.url());
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
    const table = await page.$('#issuetable');
    const done = await Promise.all(
      (await table!.$$(':scope > tbody > tr')).map(async row => {
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

        if (trimedMap.aggregatetimeestimate) {
          issue.est = estimationToNum(trimedMap.aggregatetimeestimate.trim());
        }
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

  const includeProj = api.argv.include ?
    new Set<string>((api.argv.include as string).split(',').map(el => el.trim()) ):
      null;
  if (includeProj)
    console.log('include project prfiex: ', includeProj);

  const includeVer = api.argv.includeVersion ?
    (api.argv.includeVersion + '').split(',').map(el => el.trim().toLocaleLowerCase()) : null;


  const browser = await launch(false);
  const pages = await browser.pages();
  await pages[0].goto(url, {timeout: 0, waitUntil: 'networkidle2'});
  await pages[0].waitFor('#issuetable > tbody', {visible: true});
  // tslint:disable-next-line: no-console
  log.info('fetching page done');
  const page = pages[0];

  let issues = await domToIssues(page, forStorys);

  if (includeProj) {
    issues = issues.filter(issue => {
      const prefix = issue.id.slice(0, issue.id.indexOf('-'));
      return includeProj.has(prefix);
    });
  }

  if (includeVer) {
    issues = issues.filter(issue => {
      // console.log(issue.ver, includeVer);
      return issue.ver.map(ver => ver.toLowerCase())
        .some(version => includeVer.some(include => version.indexOf(include) >= 0));
    });
  }


  log.info('Num of stories:', issues.length);


  // for (const issue of issues) {
  async function forStorys(trPairs: [Issue, pup.ElementHandle][]) {
    for (const [issue, tr] of trPairs) {
      const prefix = issue.id.slice(0, issue.id.indexOf('-'));
      if (includeProj && !includeProj.has(prefix) ||
        includeVer && !issue.ver.map(ver => ver.toLowerCase())
          .some(version => includeVer.some(include => version.indexOf(include) >= 0))) {
        continue;
      }

      const anchors = await tr.$$(`:scope > .issuekey > a.issue-link[data-issue-key=${issue.id}]`);

      let linkClicked = false;
      for (const anchor of anchors) {
        const bx = await anchor.boundingBox();

        if (bx && bx.height > 10 && bx.width > 10) {
          log.info('Go issue details: ', issue.id);
          await anchor.click();
          await page.waitForSelector('.list-view', {hidden: true});
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

export async function sync() {
  const browser = await launch(false);
  const pages = await browser.pages();

  const issueByProj: {[proj: string]: Issue[]} = jsYaml.load(fs.readFileSync(
    api.argv.file ? api.argv.file : 'dist/list-story.yaml', 'utf8'));

  for (const proj of Object.keys(issueByProj)) {
    const issues = issueByProj[proj];
    log.info(issues.length);
    for (const issue of issues) {
      if (issue.tasks) {
        log.info('Check issue', issue.id);

        const tasksWithoutId = issue.tasks
        .filter(task => task.id == null);
        // log.info(tasksWithoutId);
        if (tasksWithoutId.length > 0)
          await createTasks(issue, tasksWithoutId, pages[0]);
      }
      const toAdd = issue['+'];
      if (toAdd) {
        const tasks: NewTask[] = [];
        for (const assignee of Object.keys(toAdd)) {
          for (const line of toAdd[assignee]) {
            const [name, desc] = line.split(/[\r\n]+/);
            const item: NewTask = {
              name,
              desc,
              assignee
            };
            tasks.push(item);
          }
        }
        await createTasks(issue, tasks, pages[0]);
      }
    }
  }
  await browser.close();
}

async function createTasks(parentIssue: Issue, tasks: NewTask[], page: pup.Page) {
  await page.goto('https://issue.bkjk-inc.com/browse/' + parentIssue.id,
    {timeout: 0, waitUntil: 'networkidle2'});
  const remoteTasks = await listSubtasks(page, parentIssue);
  parentIssue.ver = await Promise.all((await page.$$('#fixfor-val a'))
    .map(a => a.getProperty('innerText').then(jh => jh.jsonValue())));

  const isHdecor = parentIssue.id.startsWith('HDECOR');
  const prefix = isHdecor ? '装贝-FE-' : 'FE - ';
  tasks.forEach(task => {
    if (!task.name.startsWith(prefix))
      task.name = prefix + task.name;
  });
  const toAdd = _.differenceBy(tasks, remoteTasks, issue => issue.name);
  // log.info('Creating new issue\n', toAdd);

  for (const item of toAdd) {
    item.ver = parentIssue.ver;
    await _addSubTask(page, item);
  }
}

async function _addSubTask(page: pup.Page, task: NewTask) {
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
    .then(input => input!.type(task.name));

  const input = await dialog.$('#fixVersions-textarea');
  await input!.click();
  log.info('version:', task.ver![0]);
  await input!.type(task.ver![0], {delay: 100});
  await page.keyboard.press('Enter');
  await dialog.$('#description-wiki-edit').then(el => el!.click());
  await page.keyboard.type(task.desc ? task.desc : task.name);

  const labels = await dialog.$$('.field-group > label');

  const texts = await Promise.all(
    labels.map(label => label.getProperty('innerText').then(v => v.jsonValue() as Promise<string>)));
  const labelMap: {[name: string]: pup.ElementHandle} = {};
  texts.forEach((text, idx) => labelMap[text.split(/[\n\r\t]+/)[0]] = labels[idx]);
  // log.info(Object.keys(labelMap));

  const matchName = /[(（]([0-9.]+[dhDH]?)[)）]\s*$/.exec(task.name);
  let duration = matchName ? matchName[1] : '0.5d';
  if (!duration.endsWith('d') && !duration.endsWith('h')) {
    duration = duration + 'd';
  }
  const dates = date();
  const formValues = {
    'Start date': dates[0],
    'End date': endDateBaseOnVersion(task.ver![0]) || dates[1],
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

export async function listParent() {
  const browser = await launch(false);
  const page = (await browser.pages())[0];

  const storyMap = new Map<string, Issue>();
  // tslint:disable-next-line: max-line-length
  await page.goto('https://issue.bkjk-inc.com/issues/?filter=14109',
    {waitUntil: 'networkidle2'});
  await domToIssues(page, async rows => {
    for (const [issue, tr] of rows) {
      if (issue.parentId) {
        const link = await tr.$(':scope > td.summary a.issue-link');
        const pname = await page
        .evaluate(el => el.getAttribute('title'), link);
        let pIssue: Issue;
        if (!storyMap.has(issue.parentId)) {
          pIssue = {
            brief: pname,
            name: pname,
            id: issue.parentId,
            status: '',
            assignee: '',
            ver: [],
            est: 0,
            tasks: []
          };
          storyMap.set(issue.parentId, pIssue);
        } else {
          pIssue = storyMap.get(issue.parentId)!;
        }
        if (/API\s*联调/i.test(issue.name)) {
          pIssue.intEst = issue.est;
        } else {
          pIssue.est! += issue.est!;
        }
        pIssue.tasks!.push(issue);
      }
    }
  });

  console.log('Writted to dist/parent-story.yaml');
  const stories = Array.from(storyMap.values());
  fs.writeFileSync('dist/parent-story.yaml', jsYaml.safeDump(stories));
  console.log(stories.map(story => displayIssue(story)).join('\n'));
  browser.close();
}

function date(): [string, string] {
  const time = moment();
  // console.log(time.format('D/MMMM/YY'), time.add(21, 'days').format('D/MMMM/YY'));
  return [time.format('D/MMMM/YY'), time.add(21, 'days').format('D/MMMM/YY')];
}

function estimationToNum(estimationStr: string) {
  const match = /([0-9.]+)(日|小时|分)/.exec(estimationStr);
  if (!match) {
    throw new Error(`Invalide estimation format: ${estimationStr}`);
  }
  if (match[2] === '小时') {
    return parseFloat(match[1]) / 8;
  } else if (match[2] === '分') {
    return parseInt(match[1], 10) / 8 / 60;
  }
  return parseFloat(match[1]);
}

function displayIssue(issue: Issue): string {
  return issue.id + ` ${issue.name} (${issue.est}) | API int:${issue.intEst || '0'}`;
}

function endDateBaseOnVersion(ver: string) {
  const verMatch = /[ /](\d{1,2})(\d\d)$/.exec(ver);
  if (verMatch == null || verMatch[1] == null)
    return null;
  let time = moment();
  time.month(parseInt(verMatch[1], 10) - 1);
  time.date(parseInt(verMatch[2], 10));
  time.subtract(5, 'days');
  if (time.isBefore(new Date())) {
    time = moment();
    time.add(2, 'days');
  }
  return time.format('D/MMMM/YY');
}

export function testDate() {
  console.log(endDateBaseOnVersion('feafa/903'));
}

export async function syncTask4Parent() {
  const browser = await launch(false);
  await browser.newPage();
  const pages = await browser.pages();
  const url = 'https://issue.bkjk-inc.com/issues/?filter=14109';
  await pages[1].goto(url, {timeout: 0, waitUntil: 'networkidle2'});

  const parentSet = new Set<string>();

  await domToIssues(pages[1], async rows => {
    rows = rows.filter(([task]) => task.status === '开放' || task.status === 'DEVELOPING');
    parentSet.clear();
    for (const row of rows) {
      const [task] = row;
      // console.log(task);
      if (task.parentId) {
        parentSet.add(task.parentId);
      }
    }
    const jql = 'jql=' + encodeURIComponent(`id in (${Array.from(parentSet.values()).join(',')})`);
    await pages[0].goto('https://issue.bkjk-inc.com/issues/?' + jql);
    const parentMap = (await domToIssues(pages[0])).reduce((map, issue) => {
      map.set(issue.id, issue);
      return map;
    }, new Map<string, Issue>());
    for (const [task, tr] of rows) {
      const parent = parentMap.get(task.parentId!);
      if (task.parentId && task.ver[0] !== parent!.ver[0]) {
        console.log('incorrect:', task.id + '-' + task.name, ` ${task.ver[0]} (parent: ${parent!.ver[0]}) `);
        await (await tr.$$(':scope > .summary .issue-link'))[1].click();
        const editButton = await pages[1].waitForSelector('#edit-issue', {visible: true});
        await editButton.click();

        await editIssue(pages[1], tr, {
          ver: parent!.ver
        });
        await pages[1].goBack();
        await pages[1].waitFor(800);
      }
    }
  });
  await browser.close();
}

async function editIssue(page: pup.Page, tr: pup.ElementHandle<Element>, task: {[key in keyof Issue]?: Issue[key]}) {
  const dialog = await page.waitForSelector('#edit-issue-dialog', {visible: true});

  if (task.name) {
    console.log('change name to ', task.name);
    await dialog.$('input[name=summary]')
      .then(input => input!.type(task.name!));
  }

  if (task.ver && task.ver.length > 0) {
    console.log('change version to ', task.ver[0]);
    const input = await dialog.$('#fixVersions-textarea');
    await input!.click();
    for (let i=0; i<5; i++)
      await input!.press('Backspace', {delay: 150});
    // await page.waitFor(1000);
    await input!.type(task.ver[0], {delay: 100});
    await page.keyboard.press('Enter');
  }

  if (task.desc != null) {
    console.log('change description to', task.desc);
    await dialog.$('#description-wiki-edit').then(el => el!.click());
    await page.keyboard.type(task.desc ? task.desc : task.name!);
  }

  const labels = await dialog.$$('.field-group > label');

  const texts = await Promise.all(
    labels.map(label => label.getProperty('innerText').then(v => v.jsonValue() as Promise<string>)));
  const labelMap: {[name: string]: pup.ElementHandle} = {};
  texts.forEach((text, idx) => labelMap[text.split(/[\n\r\t]+/)[0]] = labels[idx]);
  // log.info(Object.keys(labelMap));

  // const matchName = /[(（]([0-9.]+[dhDH]?)[)）]\s*$/.exec(task.name);
  // let duration = matchName ? matchName[1] : '0.5d';
  // if (!duration.endsWith('d') && !duration.endsWith('h')) {
  //   duration = duration + 'd';
  // }
  const dates = date();
  const formValues = {
    // 'Start date': dates[0],
    'End date': endDateBaseOnVersion(task.ver![0]) || dates[1]
    // tslint:disable-next-line: object-literal-key-quotes
    // '初始预估': duration,
    // 剩余的估算: duration,
    // 经办人: task.assignee || '刘晶'
  };

  for (const name of Object.keys(labelMap)) {
    if (!_.has(formValues, name))
      continue;
    await labelMap[name].click({delay: 50});
    await new Promise(resolve => setTimeout(resolve, 200));
    const inputId = '#' + await page.evaluate(label => label.getAttribute('for'), labelMap[name]);
    console.log(inputId);
    const value = await page.$eval(inputId, input => (input as HTMLInputElement).value);
    console.log('Current %s:', name, value);
    if (value) {
      for (let i = 0, l = value.length + 2; i < l; i++)
        page.keyboard.press('ArrowRight', {delay: 50});
      for (let i = 0, l = value.length + 5; i < l; i++)
        await page.keyboard.press('Backspace', {delay: 50});
    }

    await page.keyboard.type(formValues[name], {delay: 50});
    // if (name === '经办人') {
    //   await new Promise(resolve => setTimeout(resolve, 500)); // wait for JIRA searching user
    //   await page.keyboard.press('Enter', {delay: 50});
    // }
  }
  // await (await dialog.$('.buttons > .cancel'))!.click();
  await (await dialog.$('#edit-issue-submit'))!.click();
  await page.waitFor('#edit-issue-dialog', {hidden: true});

  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.waitFor(800);
}
