export interface TrelloColumn {
    name: string;
    id?: string;
    cards: TrelloCard[];
}
export interface TrelloCard {
    title: string;
    shortId: string;
    id?: string;
}
export declare function listTrello(): Promise<void>;
export declare function test(): Promise<void>;
export declare function apiTest(): Promise<void>;
export declare function apiGetList(boardId?: string): Promise<void>;
