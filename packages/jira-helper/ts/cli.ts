import {CliExtension , GlobalOptions // , initConfigAsync
} from '@wfh/plink/wfh/dist';
import {initConfig, initProcess, prepareLazyNodeInjector} from '@wfh/plink/wfh/dist';
import * as puppeteer from './puppeteer';

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmdSync = program.command('jira-sync [yaml-file]')
  .description('Read YAML file and create new tasks in JIRA')
  .option('--headless', 'use headless puppeteer')
  .action(async (file: string) => {
    initConfig(cmdSync.opts() as GlobalOptions);
    initProcess();
    (require('@wfh/plink/wfh/dist').prepareLazyNodeInjector as typeof prepareLazyNodeInjector)();
    if (cmdSync.opts().headless) {
      (require('./puppeteer') as typeof puppeteer).setUseHeadless(true);
    }
    (await import('./jira')).sync({headless: cmdSync.opts().headless}, file);
  });
  withGlobalOptions(cmdSync);

  const cmdList = program.command('jira-list-story')
  .description('Fetch JIRA stories from remote server')
  .option('--headless', 'use headless puppeteer')
  .action(async (file: string) => {
    initConfig(cmdList.opts() as GlobalOptions);
    initProcess();
    (require('@wfh/plink/wfh/dist').prepareLazyNodeInjector as typeof prepareLazyNodeInjector)();
    if (cmdList.opts().headless) {
      (require('./puppeteer') as typeof puppeteer).setUseHeadless(true);
    }
    (await import('./jira')).listStory();
  });
  withGlobalOptions(cmdList);
};

export default cliExt;
