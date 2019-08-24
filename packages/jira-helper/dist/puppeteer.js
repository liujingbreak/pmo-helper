"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
const rxjs_1 = require("rxjs");
const puppeteer_core_1 = tslib_1.__importDefault(require("puppeteer-core"));
// import * as tr from './trello';
// import {mergeMap} from 'rxjs/operators';
// const log = require('log4js').getLogger('jira-helper');
const path_1 = tslib_1.__importDefault(require("path"));
// import os from 'os';
function login() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const browser = yield launch();
        const pages = yield browser.pages();
        yield pages[0].goto('https://trello.com', { timeout: 0, waitUntil: 'domcontentloaded' });
    });
}
exports.login = login;
function launch(headless = false) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let executablePath;
        // let userDataDir: string;
        switch (process.platform) {
            // Refer to https://chromium.googlesource.com/chromium/src/+/master/docs/user_data_dir.md#Mac-OS-X
            case 'darwin':
                executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
                break;
            case 'win32':
                executablePath = path_1.default.resolve(process.env['ProgramFiles(x86)'] || 'c:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe');
                break;
            default:
                console.log('jira-helper does not support this platform', process.platform);
            // process.exit(1);
        }
        const browser = yield puppeteer_core_1.default.launch({
            headless,
            executablePath: executablePath,
            userDataDir: process.cwd() + '/dist/puppeteer-temp',
            ignoreHTTPSErrors: true,
            defaultViewport: { width: 1236, height: 768 }
        });
        return browser;
    });
}
function run() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const browser = yield launch(true);
        const pages = yield browser.pages();
        // const page = await browser.newPage();
        // tslint:disable-next-line: max-line-length
        yield pages[0].goto('https://trello.com/b/i6yaHbFX/%E8%B4%9D%E7%94%A8%E9%87%91%E8%B4%9D%E5%88%86%E6%9C%9F%E4%BA%A7%E5%93%81%E5%8E%9F%E4%BF%A1%E7%94%A8%E4%BA%8B%E4%B8%9A%E9%83%A8%E5%89%8D%E7%AB%AF%E5%9B%A2%E9%98%9F', { timeout: 0, waitUntil: 'load' });
        console.log('fetching trello done');
        yield listBoards(pages[0]);
        yield browser.close();
        console.log('Have a nice day');
    });
}
exports.run = run;
function listBoards(page) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield page.waitFor('#board', { visible: true });
        const boards = yield page.$$('#board > .list-wrapper > .list');
        boards.map(bd => {
            // each board
            return rxjs_1.from(bd.$$('.list-card .list-card-title'));
        });
        rxjs_1.of(boards).pipe();
        // const values: tr.TrelloBoard[] = await Promise.all(boards.map(async bd => {
        //   const boardNameP = getProp<string>(bd.$('.list-header h2'));
        //   const cardsP = bd.$$('.list-card .list-card-title')
        //   .then(els => Promise.all(els.map(async el => Promise.all([
        //     el.$('.card-short-id'),
        //     (await el.getProperty('innerText')).jsonValue() as Promise<string>
        //   ]))));
        //   const [name, cards] = await Promise.all([boardNameP, cardsP]);
        //   log.info('[ %s ]\n', name, cards.map(card => `  - ${card}`).join('\n'));
        //   return {
        //     name: name || '',
        //     cards: cards.map(card => ({title: card}))
        //   };
        // }));
        // return values;
    });
}
// async function getProp<T extends string | number>(elp: Promise<pup.ElementHandle | null>, prop = 'innerHTML') {
//   const el = await elp;
//   if (el == null)
//     return null;
//   return (await el.getProperty(prop)).jsonValue() as Promise<T>;
// }

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvamlyYS1oZWxwZXIvdHMvcHVwcGV0ZWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZCQUE2QjtBQUM3QiwrQkFBOEI7QUFDOUIsNEVBQWlDO0FBQ2pDLGtDQUFrQztBQUNsQywyQ0FBMkM7QUFDM0MsMERBQTBEO0FBQzFELHdEQUF3QjtBQUd4Qix1QkFBdUI7QUFDdkIsU0FBc0IsS0FBSzs7UUFDekIsTUFBTSxPQUFPLEdBQUcsTUFBTSxNQUFNLEVBQUUsQ0FBQztRQUMvQixNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQ3RDLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUMsQ0FBQyxDQUFDO0lBQ2pELENBQUM7Q0FBQTtBQUxELHNCQUtDO0FBRUQsU0FBZSxNQUFNLENBQUMsUUFBUSxHQUFHLEtBQUs7O1FBQ3BDLElBQUksY0FBc0IsQ0FBQztRQUMzQiwyQkFBMkI7UUFFM0IsUUFBUSxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQ3hCLGtHQUFrRztZQUNsRyxLQUFLLFFBQVE7Z0JBQ1gsY0FBYyxHQUFHLDhEQUE4RCxDQUFDO2dCQUNoRixNQUFNO1lBQ1IsS0FBSyxPQUFPO2dCQUNWLGNBQWMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLElBQUksd0JBQXdCLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztnQkFDdEcsTUFBTTtZQUNSO2dCQUNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlFLG1CQUFtQjtTQUNwQjtRQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sd0JBQUcsQ0FBQyxNQUFNLENBQUM7WUFDL0IsUUFBUTtZQUNSLGNBQWMsRUFBRSxjQUFlO1lBQy9CLFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsc0JBQXNCO1lBQ25ELGlCQUFpQixFQUFFLElBQUk7WUFDdkIsZUFBZSxFQUFFLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFDO1NBQzVDLENBQUMsQ0FBQztRQUNILE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7Q0FBQTtBQUVELFNBQXNCLEdBQUc7O1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLE1BQU0sT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BDLHdDQUF3QztRQUN4Qyw0Q0FBNEM7UUFDNUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtNQUFrTSxFQUNwTixFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNCLE1BQU0sT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNqQyxDQUFDO0NBQUE7QUFaRCxrQkFZQztBQUVELFNBQWUsVUFBVSxDQUFDLElBQWM7O1FBQ3RDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUM5QyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ2QsYUFBYTtZQUNiLE9BQU8sV0FBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ0gsU0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFFZCxDQUFDO1FBRUYsOEVBQThFO1FBQzlFLGlFQUFpRTtRQUVqRSx3REFBd0Q7UUFDeEQsK0RBQStEO1FBQy9ELDhCQUE4QjtRQUM5Qix5RUFBeUU7UUFDekUsV0FBVztRQUNYLG1FQUFtRTtRQUNuRSw2RUFBNkU7UUFDN0UsYUFBYTtRQUNiLHdCQUF3QjtRQUN4QixnREFBZ0Q7UUFDaEQsT0FBTztRQUNQLE9BQU87UUFDUCxpQkFBaUI7SUFDbkIsQ0FBQztDQUFBO0FBRUQsa0hBQWtIO0FBQ2xILDBCQUEwQjtBQUMxQixvQkFBb0I7QUFDcEIsbUJBQW1CO0FBQ25CLG1FQUFtRTtBQUNuRSxJQUFJIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHIvamlyYS1oZWxwZXIvZGlzdC9wdXBwZXRlZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IHtmcm9tLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgcHVwIGZyb20gJ3B1cHBldGVlci1jb3JlJztcbi8vIGltcG9ydCAqIGFzIHRyIGZyb20gJy4vdHJlbGxvJztcbi8vIGltcG9ydCB7bWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignamlyYS1oZWxwZXInKTtcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5cbi8vIGltcG9ydCBvcyBmcm9tICdvcyc7XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9naW4oKSB7XG4gIGNvbnN0IGJyb3dzZXIgPSBhd2FpdCBsYXVuY2goKTtcbiAgY29uc3QgcGFnZXMgPSBhd2FpdCBicm93c2VyLnBhZ2VzKCk7XG4gIGF3YWl0IHBhZ2VzWzBdLmdvdG8oJ2h0dHBzOi8vdHJlbGxvLmNvbScsXG4gICAge3RpbWVvdXQ6IDAsIHdhaXRVbnRpbDogJ2RvbWNvbnRlbnRsb2FkZWQnfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxhdW5jaChoZWFkbGVzcyA9IGZhbHNlKSB7XG4gIGxldCBleGVjdXRhYmxlUGF0aDogc3RyaW5nO1xuICAvLyBsZXQgdXNlckRhdGFEaXI6IHN0cmluZztcblxuICBzd2l0Y2ggKHByb2Nlc3MucGxhdGZvcm0pIHtcbiAgICAvLyBSZWZlciB0byBodHRwczovL2Nocm9taXVtLmdvb2dsZXNvdXJjZS5jb20vY2hyb21pdW0vc3JjLysvbWFzdGVyL2RvY3MvdXNlcl9kYXRhX2Rpci5tZCNNYWMtT1MtWFxuICAgIGNhc2UgJ2Rhcndpbic6XG4gICAgICBleGVjdXRhYmxlUGF0aCA9ICcvQXBwbGljYXRpb25zL0dvb2dsZSBDaHJvbWUuYXBwL0NvbnRlbnRzL01hY09TL0dvb2dsZSBDaHJvbWUnO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnd2luMzInOlxuICAgICAgZXhlY3V0YWJsZVBhdGggPSBQYXRoLnJlc29sdmUoXG4gICAgICBwcm9jZXNzLmVudlsnUHJvZ3JhbUZpbGVzKHg4NiknXSB8fCAnYzovUHJvZ3JhbSBGaWxlcyAoeDg2KScsICdHb29nbGUvQ2hyb21lL0FwcGxpY2F0aW9uL2Nocm9tZS5leGUnKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLmxvZygnamlyYS1oZWxwZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGlzIHBsYXRmb3JtJywgcHJvY2Vzcy5wbGF0Zm9ybSk7XG4gICAgLy8gcHJvY2Vzcy5leGl0KDEpO1xuICB9XG4gIGNvbnN0IGJyb3dzZXIgPSBhd2FpdCBwdXAubGF1bmNoKHtcbiAgICBoZWFkbGVzcyxcbiAgICBleGVjdXRhYmxlUGF0aDogZXhlY3V0YWJsZVBhdGghLFxuICAgIHVzZXJEYXRhRGlyOiBwcm9jZXNzLmN3ZCgpICsgJy9kaXN0L3B1cHBldGVlci10ZW1wJyxcbiAgICBpZ25vcmVIVFRQU0Vycm9yczogdHJ1ZSxcbiAgICBkZWZhdWx0Vmlld3BvcnQ6IHt3aWR0aDogMTIzNiwgaGVpZ2h0OiA3Njh9XG4gIH0pO1xuICByZXR1cm4gYnJvd3Nlcjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bigpIHtcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaCh0cnVlKTtcbiAgY29uc3QgcGFnZXMgPSBhd2FpdCBicm93c2VyLnBhZ2VzKCk7XG4gIC8vIGNvbnN0IHBhZ2UgPSBhd2FpdCBicm93c2VyLm5ld1BhZ2UoKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgYXdhaXQgcGFnZXNbMF0uZ290bygnaHR0cHM6Ly90cmVsbG8uY29tL2IvaTZ5YUhiRlgvJUU4JUI0JTlEJUU3JTk0JUE4JUU5JTg3JTkxJUU4JUI0JTlEJUU1JTg4JTg2JUU2JTlDJTlGJUU0JUJBJUE3JUU1JTkzJTgxJUU1JThFJTlGJUU0JUJGJUExJUU3JTk0JUE4JUU0JUJBJThCJUU0JUI4JTlBJUU5JTgzJUE4JUU1JTg5JThEJUU3JUFCJUFGJUU1JTlCJUEyJUU5JTk4JTlGJyxcbiAgICB7dGltZW91dDogMCwgd2FpdFVudGlsOiAnbG9hZCd9KTtcbiAgY29uc29sZS5sb2coJ2ZldGNoaW5nIHRyZWxsbyBkb25lJyk7XG4gIGF3YWl0IGxpc3RCb2FyZHMocGFnZXNbMF0pO1xuXG4gIGF3YWl0IGJyb3dzZXIuY2xvc2UoKTtcbiAgY29uc29sZS5sb2coJ0hhdmUgYSBuaWNlIGRheScpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBsaXN0Qm9hcmRzKHBhZ2U6IHB1cC5QYWdlKSB7XG4gIGF3YWl0IHBhZ2Uud2FpdEZvcignI2JvYXJkJywge3Zpc2libGU6IHRydWV9KTtcbiAgY29uc3QgYm9hcmRzID0gYXdhaXQgcGFnZS4kJCgnI2JvYXJkID4gLmxpc3Qtd3JhcHBlciA+IC5saXN0Jyk7XG4gIGJvYXJkcy5tYXAoYmQgPT4ge1xuICAgIC8vIGVhY2ggYm9hcmRcbiAgICByZXR1cm4gZnJvbShiZC4kJCgnLmxpc3QtY2FyZCAubGlzdC1jYXJkLXRpdGxlJykpO1xuICB9KTtcbiAgb2YoYm9hcmRzKS5waXBlKFxuXG4gICk7XG5cbiAgLy8gY29uc3QgdmFsdWVzOiB0ci5UcmVsbG9Cb2FyZFtdID0gYXdhaXQgUHJvbWlzZS5hbGwoYm9hcmRzLm1hcChhc3luYyBiZCA9PiB7XG4gIC8vICAgY29uc3QgYm9hcmROYW1lUCA9IGdldFByb3A8c3RyaW5nPihiZC4kKCcubGlzdC1oZWFkZXIgaDInKSk7XG5cbiAgLy8gICBjb25zdCBjYXJkc1AgPSBiZC4kJCgnLmxpc3QtY2FyZCAubGlzdC1jYXJkLXRpdGxlJylcbiAgLy8gICAudGhlbihlbHMgPT4gUHJvbWlzZS5hbGwoZWxzLm1hcChhc3luYyBlbCA9PiBQcm9taXNlLmFsbChbXG4gIC8vICAgICBlbC4kKCcuY2FyZC1zaG9ydC1pZCcpLFxuICAvLyAgICAgKGF3YWl0IGVsLmdldFByb3BlcnR5KCdpbm5lclRleHQnKSkuanNvblZhbHVlKCkgYXMgUHJvbWlzZTxzdHJpbmc+XG4gIC8vICAgXSkpKSk7XG4gIC8vICAgY29uc3QgW25hbWUsIGNhcmRzXSA9IGF3YWl0IFByb21pc2UuYWxsKFtib2FyZE5hbWVQLCBjYXJkc1BdKTtcbiAgLy8gICBsb2cuaW5mbygnWyAlcyBdXFxuJywgbmFtZSwgY2FyZHMubWFwKGNhcmQgPT4gYCAgLSAke2NhcmR9YCkuam9pbignXFxuJykpO1xuICAvLyAgIHJldHVybiB7XG4gIC8vICAgICBuYW1lOiBuYW1lIHx8ICcnLFxuICAvLyAgICAgY2FyZHM6IGNhcmRzLm1hcChjYXJkID0+ICh7dGl0bGU6IGNhcmR9KSlcbiAgLy8gICB9O1xuICAvLyB9KSk7XG4gIC8vIHJldHVybiB2YWx1ZXM7XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIGdldFByb3A8VCBleHRlbmRzIHN0cmluZyB8IG51bWJlcj4oZWxwOiBQcm9taXNlPHB1cC5FbGVtZW50SGFuZGxlIHwgbnVsbD4sIHByb3AgPSAnaW5uZXJIVE1MJykge1xuLy8gICBjb25zdCBlbCA9IGF3YWl0IGVscDtcbi8vICAgaWYgKGVsID09IG51bGwpXG4vLyAgICAgcmV0dXJuIG51bGw7XG4vLyAgIHJldHVybiAoYXdhaXQgZWwuZ2V0UHJvcGVydHkocHJvcCkpLmpzb25WYWx1ZSgpIGFzIFByb21pc2U8VD47XG4vLyB9XG5cblxuIl19
