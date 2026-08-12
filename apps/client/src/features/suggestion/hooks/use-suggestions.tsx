import { useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import { usePageSuggestionsQuery } from '@/features/suggestion/queries/suggestion-query';
import { SuggestionPluginKey } from '@/features/editor/extensions/suggestion';
import { useSetAtom } from 'jotai';
import { selectedSuggestionIdAtom } from '@/features/suggestion/atoms/suggestion-atom';

export const useSuggestions = (editor: ReturnType<typeof useEditor>, pageId: string) => {
  const { data: suggestions } = usePageSuggestionsQuery(pageId);
  const setSelectedSuggestionId = useSetAtom(selectedSuggestionIdAtom);

  useEffect(() => {
    if (!editor || !suggestions) return;

    // Update the extension options so that onSuggestionClick has access to the latest data
    const extension = editor.extensionManager.extensions.find((e) => e.name === 'suggestion');
    if (extension) {
      extension.options.suggestions = suggestions;
      extension.options.onSuggestionClick = (suggestion) => {
        setSelectedSuggestionId(suggestion.id);
      };
    }

    // Dispatch a meta transaction to trigger the plugin's apply method and redraw decorations
    editor.view.dispatch(
      editor.view.state.tr.setMeta(SuggestionPluginKey, {
        type: 'UPDATE_SUGGESTIONS',
        suggestions,
      })
    );
  }, [editor, suggestions]);
};
