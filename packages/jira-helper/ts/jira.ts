export interface Issue {
  name: string;
  id: string;
  status: string;
  desc?: string;
  ver: string;
  assignee: string;
  tasks?: Issue[];
}

export function columnsToIssue(...cols: string[]): Issue {
  return {
    name: cols[2],
    id: cols[0],
    status: cols[1],
    ver: cols[3],
    assignee: cols[4]
  };
}

