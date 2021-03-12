import {CliExtension // , initConfigAsync
} from '@wfh/plink';
import * as puppeteer from './puppeteer';

const cliExt: CliExtension = (program) => {
  program.command('jira-login')
  .description('Login JIRA and save browser cache')
  .action(async (file: string) => {
    (await import('./jira')).login();
  });


  const cmdSync = program.command('jira-sync [yaml-file]')
  .description('Read YAML file and create new tasks in JIRA')
  .option('--headless', 'use headless puppeteer')
  .action(async (file: string) => {
    if (cmdSync.opts().headless) {
      (require('./puppeteer') as typeof puppeteer).setUseHeadless(true);
    }
    (await import('./jira')).sync({headless: cmdSync.opts().headless}, file);
  });

  const cmdList = program.command('jira-list-story [URL]')
  .description('Fetch JIRA stories from remote server list page [URL],' +
    'default: https://issue.bkjk-inc.com/issues/?filter=14118')
  .option('--include <issue-prefix>', 'Only include issues with specific ID prefix')
  .option('--include-version <version>', 'Only inlucde issue with specific version')
  .option('--headless', 'use headless puppeteer')
  .action(async (url: string) => {
    if (cmdList.opts().headless) {
      (require('./puppeteer') as typeof puppeteer).setUseHeadless(true);
    }
    (await import('./jira')).listStory(cmdList.opts(), url);
  });
};

export default cliExt;
