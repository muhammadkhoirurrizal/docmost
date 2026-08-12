import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ISuggestion } from '@/features/suggestion/types/suggestion.types';

export interface SuggestionOptions {
  suggestions: ISuggestion[];
  onSuggestionClick?: (suggestion: ISuggestion, pos: number) => void;
}

export const SuggestionPluginKey = new PluginKey('suggestion');

export const SuggestionExtension = Extension.create<SuggestionOptions>({
  name: 'suggestion',

  addOptions() {
    return {
      suggestions: [],
      onSuggestionClick: () => {},
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: SuggestionPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            let set = oldState.map(tr.mapping, tr.doc);
            
            // Re-create decorations if suggestions change (usually passed via meta or handled by react updating the extension options)
            // But since React will update the extension options, we can just rebuild it every time or listen to a meta transaction
            
            const action = tr.getMeta(SuggestionPluginKey);
            if (action && action.type === 'UPDATE_SUGGESTIONS') {
              const decos: Decoration[] = [];
              const suggestions = action.suggestions as ISuggestion[];
              
              suggestions.forEach((suggestion) => {
                if (suggestion.status !== 'PENDING') return;

                // Ensure the indices are valid within the document bounds
                const start = Math.max(0, suggestion.startIndex);
                const end = Math.min(tr.doc.content.size, suggestion.endIndex);
                
                if (start < end) {
                  decos.push(
                    Decoration.inline(start, end, {
                      class: 'suggestion-highlight',
                      'data-suggestion-id': suggestion.id,
                    })
                  );
                }
              });
              set = DecorationSet.create(tr.doc, decos);
            }

            return set;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            if (target && target.classList.contains('suggestion-highlight')) {
              const suggestionId = target.getAttribute('data-suggestion-id');
              if (suggestionId && options.onSuggestionClick) {
                const suggestion = options.suggestions.find(s => s.id === suggestionId);
                if (suggestion) {
                  options.onSuggestionClick(suggestion, pos);
                  return true; // handled
                }
              }
            }
            return false;
          }
        },
      }),
    ];
  },
});
