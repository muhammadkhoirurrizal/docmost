export enum SuggestionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export interface ISuggestion {
  id: string;
  pageId: string;
  creatorId: string;
  originalText: string | null;
  suggestedText: string;
  startIndex: number;
  endIndex: number;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateSuggestionPayload {
  pageId: string;
  originalText?: string | null;
  suggestedText: string;
  startIndex: number;
  endIndex: number;
}

export interface IUpdateSuggestionPayload {
  status: SuggestionStatus;
}
