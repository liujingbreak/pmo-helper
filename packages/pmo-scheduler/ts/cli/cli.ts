import {CliExtension} from '@wfh/plink/wfh/dist';

const cliExt: CliExtension = (program) => {
  program.command('fetch-ss-addr [subscribe-url]')
  .description('Fetch Shadowsocks server address', {
    'subscribe-url': 'URL address of server address subscription'
  })
  // .option('-f, --file <spec>', 'sample option')
  .action(async (sub?: string) => {
    await (await import('./cli-fetch-ss-addr')).fetchSsAddr(sub);
  });

  // TODO: Add more sub command here
};

export default cliExt;
