// tslint:disable no-console
import fs from 'fs';
import * as jsYaml from 'js-yaml';
import _ from 'lodash';
import moment from 'moment';
import pup from 'puppeteer-core';
import api from '__api';
import { launch } from './puppeteer';
moment.locale('zh-cn');
const log = require('log4js').getLogger('jira-helper');

const DEFAULT_TASK_MODULE_VALUE = '大C线-研发';
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
  endDate?: string;
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

async function domToIssues(page: pup.Page,
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
    if (table == null) return [] as Issue[];
    const cellTitles = await getCellTitles(table);
    log.info('List headers:',cellTitles.join(', '));
    const done = await Promise.all(
      (await table!.$$(':scope > tbody > tr')).map(async row => {

        // Fill title2ValueMap and clsMap
        const clsMap = await row.$$eval(':scope > td', els => {
          const colMap: {[k: string]: string} = {};
          for (let i = 0, l = els.length; i < l; i++) {
            const el = els[i];
            const value = (el as HTMLElement).innerText;
            colMap[el.className] = value;
          }
          return colMap;
        });

        const title2ValueMap: {[title: string]: string} = {};

        (await Promise.all((await row.$$(':scope > td')).map(async td => {
          return (await td.getProperty('innerText')).jsonValue();
        }))).forEach((value, i) => title2ValueMap[cellTitles[i++]] = value as string);

        // log.info(util.inspect(title2ValueMap));
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
          id: trimedMap.issuekey,
          endDate: title2ValueMap['End date']
        };
        if (onEachPage)
          trPairs.push([issue, row]);

        // assign issue name and issue parent id
        const links = await row.$$(':scope > td.summary a.issue-link');
        if (links.length > 1) {
          const parentId: string = await (await links[0].getProperty('innerText')).jsonValue() as string;
          issue.parentId = parentId;
          issue.name = await (await links[1].getProperty('innerText')).jsonValue() as string;
        } else {
          issue.name = await (await links[0].getProperty('innerText')).jsonValue() as string;
        }

        issue.ver = await Promise.all(
          (await row.$$(':scope > td.fixVersions > *'))
          .map(async a => (await a.getProperty('innerText')).jsonValue() as Promise<string>)
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

  // const grouped = _.groupBy(issues, issue => issue.id.slice(0, issue.id.indexOf('-')));
  const grouped = _.groupBy(issues, issue => issue.ver && issue.ver.length > 0 ? issue.ver[0] : 'No version');

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
            const [name] = line.split(/[\r\n]+/);
            const desc = line;
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
    .map(a => a.getProperty('innerText').then(jh => jh.jsonValue() as Promise<string>)));

  const isHdecor = parentIssue.id.startsWith('HDECOR');
  const prefix = isHdecor ? '装贝-FE-' : 'FE - ';
  tasks.forEach(task => {
    if (!task.name.startsWith(prefix))
      task.name = prefix + task.name;
  });
  const toAdd = _.differenceBy(tasks, remoteTasks, issue => issue.name);
  log.info('Creating new issue\n', toAdd);

  for (const item of toAdd) {
    item.ver = parentIssue.ver;
    await _addSubTask(page, item);
  }
}

async function _addSubTask(page: pup.Page, task: NewTask) {
  log.info('adding', task);
  await clickMoreButton(page, '创建子任务');

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
    if (name.indexOf('模块') >= 0 && !_.has(formValues, name)) {
      const id = (await labelMap[name].evaluate(el => el.getAttribute('for')));
      const inputEl = await page.$('#' + id);
      const value = await inputEl!.evaluate(el => (el as HTMLTextAreaElement).value);
      if (value.trim().length === 0) {
        await inputEl!.click();
        await page.keyboard.type(DEFAULT_TASK_MODULE_VALUE, {delay: 50});
      }
      continue;
    }
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
  return [time.format('D/MMMM/YY'), time.add(30, 'days').format('D/MMMM/YY')];
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
  const time = moment();
  time.month(parseInt(verMatch[1], 10) - 1);
  time.date(parseInt(verMatch[2], 10));
  // time.subtract(5, 'days');
  if (time.isBefore(new Date())) {
    time.add(1, 'years');
  }
  return time.format('D/MMMM/YY');
}

export function testDate() {
  console.log(endDateBaseOnVersion('feafa/903'));
  console.log(moment('15/十月/19', 'D/MMMM/YY').toDate());
}

/**
 * Check README.md for command line arguments
 */
export async function checkTask() {
  const browser = await launch(false);
  await browser.newPage();
  const pages = await browser.pages();
  const url = 'https://issue.bkjk-inc.com/issues/?filter=14109';
  await pages[1].goto(url, {timeout: 0, waitUntil: 'networkidle2'});

  const parentSet = new Set<string>();
  const compareToDate = moment().add(api.argv.endInDays || 3, 'days');
  log.info('Comparent to end date:', compareToDate.format('YYYY/M/D'));

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

    const parentMap = await listIssueByIds(pages[0], Array.from(parentSet.values()));

    for (const [task, tr] of rows) {
      const endDateObj = moment(task.endDate, 'D/MMMM/YY');
      if (task.endDate && endDateObj.isBefore(compareToDate)) {
        // tslint:disable-next-line:max-line-length
        log.warn(`End date:${task.endDate} "${displayIssue(task)}"`);
        if (api.argv.addDays) {
          await _editTr(pages[1], tr, {
            endDate: endDateObj.add(parseInt(api.argv.addDays, 10), 'days').format('D/MMMM/YY')
          });
        }
      }

      const parent = parentMap.get(task.parentId!);
      if (parent) {
        const parentEndDateMom = moment(parent.endDate, 'D/MMMM/YY');
        const notSameVersion = task.ver[0] !== parent!.ver[0];
        const earlierEndDate = endDateObj.isBefore(parentEndDateMom);
        const verDate = endDateBaseOnVersion(parent.ver[0]);

        const updateToTask: Parameters<typeof _editTr>[2] = {};
        let needUpdate = false;

        if (notSameVersion) {
          needUpdate = true;
          // tslint:disable-next-line: max-line-length
          log.warn(`Task "${displayIssue(task)}"\n  version "${task.ver[0]}" doesn't match parent "${parent.ver[0]}"\n`);
          updateToTask.ver = parent.ver;
        }
        if (verDate && task.endDate !== verDate) {
          needUpdate = true;
          updateToTask.endDate = verDate;
          // tslint:disable-next-line: max-line-length
          log.warn(`Task "${displayIssue(task)}"\n  end date "${task.endDate}" doesn't match parent version ${parent.ver[0]} - ${verDate}`);
        } else if (earlierEndDate) {
          needUpdate = true;
          updateToTask.endDate = parent.endDate;
          // tslint:disable-next-line: max-line-length
          log.warn(`Task "${displayIssue(task)}"\n  end date "${task.endDate}" is earlier than parent "${parent.endDate}"`);
        }

        if (needUpdate && api.argv.updateVersion) {
          await _editTr(pages[1], tr, updateToTask);
        }
      }
    }
  });
  await browser.close();
}

async function _editTr(page: pup.Page, tr: pup.ElementHandle, updateTask: {[key in keyof Issue]?: Issue[key]}) {
  await (await tr.$$(':scope > .summary .issue-link'))[1].click();
  await editIssue(page, updateTask);
  await page.goBack();
  await page.waitFor(800);
}

async function editIssue(page: pup.Page, task: Partial<Issue>) {
  const editButton = await page.waitForSelector('#edit-issue', {visible: true});
  await editButton.click();
  const dialog = await page.waitForSelector('#edit-issue-dialog', {visible: true});

  if (task.name) {
    console.log('change name to ', task.name);
    await dialog.$('input[name=summary]')
      .then(input => input!.type(task.name!));
  }

  if (task.ver && task.ver.length > 0) {
    console.log('  change version to ', task.ver[0]);
    const input = await dialog.$('#fixVersions-textarea');
    await input!.click();
    for (let i=0; i<5; i++)
      await input!.press('Backspace', {delay: 150});
    // await page.waitFor(1000);
    await input!.type(task.ver[0], {delay: 100});
    await page.keyboard.press('Enter');
  }

  if (task.desc != null) {
    console.log('  change description to', task.desc);
    await dialog.$('#description-wiki-edit').then(el => el!.click());
    await page.keyboard.type(task.desc ? task.desc : task.name!);
  }

  const labels = await dialog.$$('.field-group > label');

  const texts = await Promise.all(
    labels.map(label => label.getProperty('innerText').then(v => v.jsonValue() as Promise<string>)));
  const labelMap: {[name: string]: pup.ElementHandle} = {};
  texts.forEach((text, idx) => labelMap[text.split(/[\n\r\t]+/)[0]] = labels[idx]);

  const dates = date();
  const formValues = {};

  if (task.ver && task.ver.length > 0)
    formValues['End date'] = endDateBaseOnVersion(task.ver![0]) || dates[1];

  if (task.endDate)
    formValues['End date'] = task.endDate;

  for (const name of Object.keys(labelMap)) {
    if (!_.has(formValues, name))
      continue;
    await labelMap[name].click({delay: 50});
    await new Promise(resolve => setTimeout(resolve, 200));
    const inputId = '#' + await page.evaluate(label => label.getAttribute('for'), labelMap[name]);
    // console.log(inputId);
    const value = await page.$eval(inputId, input => (input as HTMLInputElement).value);

    if (value) {
      for (let i = 0, l = value.length + 2; i < l; i++)
        await page.keyboard.press('ArrowRight', {delay: 50});
      for (let i = 0, l = value.length + 5; i < l; i++)
        await page.keyboard.press('Backspace', {delay: 50});
    }
    console.log('%s: %s -> %s', name, value, formValues[name]);
    await page.keyboard.type(formValues[name], {delay: 50});
    // if (name === '经办人') {
    //   await new Promise(resolve => setTimeout(resolve, 500)); // wait for JIRA searching user
    //   await page.keyboard.press('Enter', {delay: 50});
    // }
  }
  await (await dialog.$('#edit-issue-submit'))!.click();
  await page.waitFor('#edit-issue-dialog', {hidden: true});
  await page.waitFor(1000);
}

async function getCellTitles(issueTable: pup.ElementHandle<Element> | null) {
  if (issueTable == null)
    return [];
  const ths = await issueTable.$$(':scope > thead th');

  const titles = await Promise.all(ths.map(async th => {
    const header = await th.$(':scope > span[title]');
    if (header) {
      return (await header.getProperty('innerText')).jsonValue() as Promise<string>;
    } else {
      return (await th.getProperty('innerText')).jsonValue() as Promise<string>;
    }
  }));

  return titles.map(title => title.trim());
}

async function listIssueByIds(page: pup.Page, ids: string[]) {
  const jql = 'jql=' + encodeURIComponent(`id in (${ids.join(',')})`);
  await page.goto('https://issue.bkjk-inc.com/issues/?' + jql);
  const issueMap = (await domToIssues(page)).reduce((map, issue) => {
    map.set(issue.id, issue);
    return map;
  }, new Map<string, Issue>());
  return issueMap;
}

export async function moveIssues(newParentId: string, ...movedIssueIds: string[]) {
  const browser = await launch();
  const page = (await browser.pages())[0];

  const parentIssueMap = await listIssueByIds(page, [newParentId]);
  const parentIssue = parentIssueMap.values().next().value as Issue;

  console.log(parentIssue);

  for (const id of movedIssueIds) {
    const url = 'https://issue.bkjk-inc.com/browse/' + id;
    await page.goto(url, {timeout: 0, waitUntil: 'networkidle2'});

    await page.waitFor('#parent_issue_summary', {visible: true});
    const origParentId = await page.$eval('#parent_issue_summary', el => el.getAttribute('data-issue-key'));
    if (origParentId !== parentIssue.id) {

      await clickMoreButton(page, '移动');
      await new Promise(resolve => setTimeout(resolve, 500));
      // const el = await page.$('html');
      // const html = (await el!.$eval(':scope > body', el => el.innerHTML));
      // console.log(html);

      await page.waitFor('#move\\.subtask\\.parent\\.operation\\.name_id', {visible: true});
      await page.click('#move\\.subtask\\.parent\\.operation\\.name_id', {delay: 200});
      await new Promise(resolve => setTimeout(resolve, 200));
      await page.click('#next_submit', {delay: 200});
      await page.waitFor('input[name=parentIssue]', {visible: true});
      const input = await page.$('input[name=parentIssue]');
      await input!.click();
      await page.keyboard.sendCharacter(newParentId);
      await page.click('#reparent_submit', {delay: 200});
      while (true) {
        if (page.url().startsWith(url))
          break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`${id} is moved to ${newParentId}`);
    }
    await editIssue(page, {endDate: parentIssue.endDate, ver: parentIssue.ver});
    console.log(`${id} is updated`);
  }
  await browser.close();
}

export async function assignIssues(assignee: string, ...issueIds: string[]) {
  const browser = await launch();
  const page = (await browser.pages())[0];
  const jql = 'jql=' + encodeURIComponent(`id in (${issueIds.join(',')})`);
  await page.goto('https://issue.bkjk-inc.com/issues/?' + jql);
  await domToIssues(page, async pairs => {
    for (const [issue, el] of pairs) {
      if (issue.assignee === assignee)
        continue;
      const links = await el.$$(':scope > td > .issue-link');
      if (links && links.length > 0) {
        const link = links[links.length - 1];

        await link.click({delay: 300});
        await page.waitFor('#assign-issue', {visible: true});
        await page.click('#assign-issue', {delay: 300});
        await page.waitFor('#assign-dialog', {visible: true});
        const input = await page.$('#assignee-field');
        await editInputText(page, input, assignee);
        await page.waitFor('body > .ajs-layer', {visible: true});
        await page.keyboard.press('Enter', {delay: 100});
        await page.click('#assign-issue-submit', {delay: 100});
        await page.waitFor('#assign-dialog', {hidden: true});
        // await new Promise(resolve => setTimeout(resolve, 500));
        await page.goBack({waitUntil: 'networkidle0'});
      }
    }
  });


  await browser.close();
}

async function clickMoreButton(page: pup.Page, button: string) {
  const moreBtn = await page.$('#opsbar-operations_more');
  if (moreBtn == null)
    throw new Error('#opsbar-operations_more not found in page'); // click 更多

  await moreBtn!.click({delay: 100});
  await page.waitFor('#opsbar-operations_more_drop', {visible: true});

  const menuItems = await page.$$('#opsbar-operations_more_drop .trigger-label');
  for (const item of menuItems) {
    const text: string = await item.getProperty('innerHTML').then(jh => jh.jsonValue() as Promise<string>);
    if (text === button) {
      await new Promise(resolve => setTimeout(resolve, 200));
      await item.click();
      break;
    }
  }
}

type ExtractPromise<V> = V extends Promise<infer E> ? E : unknown;

async function editInputText(page: pup.Page, inputEl: ExtractPromise<ReturnType<pup.Page['$']>>, newValue: string) {
  if (inputEl == null)
    return;
  const value = await inputEl.evaluate((input: HTMLInputElement) => input.value);
  await inputEl.click({delay: 300});
  if (value) {
    for (let i = 0, l = value.length + 2; i < l; i++)
      await page.keyboard.press('ArrowRight', {delay: 50});
    for (let i = 0, l = value.length + 3; i < l; i++)
      await page.keyboard.press('Backspace', {delay: 50});
  }

  await page.keyboard.type(newValue, {delay: 50});
}

