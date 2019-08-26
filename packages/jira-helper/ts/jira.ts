export interface Issue {
  id: string;
  state: string;
  name: string;
  desc?: string;
  ver: string;
  assignee: string;
  tasks?: Issue[];
}

export function columnsToIssue(...cols: string[]): Issue {
  return {
    id: cols[0],
    state: cols[1],
    name: cols[2],
    ver: cols[3],
    assignee: cols[4]
  };
}

