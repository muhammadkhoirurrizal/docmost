import { Editor, Range } from "@tiptap/core";

export interface MentionListProps {
  query: string;
  command: any;
  items: [];
  range: Range;
  text: string;
  editor: Editor;
}

export interface MentionSuggestionItemBase {
  entityType: string;
  label: string;
  id?: string | null;
  entityId?: string;
  slugId?: string;
  icon?: string;
  avatarUrl?: string;
  hasChildren?: boolean;
  isExpanded?: boolean;
  depth?: number;
}

export type MentionSuggestionItem = MentionSuggestionItemBase;