import {CronJob} from 'cron';
import {spawn} from '@wfh/plink/wfh/dist/process-utils';
import axios from 'axios';
import chalk from 'chalk';
import {switchMap, retry, catchError, map, takeWhile} from 'rxjs/operators';
import {of, timer, Observable} from 'rxjs';
import axiosob from 'axios-observable';
import {fork} from 'child_process';
import {generateToken} from '@wfh/assets-processer/dist/content-deployer/cd-server';
// import log4js from 'log4js';

/**
 * https://www.easycron.com/faq/What-cron-expression-does-easycron-support
 * 
 */
export function turnOff() {
  const sec = Math.ceil(Math.random() * 60);
  let min = 50 + Math.ceil(Math.random() * 15);
  let hour = 19;
  if (min >= 60) {
    min = min - 60;
    hour++;
  }

  const startSec = Math.ceil(Math.random() * 60);
  let startMin = 55 + Math.ceil(Math.random() * 5);
  let startHour = 9;
  if (startMin >= 60) {
    startMin = startMin - 60;
    startHour++;
  }

  // tslint:disable-next-line: no-console
  console.log(`Will turn off at ${hour}:${min}:${sec} and\n` +
  `Turn on at ${chalk.cyan(startHour + '')}:${startMin}:${startSec}`);
  new CronJob(`${sec} ${min} ${hour} * * 1,2,3,4,5`, () => {
    // tslint:disable-next-line: no-console
    console.log('Turning off');
    spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'off');
  }).start();

  new CronJob(`${startSec} ${startMin} ${startHour} * * 1,2,3,4,5`, async () => {
    // tslint:disable-next-line: no-console
    console.log('Turning on');
    await spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'on').promise;
    await new Promise(resolve => setTimeout(resolve, 15000));
    axios.get('https://www.baidu.com');
  }).start();
}

export function turnOn() {
  spawn('networksetup', '-setnetworkserviceenabled', 'Wi-Fi', 'on');
}

export function checkCreditApplServer() {
  const endDate = new Date(2021, 0, 12, 18, 0);
  timer(15 * 60000, 30 * 60000)
  .pipe(
    takeWhile(() => {
      return new Date().getTime() < endDate.getTime();
    }),
    switchMap(() => axiosob.get<string>('https://credit-service.bkjk.com/byj.githash-webui.txt')
      .pipe(
        catchError(err => {
          console.error(chalk.red(err.message), err);
          return timer(5000).pipe(
            map(() => {throw err;})
          );
        }),
        retry(3),
        catchError(err => {
          console.error(chalk.yellow('Failed to retry'), err);
          return of(null);
        })
      )),
    switchMap(res => {
      if (res == null)
        return of();

      // tslint:disable-next-line: no-console
      console.log(res.data);
      if (res.data.indexOf('user who has no balance applied can not go backward in introdcution page') < 0) {
        return new Observable(sub => {
          const worker = fork(require.resolve('@wfh/plink/bin/dr'),
            `send --env prod --con 2 --nodes 2 --secret ${generateToken()} -c packages/pmo-scheduler/deploy-credit.yaml byj install-prod/byj.zip`.split(/\s+/),
            {serialization: 'advanced', stdio: 'inherit'});
          worker.on('error', () => {sub.next(); sub.complete();});
          worker.on('exit', (err) => {sub.error(err);});
        }).pipe(
          retry(1),
          catchError(err => {
            console.error(chalk.yellow('Failed to retry'), err);
            return of();
          })
        );
      }

      const now = new Date();
      // tslint:disable-next-line: no-console
      console.log(chalk.green(now.toLocaleTimeString() + ' ' + now.toLocaleDateString()));
      return of();
    })
  )
  .subscribe();
}

