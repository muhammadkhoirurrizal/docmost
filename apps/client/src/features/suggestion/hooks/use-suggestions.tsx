import { useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { usePageSuggestionsQuery } from '@/features/suggestion/queries/suggestion-query';
import { SuggestionPluginKey } from '@/features/editor/extensions/suggestion';
import { useSetAtom } from 'jotai';
import { selectedSuggestionIdAtom } from '@/features/suggestion/atoms/suggestion-atom';
import { ISuggestion } from '@/features/suggestion/types/suggestion.types';

/**
 * Finds the actual ProseMirror position of a text string inside the document.
 * Returns { start, end } or null if text is not found.
 */
function findTextPosition(
  doc: ProseMirrorNode,
  searchText: string,
): { start: number; end: number } | null {
  let found: { start: number; end: number } | null = null;

  doc.descendants((node, pos) => {
    if (found) return false; // stop traversal once found
    if (!node.isText || !node.text) return;

    const idx = node.text.indexOf(searchText);
    if (idx !== -1) {
      found = { start: pos + idx, end: pos + idx + searchText.length };
    }
  });

  return found;
}

/**
 * Resolves the live document positions for a single suggestion using its originalText.
 * Returns the suggestion with corrected startIndex/endIndex, or null if text not found.
 */
function resolveSuggestionPosition(
  suggestion: ISuggestion,
  doc: ProseMirrorNode,
): (ISuggestion & { startIndex: number; endIndex: number }) | null {
  const position = findTextPosition(doc, suggestion.originalText);
  if (!position) return null;

  return {
    ...suggestion,
    startIndex: position.start,
    endIndex: position.end,
  };
}

/**
 * Maps all pending suggestions to their live positions in the document.
 * Filters out suggestions whose originalText is no longer found.
 */
function resolveAllSuggestionPositions(
  suggestions: ISuggestion[],
  doc: ProseMirrorNode,
): ISuggestion[] {
  return suggestions
    .map((s) => resolveSuggestionPosition(s, doc))
    .filter((s): s is ISuggestion => s !== null);
}

/**
 * Registers the onSuggestionClick handler on the extension options.
 * This allows the extension to communicate click events back to React.
 */
function registerSuggestionClickHandler(
  editor: ReturnType<typeof useEditor>,
  suggestions: ISuggestion[],
  onSuggestionClick: (suggestion: ISuggestion) => void,
) {
  if (!editor) return;
  const extension = editor.extensionManager.extensions.find((e) => e.name === 'suggestion');
  if (!extension) return;

  extension.options.suggestions = suggestions;
  extension.options.onSuggestionClick = onSuggestionClick;
}

/**
 * Dispatches a ProseMirror meta transaction to trigger the decoration plugin
 * to redraw all suggestion highlights.
 */
function dispatchSuggestionDecorations(
  editor: ReturnType<typeof useEditor>,
  resolvedSuggestions: ISuggestion[],
) {
  if (!editor) return;
  editor.view.dispatch(
    editor.view.state.tr.setMeta(SuggestionPluginKey, {
      type: 'UPDATE_SUGGESTIONS',
      suggestions: resolvedSuggestions,
    }),
  );
}

/**
 * Hook: syncs suggestion highlights from the server into the editor.
 *
 * Flow:
 * 1. Fetch PENDING suggestions for the page (polling every 5s)
 * 2. Resolve each suggestion's position by finding its `originalText` in the live document
 * 3. Register click handlers on the extension
 * 4. Dispatch decorations to draw the green highlights
 *
 * Also re-draws on editor 'create' so highlights appear immediately on page load.
 */
export const useSuggestions = (editor: ReturnType<typeof useEditor>, pageId: string) => {
  const { data: suggestions } = usePageSuggestionsQuery(pageId);
  const setSelectedSuggestionId = useSetAtom(selectedSuggestionIdAtom);

  const drawDecorations = (currentSuggestions: ISuggestion[]) => {
    if (!editor) return;

    const resolvedSuggestions = resolveAllSuggestionPositions(currentSuggestions, editor.state.doc);

    const handleSuggestionClick = (suggestion: ISuggestion) => {
      setSelectedSuggestionId(suggestion.id);
    };

    registerSuggestionClickHandler(editor, resolvedSuggestions, handleSuggestionClick);
    dispatchSuggestionDecorations(editor, resolvedSuggestions);
  };

  // Re-draw when data changes (polling hits)
  useEffect(() => {
    if (!editor || !suggestions) return;
    drawDecorations(suggestions);
  }, [editor, suggestions, setSelectedSuggestionId]);

  // Also draw immediately when editor finishes mounting (avoids "pancing" issue)
  useEffect(() => {
    if (!editor || !suggestions) return;

    const handleCreate = () => drawDecorations(suggestions);
    editor.on('create', handleCreate);

    return () => {
      editor.off('create', handleCreate);
    };
  }, [editor, suggestions]);
};
