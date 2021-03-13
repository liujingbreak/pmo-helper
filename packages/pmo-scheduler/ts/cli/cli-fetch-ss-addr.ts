// import {config} from '@wfh/plink';
import plink from '__plink';
import axios from 'axios-observable';
import * as op from 'rxjs/operators';
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';

export async function fetchSsAddr(subscribeUrl = 'https://sub.duang.cloud/api/v1/client/subscribe?token=545e10155e1fbd17c5b7dda4ce8b3728') {
  axios.get<string>(subscribeUrl).pipe(
    op.tap(res => {
      const buf = Buffer.from(res.data, 'base64');
      // tslint:disable-next-line no-console
      console.log(buf.toString('utf-8'));
    }),
    op.catchError((err, src) => {
      plink.logger.error(err);
      return err;
    })
  ).subscribe();
}
