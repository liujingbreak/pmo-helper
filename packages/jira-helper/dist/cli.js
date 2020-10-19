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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const dist_1 = require("@wfh/plink/wfh/dist");
const cliExt = (program, withGlobalOptions) => {
    const cmdSync = program.command('jira-sync [yaml-file]')
        .description('Read YAML file and create new tasks in JIRA')
        .option('--headless', 'use headless puppeteer')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        dist_1.initConfig(cmdSync.opts());
        dist_1.initProcess();
        require('@wfh/plink/wfh/dist').prepareLazyNodeInjector();
        if (cmdSync.opts().headless) {
            require('./puppeteer').setUseHeadless(true);
        }
        (yield Promise.resolve().then(() => __importStar(require('./jira')))).sync({ headless: cmdSync.opts().headless }, file);
    }));
    withGlobalOptions(cmdSync);
    const cmdList = program.command('jira-list-story')
        .description('Fetch JIRA stories from remote server')
        .option('--headless', 'use headless puppeteer')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        dist_1.initConfig(cmdList.opts());
        dist_1.initProcess();
        require('@wfh/plink/wfh/dist').prepareLazyNodeInjector();
        if (cmdList.opts().headless) {
            require('./puppeteer').setUseHeadless(true);
        }
        (yield Promise.resolve().then(() => __importStar(require('./jira')))).listStory();
    }));
    withGlobalOptions(cmdList);
};
exports.default = cliExt;

//# sourceMappingURL=cli.js.map
