"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const cliExt = (program) => {
    program.command('jira-login')
        .description('Login JIRA and save browser cache')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./jira')))).login();
    }));
    const cmdSync = program.command('jira-sync [yaml-file]')
        .description('Read YAML file and create new tasks in JIRA')
        .option('--headless', 'use headless puppeteer')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        if (cmdSync.opts().headless) {
            require('./puppeteer').setUseHeadless(true);
        }
        (yield Promise.resolve().then(() => __importStar(require('./jira')))).sync({ headless: cmdSync.opts().headless }, file);
    }));
    const cmdList = program.command('jira-list-story [URL]')
        .description('Fetch JIRA stories from remote server list page [URL],' +
        'default: https://issue.bkjk-inc.com/issues/?filter=14118')
        .option('--include <issue-prefix>', 'Only include issues with specific ID prefix')
        .option('--include-version <version>', 'Only inlucde issue with specific version')
        .option('--headless', 'use headless puppeteer')
        .action((url) => __awaiter(void 0, void 0, void 0, function* () {
        if (cmdList.opts().headless) {
            require('./puppeteer').setUseHeadless(true);
        }
        (yield Promise.resolve().then(() => __importStar(require('./jira')))).listStory(cmdList.opts(), url);
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUlBLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO1NBQzVCLFdBQVcsQ0FBQyxtQ0FBbUMsQ0FBQztTQUNoRCxNQUFNLENBQUMsQ0FBTyxJQUFZLEVBQUUsRUFBRTtRQUM3QixDQUFDLHdEQUFhLFFBQVEsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbkMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUdILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUM7U0FDdkQsV0FBVyxDQUFDLDZDQUE2QyxDQUFDO1NBQzFELE1BQU0sQ0FBQyxZQUFZLEVBQUUsd0JBQXdCLENBQUM7U0FDOUMsTUFBTSxDQUFDLENBQU8sSUFBWSxFQUFFLEVBQUU7UUFDN0IsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO1lBQzFCLE9BQU8sQ0FBQyxhQUFhLENBQXNCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ25FO1FBQ0QsQ0FBQyx3REFBYSxRQUFRLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDM0UsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUM7U0FDdkQsV0FBVyxDQUFDLHdEQUF3RDtRQUNuRSwwREFBMEQsQ0FBQztTQUM1RCxNQUFNLENBQUMsMEJBQTBCLEVBQUUsNkNBQTZDLENBQUM7U0FDakYsTUFBTSxDQUFDLDZCQUE2QixFQUFFLDBDQUEwQyxDQUFDO1NBQ2pGLE1BQU0sQ0FBQyxZQUFZLEVBQUUsd0JBQXdCLENBQUM7U0FDOUMsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLEVBQUU7UUFDNUIsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO1lBQzFCLE9BQU8sQ0FBQyxhQUFhLENBQXNCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ25FO1FBQ0QsQ0FBQyx3REFBYSxRQUFRLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9uIC8vICwgaW5pdENvbmZpZ0FzeW5jXG59IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0ICogYXMgcHVwcGV0ZWVyIGZyb20gJy4vcHVwcGV0ZWVyJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBwcm9ncmFtLmNvbW1hbmQoJ2ppcmEtbG9naW4nKVxuICAuZGVzY3JpcHRpb24oJ0xvZ2luIEpJUkEgYW5kIHNhdmUgYnJvd3NlciBjYWNoZScpXG4gIC5hY3Rpb24oYXN5bmMgKGZpbGU6IHN0cmluZykgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vamlyYScpKS5sb2dpbigpO1xuICB9KTtcblxuXG4gIGNvbnN0IGNtZFN5bmMgPSBwcm9ncmFtLmNvbW1hbmQoJ2ppcmEtc3luYyBbeWFtbC1maWxlXScpXG4gIC5kZXNjcmlwdGlvbignUmVhZCBZQU1MIGZpbGUgYW5kIGNyZWF0ZSBuZXcgdGFza3MgaW4gSklSQScpXG4gIC5vcHRpb24oJy0taGVhZGxlc3MnLCAndXNlIGhlYWRsZXNzIHB1cHBldGVlcicpXG4gIC5hY3Rpb24oYXN5bmMgKGZpbGU6IHN0cmluZykgPT4ge1xuICAgIGlmIChjbWRTeW5jLm9wdHMoKS5oZWFkbGVzcykge1xuICAgICAgKHJlcXVpcmUoJy4vcHVwcGV0ZWVyJykgYXMgdHlwZW9mIHB1cHBldGVlcikuc2V0VXNlSGVhZGxlc3ModHJ1ZSk7XG4gICAgfVxuICAgIChhd2FpdCBpbXBvcnQoJy4vamlyYScpKS5zeW5jKHtoZWFkbGVzczogY21kU3luYy5vcHRzKCkuaGVhZGxlc3N9LCBmaWxlKTtcbiAgfSk7XG5cbiAgY29uc3QgY21kTGlzdCA9IHByb2dyYW0uY29tbWFuZCgnamlyYS1saXN0LXN0b3J5IFtVUkxdJylcbiAgLmRlc2NyaXB0aW9uKCdGZXRjaCBKSVJBIHN0b3JpZXMgZnJvbSByZW1vdGUgc2VydmVyIGxpc3QgcGFnZSBbVVJMXSwnICtcbiAgICAnZGVmYXVsdDogaHR0cHM6Ly9pc3N1ZS5ia2prLWluYy5jb20vaXNzdWVzLz9maWx0ZXI9MTQxMTgnKVxuICAub3B0aW9uKCctLWluY2x1ZGUgPGlzc3VlLXByZWZpeD4nLCAnT25seSBpbmNsdWRlIGlzc3VlcyB3aXRoIHNwZWNpZmljIElEIHByZWZpeCcpXG4gIC5vcHRpb24oJy0taW5jbHVkZS12ZXJzaW9uIDx2ZXJzaW9uPicsICdPbmx5IGlubHVjZGUgaXNzdWUgd2l0aCBzcGVjaWZpYyB2ZXJzaW9uJylcbiAgLm9wdGlvbignLS1oZWFkbGVzcycsICd1c2UgaGVhZGxlc3MgcHVwcGV0ZWVyJylcbiAgLmFjdGlvbihhc3luYyAodXJsOiBzdHJpbmcpID0+IHtcbiAgICBpZiAoY21kTGlzdC5vcHRzKCkuaGVhZGxlc3MpIHtcbiAgICAgIChyZXF1aXJlKCcuL3B1cHBldGVlcicpIGFzIHR5cGVvZiBwdXBwZXRlZXIpLnNldFVzZUhlYWRsZXNzKHRydWUpO1xuICAgIH1cbiAgICAoYXdhaXQgaW1wb3J0KCcuL2ppcmEnKSkubGlzdFN0b3J5KGNtZExpc3Qub3B0cygpLCB1cmwpO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==