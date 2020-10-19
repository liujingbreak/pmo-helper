import pup from 'puppeteer-core';
export interface Options {
    headless: boolean;
}
export interface Issue {
    brief?: string;
    name: string;
    id: string;
    status: string;
    desc?: string;
    ver: string[];
    assignee: string;
    tasks?: Issue[];
    parentId?: string;
    endDate?: string;
    est?: number;
    intEst?: number;
    '+'?: {
        [assignee: string]: string[];
    };
}
export declare function login(): Promise<void>;
export declare function domToIssues(page: pup.Page, onEachPage?: (trPairs: [Issue, pup.ElementHandle][]) => Promise<void>): Promise<Issue[]>;
export declare function listStory(opts: {
    include?: string;
    includeVersion?: string;
}, url?: string): Promise<void>;
export declare function sync(opt: Options, sourceYamlFile?: string): Promise<void>;
export declare function listParent(): Promise<void>;
export declare function testDate(): void;
/**
 * Check README.md for command line arguments
 */
export declare function checkTask(updateVersion?: boolean): Promise<void>;
export declare function moveIssues(newParentId: string, ...movedIssueIds: string[]): Promise<void>;
export declare function assignIssues(assignee: string, ...issueIds: string[]): Promise<void>;
