"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console max-line-length
const selenium_webdriver_1 = require("selenium-webdriver");
const { Options } = require('selenium-webdriver/chrome');
const path_1 = tslib_1.__importDefault(require("path"));
const os_1 = tslib_1.__importDefault(require("os"));
function main() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        process.env.PATH = process.env.PATH + path_1.default.delimiter + path_1.default.resolve(__dirname, '..');
        const opt = new Options();
        if (process.platform === 'darwin') {
            console.log('mac osx');
            opt.addArguments('headless')
                .setLocalState(path_1.default.resolve(os_1.default.homedir(), 'Library/Application Support/Google/Chrome/Local State'))
                .setChromeBinaryPath('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
        }
        const cap = selenium_webdriver_1.Capabilities.chrome();
        cap.set('chromeOptions', { args: ['--headless'] });
        const builder = new selenium_webdriver_1.Builder().forBrowser('chrome').withCapabilities(cap);
        const driver = builder.build();
        yield driver.get('https://weibo.com');
        // driver.get('https://issue.bkjk-inc.com/issues/?filter=-1&jql=resolution%20%3D%20Unresolved%20AND%20assignee%20in%20(jing.liu%2C%20haiz.chen001)%20order%20by%20updated%20DESC');
        // await driver.get('https://trello.com/b/i6yaHbFX/%E8%B4%9D%E7%94%A8%E9%87%91%E8%B4%9D%E5%88%86%E6%9C%9F%E4%BA%A7%E5%93%81%E5%8E%9F%E4%BF%A1%E7%94%A8%E4%BA%8B%E4%B8%9A%E9%83%A8%E5%89%8D%E7%AB%AF%E5%9B%A2%E9%98%9F');
        process.on('SIGINT', () => {
            console.log('bye');
            driver.quit();
        });
    });
}
exports.main = main;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvamlyYS1oZWxwZXIvdHMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBNkM7QUFDN0MsMkRBQTJEO0FBQzNELE1BQU0sRUFBQyxPQUFPLEVBQUMsR0FBRyxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUN2RCx3REFBd0I7QUFDeEIsb0RBQW9CO0FBRXBCLFNBQXNCLElBQUk7O1FBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLGNBQUksQ0FBQyxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckYsTUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUMxQixJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUFFO1lBQ2pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdkIsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUM7aUJBQ3pCLGFBQWEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFlBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSx1REFBdUQsQ0FBQyxDQUFDO2lCQUNsRyxtQkFBbUIsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1NBQ3hGO1FBQ0QsTUFBTSxHQUFHLEdBQUcsaUNBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNsQyxHQUFHLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxFQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLE9BQU8sR0FBRyxJQUFJLDRCQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQy9CLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3RDLG1MQUFtTDtRQUNuTCx3TkFBd047UUFDeE4sT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1lBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkIsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBcEJELG9CQW9CQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyL2ppcmEtaGVscGVyL2Rpc3QvbWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IHsgQnVpbGRlciwgQ2FwYWJpbGl0aWVzIH0gZnJvbSAnc2VsZW5pdW0td2ViZHJpdmVyJztcbmNvbnN0IHtPcHRpb25zfSA9IHJlcXVpcmUoJ3NlbGVuaXVtLXdlYmRyaXZlci9jaHJvbWUnKTtcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gIHByb2Nlc3MuZW52LlBBVEggPSBwcm9jZXNzLmVudi5QQVRIICsgUGF0aC5kZWxpbWl0ZXIgKyBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nKTtcbiAgY29uc3Qgb3B0ID0gbmV3IE9wdGlvbnMoKTtcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdkYXJ3aW4nKSB7XG4gICAgY29uc29sZS5sb2coJ21hYyBvc3gnKTtcbiAgICBvcHQuYWRkQXJndW1lbnRzKCdoZWFkbGVzcycpXG4gICAgICAuc2V0TG9jYWxTdGF0ZShQYXRoLnJlc29sdmUob3MuaG9tZWRpcigpLCAnTGlicmFyeS9BcHBsaWNhdGlvbiBTdXBwb3J0L0dvb2dsZS9DaHJvbWUvTG9jYWwgU3RhdGUnKSlcbiAgICAgIC5zZXRDaHJvbWVCaW5hcnlQYXRoKCcvQXBwbGljYXRpb25zL0dvb2dsZSBDaHJvbWUuYXBwL0NvbnRlbnRzL01hY09TL0dvb2dsZSBDaHJvbWUnKTtcbiAgfVxuICBjb25zdCBjYXAgPSBDYXBhYmlsaXRpZXMuY2hyb21lKCk7XG4gIGNhcC5zZXQoJ2Nocm9tZU9wdGlvbnMnLCB7YXJnczogWyctLWhlYWRsZXNzJ119KTtcbiAgY29uc3QgYnVpbGRlciA9IG5ldyBCdWlsZGVyKCkuZm9yQnJvd3NlcignY2hyb21lJykud2l0aENhcGFiaWxpdGllcyhjYXApO1xuICBjb25zdCBkcml2ZXIgPSBidWlsZGVyLmJ1aWxkKCk7XG4gIGF3YWl0IGRyaXZlci5nZXQoJ2h0dHBzOi8vd2VpYm8uY29tJyk7XG4gIC8vIGRyaXZlci5nZXQoJ2h0dHBzOi8vaXNzdWUuYmtqay1pbmMuY29tL2lzc3Vlcy8/ZmlsdGVyPS0xJmpxbD1yZXNvbHV0aW9uJTIwJTNEJTIwVW5yZXNvbHZlZCUyMEFORCUyMGFzc2lnbmVlJTIwaW4lMjAoamluZy5saXUlMkMlMjBoYWl6LmNoZW4wMDEpJTIwb3JkZXIlMjBieSUyMHVwZGF0ZWQlMjBERVNDJyk7XG4gIC8vIGF3YWl0IGRyaXZlci5nZXQoJ2h0dHBzOi8vdHJlbGxvLmNvbS9iL2k2eWFIYkZYLyVFOCVCNCU5RCVFNyU5NCVBOCVFOSU4NyU5MSVFOCVCNCU5RCVFNSU4OCU4NiVFNiU5QyU5RiVFNCVCQSVBNyVFNSU5MyU4MSVFNSU4RSU5RiVFNCVCRiVBMSVFNyU5NCVBOCVFNCVCQSU4QiVFNCVCOCU5QSVFOSU4MyVBOCVFNSU4OSU4RCVFNyVBQiVBRiVFNSU5QiVBMiVFOSU5OCU5RicpO1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCAoKSA9PiB7XG4gICAgY29uc29sZS5sb2coJ2J5ZScpO1xuICAgIGRyaXZlci5xdWl0KCk7XG4gIH0pO1xufVxuIl19
