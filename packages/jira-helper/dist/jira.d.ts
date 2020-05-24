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
export declare function listStory(url?: string): Promise<void>;
export declare function sync(): Promise<void>;
export declare function listParent(): Promise<void>;
export declare function testDate(): void;
/**
 * Check README.md for command line arguments
 */
export declare function checkTask(): Promise<void>;
export declare function moveIssues(newParentId: string, ...movedIssueIds: string[]): Promise<void>;
export declare function assignIssues(assignee: string, ...issueIds: string[]): Promise<void>;
