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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listIssues = void 0;
// import {Page, Browser} from 'puppeteer-core';
const jsYaml = __importStar(require("js-yaml"));
const jira_1 = require("./jira");
const puppeteer_1 = require("./puppeteer");
const fs_1 = __importDefault(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
const log = require('log4js').getLogger('jira-helper.team');
const allowedPrefix = 'HDECOR, BYJ, BCL, MF, ZLZB'.split(/\s*,\s*/).reduce((set, prefix) => {
    set.add(prefix);
    return set;
}, new Set());
function listIssues() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.launch();
        const page = (yield browser.pages())[0];
        yield page.goto('https://issue.bkjk-inc.com/issues/?filter=14126', { waitUntil: 'networkidle2' });
        const issues = yield jira_1.domToIssues(page);
        const filtered = issues.filter(issue => {
            const prefix = issue.id.slice(0, issue.id.indexOf('-'));
            return allowedPrefix.has(prefix);
        });
        log.info(`${filtered.length} issues.`);
        const grouped = lodash_1.default.groupBy(filtered, issue => issue.assignee);
        fs_1.default.writeFileSync('dist/team-issues.yaml', jsYaml.safeDump(grouped));
        log.info('Result has been written to dist/team-issues.yaml');
        // log.info('Issue prefixes:', Array.from(prefixSet.values()).join(', '));
        yield browser.close();
    });
}
exports.listIssues = listIssues;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUFnRDtBQUNoRCxnREFBa0M7QUFDbEMsaUNBQW1DO0FBQ25DLDJDQUFtQztBQUNuQyw0Q0FBb0I7QUFDcEIsb0RBQXVCO0FBQ3ZCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUU1RCxNQUFNLGFBQWEsR0FBRyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFO0lBQ3pGLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDaEIsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQVUsQ0FBQyxDQUFDO0FBSXRCLFNBQXNCLFVBQVU7O1FBRTlCLE1BQU0sT0FBTyxHQUFHLE1BQU0sa0JBQU0sRUFBRSxDQUFDO1FBQy9CLE1BQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsaURBQWlELEVBQUUsRUFBQyxTQUFTLEVBQUUsY0FBYyxFQUFDLENBQUMsQ0FBQztRQUVoRyxNQUFNLE1BQU0sR0FBRyxNQUFNLGtCQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdkMsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNyQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN4RCxPQUFPLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sVUFBVSxDQUFDLENBQUM7UUFFdkMsTUFBTSxPQUFPLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdELFlBQUUsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0RBQWtELENBQUMsQ0FBQztRQUU3RCwwRUFBMEU7UUFDMUUsTUFBTSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEIsQ0FBQztDQUFBO0FBckJELGdDQXFCQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCB7UGFnZSwgQnJvd3Nlcn0gZnJvbSAncHVwcGV0ZWVyLWNvcmUnO1xuaW1wb3J0ICogYXMganNZYW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IHtkb21Ub0lzc3Vlc30gZnJvbSAnLi9qaXJhJztcbmltcG9ydCB7bGF1bmNofSBmcm9tICcuL3B1cHBldGVlcic7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignamlyYS1oZWxwZXIudGVhbScpO1xuXG5jb25zdCBhbGxvd2VkUHJlZml4ID0gJ0hERUNPUiwgQllKLCBCQ0wsIE1GLCBaTFpCJy5zcGxpdCgvXFxzKixcXHMqLykucmVkdWNlKChzZXQsIHByZWZpeCkgPT4ge1xuICBzZXQuYWRkKHByZWZpeCk7XG4gIHJldHVybiBzZXQ7XG59LCBuZXcgU2V0PHN0cmluZz4oKSk7XG5cblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdElzc3VlcygpIHtcblxuICBjb25zdCBicm93c2VyID0gYXdhaXQgbGF1bmNoKCk7XG4gIGNvbnN0IHBhZ2UgPSAoYXdhaXQgYnJvd3Nlci5wYWdlcygpKVswXTtcbiAgYXdhaXQgcGFnZS5nb3RvKCdodHRwczovL2lzc3VlLmJramstaW5jLmNvbS9pc3N1ZXMvP2ZpbHRlcj0xNDEyNicsIHt3YWl0VW50aWw6ICduZXR3b3JraWRsZTInfSk7XG5cbiAgY29uc3QgaXNzdWVzID0gYXdhaXQgZG9tVG9Jc3N1ZXMocGFnZSk7XG5cbiAgY29uc3QgZmlsdGVyZWQgPSBpc3N1ZXMuZmlsdGVyKGlzc3VlID0+IHtcbiAgICBjb25zdCBwcmVmaXggPSBpc3N1ZS5pZC5zbGljZSgwLCBpc3N1ZS5pZC5pbmRleE9mKCctJykpO1xuICAgIHJldHVybiBhbGxvd2VkUHJlZml4LmhhcyhwcmVmaXgpO1xuICB9KTtcblxuICBsb2cuaW5mbyhgJHtmaWx0ZXJlZC5sZW5ndGh9IGlzc3Vlcy5gKTtcblxuICBjb25zdCBncm91cGVkID0gXy5ncm91cEJ5KGZpbHRlcmVkLCBpc3N1ZSA9PiBpc3N1ZS5hc3NpZ25lZSk7XG4gIGZzLndyaXRlRmlsZVN5bmMoJ2Rpc3QvdGVhbS1pc3N1ZXMueWFtbCcsIGpzWWFtbC5zYWZlRHVtcChncm91cGVkKSk7XG4gIGxvZy5pbmZvKCdSZXN1bHQgaGFzIGJlZW4gd3JpdHRlbiB0byBkaXN0L3RlYW0taXNzdWVzLnlhbWwnKTtcblxuICAvLyBsb2cuaW5mbygnSXNzdWUgcHJlZml4ZXM6JywgQXJyYXkuZnJvbShwcmVmaXhTZXQudmFsdWVzKCkpLmpvaW4oJywgJykpO1xuICBhd2FpdCBicm93c2VyLmNsb3NlKCk7XG59XG4iXX0=