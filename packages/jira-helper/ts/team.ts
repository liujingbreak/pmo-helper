// import {Page, Browser} from 'puppeteer-core';
import * as jsYaml from 'js-yaml';
import {domToIssues} from './jira';
import {launch} from './puppeteer';
import fs from 'fs';
import _ from 'lodash';
const log = require('log4js').getLogger('jira-helper.team');

const allowedPrefix = 'HDECOR, BYJ, BCL, MF, ZLZB'.split(/\s*,\s*/).reduce((set, prefix) => {
  set.add(prefix);
  return set;
}, new Set<string>());



export async function listIssues() {

  const browser = await launch();
  const page = (await browser.pages())[0];
  await page.goto('https://issue.bkjk-inc.com/issues/?filter=14109', {waitUntil: 'networkidle2'});

  const issues = await domToIssues(page);

  const filtered = issues.filter(issue => {
    const prefix = issue.id.slice(0, issue.id.indexOf('-'));
    return allowedPrefix.has(prefix);
  });

  log.info(`${filtered.length} issues.`);

  const grouped = _.groupBy(filtered, issue => issue.assignee);
  fs.writeFileSync('dist/team-issues.yaml', jsYaml.safeDump(grouped));
  log.info('Result has been written to dist/team-issues.yaml');

  // log.info('Issue prefixes:', Array.from(prefixSet.values()).join(', '));
  await browser.close();
}
