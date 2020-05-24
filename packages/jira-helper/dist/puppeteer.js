"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
const path_1 = tslib_1.__importDefault(require("path"));
const puppeteer_core_1 = tslib_1.__importDefault(require("puppeteer-core"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger('jira-helper');
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
        switch (process.platform) {
            // Refer to https://chromium.googlesource.com/chromium/src/+/master/docs/user_data_dir.md#Mac-OS-X
            case 'darwin':
                executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
                break;
            case 'win32':
                executablePath = path_1.default.resolve(process.env['ProgramFiles(x86)'] || 'c:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe');
                break;
            default:
                const msg = 'jira-helper does not support this platform ' + process.platform;
                log.error(msg);
                throw new Error(msg);
        }
        if (__api_1.default.argv.headless === true) {
            log.info('Enable headless mode');
            headless = true;
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
exports.launch = launch;
function main() {
    console.log(__api_1.default.argv);
}
exports.main = main;
function isVisible(el) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (el == null)
            return false;
        const box = yield el.boundingBox();
        if (box == null || box.height < 5 || box.width < 5)
            return false;
        return true;
    });
}
exports.isVisible = isVisible;
function waitForVisible(el, visible = true, timeout = 30000) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const begin = new Date().getTime();
        while (true) {
            yield new Promise(resolve => setTimeout(resolve, 150));
            if ((yield isVisible(el)) === visible)
                break;
            if (new Date().getTime() - begin > timeout) {
                throw new Error('timeout');
            }
        }
    });
}
exports.waitForVisible = waitForVisible;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvamlyYS1oZWxwZXIvdHMvcHVwcGV0ZWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZCQUE2QjtBQUM3Qix3REFBd0I7QUFDeEIsNEVBQWlDO0FBQ2pDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBRXZELHVCQUF1QjtBQUN2QixTQUFzQixLQUFLOztRQUN6QixNQUFNLE9BQU8sR0FBRyxNQUFNLE1BQU0sRUFBRSxDQUFDO1FBQy9CLE1BQU0sS0FBSyxHQUFHLE1BQU0sT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFDdEMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztDQUFBO0FBTEQsc0JBS0M7QUFFRCxTQUFzQixNQUFNLENBQUMsUUFBUSxHQUFHLEtBQUs7O1FBQzNDLElBQUksY0FBc0IsQ0FBQztRQUUzQixRQUFRLE9BQU8sQ0FBQyxRQUFRLEVBQUU7WUFDeEIsa0dBQWtHO1lBQ2xHLEtBQUssUUFBUTtnQkFDWCxjQUFjLEdBQUcsOERBQThELENBQUM7Z0JBQ2hGLE1BQU07WUFDUixLQUFLLE9BQU87Z0JBQ1YsY0FBYyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsSUFBSSx3QkFBd0IsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO2dCQUN0RyxNQUFNO1lBQ1I7Z0JBQ0UsTUFBTSxHQUFHLEdBQUcsNkNBQTZDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztnQkFDN0UsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3hCO1FBQ0QsSUFBSSxlQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7WUFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ2pDLFFBQVEsR0FBRyxJQUFJLENBQUM7U0FDakI7UUFDRCxNQUFNLE9BQU8sR0FBRyxNQUFNLHdCQUFHLENBQUMsTUFBTSxDQUFDO1lBQy9CLFFBQVE7WUFDUixjQUFjLEVBQUUsY0FBZTtZQUMvQixXQUFXLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLHNCQUFzQjtZQUNuRCxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGVBQWUsRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBQztTQUM1QyxDQUFDLENBQUM7UUFDSCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQUE7QUE3QkQsd0JBNkJDO0FBRUQsU0FBZ0IsSUFBSTtJQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBRkQsb0JBRUM7QUFFRCxTQUFzQixTQUFTLENBQUMsRUFBcUI7O1FBQ25ELElBQUksRUFBRSxJQUFJLElBQUk7WUFDWixPQUFPLEtBQUssQ0FBQztRQUNmLE1BQU0sR0FBRyxHQUFHLE1BQU0sRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25DLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUM7WUFDaEQsT0FBTyxLQUFLLENBQUM7UUFDZixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FBQTtBQVBELDhCQU9DO0FBRUQsU0FBc0IsY0FBYyxDQUFDLEVBQXFCLEVBQUUsT0FBTyxHQUFHLElBQUksRUFBRSxPQUFPLEdBQUcsS0FBSzs7UUFDekYsTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQyxPQUFPLElBQUksRUFBRTtZQUNYLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLE1BQU0sU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssT0FBTztnQkFDbkMsTUFBTTtZQUNSLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLEdBQUcsT0FBTyxFQUFFO2dCQUMxQyxNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQzVCO1NBQ0Y7SUFDSCxDQUFDO0NBQUE7QUFWRCx3Q0FVQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyL2ppcmEtaGVscGVyL2Rpc3QvcHVwcGV0ZWVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHB1cCBmcm9tICdwdXBwZXRlZXItY29yZSc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignamlyYS1oZWxwZXInKTtcblxuLy8gaW1wb3J0IG9zIGZyb20gJ29zJztcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dpbigpIHtcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGxhdW5jaCgpO1xuICBjb25zdCBwYWdlcyA9IGF3YWl0IGJyb3dzZXIucGFnZXMoKTtcbiAgYXdhaXQgcGFnZXNbMF0uZ290bygnaHR0cHM6Ly90cmVsbG8uY29tJyxcbiAgICB7dGltZW91dDogMCwgd2FpdFVudGlsOiAnZG9tY29udGVudGxvYWRlZCd9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxhdW5jaChoZWFkbGVzcyA9IGZhbHNlKTogUHJvbWlzZTxwdXAuQnJvd3Nlcj4ge1xuICBsZXQgZXhlY3V0YWJsZVBhdGg6IHN0cmluZztcblxuICBzd2l0Y2ggKHByb2Nlc3MucGxhdGZvcm0pIHtcbiAgICAvLyBSZWZlciB0byBodHRwczovL2Nocm9taXVtLmdvb2dsZXNvdXJjZS5jb20vY2hyb21pdW0vc3JjLysvbWFzdGVyL2RvY3MvdXNlcl9kYXRhX2Rpci5tZCNNYWMtT1MtWFxuICAgIGNhc2UgJ2Rhcndpbic6XG4gICAgICBleGVjdXRhYmxlUGF0aCA9ICcvQXBwbGljYXRpb25zL0dvb2dsZSBDaHJvbWUuYXBwL0NvbnRlbnRzL01hY09TL0dvb2dsZSBDaHJvbWUnO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnd2luMzInOlxuICAgICAgZXhlY3V0YWJsZVBhdGggPSBQYXRoLnJlc29sdmUoXG4gICAgICBwcm9jZXNzLmVudlsnUHJvZ3JhbUZpbGVzKHg4NiknXSB8fCAnYzovUHJvZ3JhbSBGaWxlcyAoeDg2KScsICdHb29nbGUvQ2hyb21lL0FwcGxpY2F0aW9uL2Nocm9tZS5leGUnKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zdCBtc2cgPSAnamlyYS1oZWxwZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGlzIHBsYXRmb3JtICcgKyBwcm9jZXNzLnBsYXRmb3JtO1xuICAgICAgbG9nLmVycm9yKG1zZyk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgfVxuICBpZiAoYXBpLmFyZ3YuaGVhZGxlc3MgPT09IHRydWUpIHtcbiAgICBsb2cuaW5mbygnRW5hYmxlIGhlYWRsZXNzIG1vZGUnKTtcbiAgICBoZWFkbGVzcyA9IHRydWU7XG4gIH1cbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IHB1cC5sYXVuY2goe1xuICAgIGhlYWRsZXNzLFxuICAgIGV4ZWN1dGFibGVQYXRoOiBleGVjdXRhYmxlUGF0aCEsXG4gICAgdXNlckRhdGFEaXI6IHByb2Nlc3MuY3dkKCkgKyAnL2Rpc3QvcHVwcGV0ZWVyLXRlbXAnLFxuICAgIGlnbm9yZUhUVFBTRXJyb3JzOiB0cnVlLFxuICAgIGRlZmF1bHRWaWV3cG9ydDoge3dpZHRoOiAxMjM2LCBoZWlnaHQ6IDc2OH1cbiAgfSk7XG4gIHJldHVybiBicm93c2VyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFpbigpIHtcbiAgY29uc29sZS5sb2coYXBpLmFyZ3YpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNWaXNpYmxlKGVsOiBwdXAuRWxlbWVudEhhbmRsZSkge1xuICBpZiAoZWwgPT0gbnVsbClcbiAgICByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGJveCA9IGF3YWl0IGVsLmJvdW5kaW5nQm94KCk7XG4gIGlmIChib3ggPT0gbnVsbCB8fCBib3guaGVpZ2h0IDwgNSB8fCBib3gud2lkdGggPCA1KVxuICAgIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yVmlzaWJsZShlbDogcHVwLkVsZW1lbnRIYW5kbGUsIHZpc2libGUgPSB0cnVlLCB0aW1lb3V0ID0gMzAwMDApIHtcbiAgY29uc3QgYmVnaW4gPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTUwKSk7XG4gICAgaWYgKChhd2FpdCBpc1Zpc2libGUoZWwpKSA9PT0gdmlzaWJsZSlcbiAgICAgIGJyZWFrO1xuICAgIGlmIChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGJlZ2luID4gdGltZW91dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd0aW1lb3V0Jyk7XG4gICAgfVxuICB9XG59XG4iXX0=
