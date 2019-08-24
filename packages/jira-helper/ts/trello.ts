export interface TrelloBoard {
  name: string;
  cards: TrelloCard[];
}

export interface TrelloCard {
  title: string;
  shortId: string;
}
