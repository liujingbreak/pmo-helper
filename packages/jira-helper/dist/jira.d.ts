export interface Issue {
    id: string;
    state: string;
    name: string;
    desc?: string;
    ver: string;
    assignee: string;
    tasks?: Issue[];
}
export declare function columnsToIssue(...cols: string[]): Issue;
