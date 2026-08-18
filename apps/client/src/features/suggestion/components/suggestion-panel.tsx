import { Stack, Text, ScrollArea } from '@mantine/core';
import { IconBulbOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '@tiptap/react';
import { ISuggestion, SuggestionStatus } from '../types/suggestion.types';
import {
  usePageSuggestionsQuery,
  useUpdateSuggestionMutation,
  useDeleteSuggestionMutation,
} from '../queries/suggestion-query';
import { userAtom } from '@/features/user/atoms/current-user-atom';
import { useAtomValue } from 'jotai';
import { SuggestionCard } from './suggestion-card';
import { usePageQuery } from '@/features/page/queries/page-query';
import { useGetSpaceBySlugQuery } from '@/features/space/queries/space-query';
import { useSpaceAbility } from '@/features/space/permissions/use-space-ability';
import { SpaceCaslAction, SpaceCaslSubject } from '@/features/space/permissions/permissions.type';

interface SuggestionPanelProps {
  pageId: string;
  editor: ReturnType<typeof useEditor>;
}

/**
 * Finds the start/end ProseMirror positions of a text string in the document.
 * Returns null if text is not found.
 */
function findTextRange(
  editor: ReturnType<typeof useEditor>,
  searchText: string,
): { start: number; end: number } | null {
  if (!editor) return null;

  let found: { start: number; end: number } | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (!node.isText || !node.text) return;

    const idx = node.text.indexOf(searchText);
    if (idx !== -1) {
      found = { start: pos + idx, end: pos + idx + searchText.length };
    }
  });

  return found;
}

/**
 * Scrolls to and highlights the originalText of a suggestion in the editor.
 * Single responsibility: focus + select + scroll to the suggestion text.
 */
function focusSuggestionInEditor(
  editor: ReturnType<typeof useEditor>,
  suggestion: ISuggestion,
) {
  if (!editor) return;

  const range = findTextRange(editor, suggestion.originalText);
  if (!range) return;

  // Use setTimeout to ensure focus isn't stolen back by the clicked panel element
  setTimeout(() => {
    // Select the text range so it's visually highlighted
    editor.chain().focus().setTextSelection({ from: range.start, to: range.end }).run();

    // Scroll to the selected range
    const coords = editor.view.coordsAtPos(range.start);
    window.scrollTo({ top: coords.top + window.scrollY - 120, behavior: 'smooth' });
  }, 10);
}

/**
 * Applies the accepted suggestion text in-place using live document positions.
 * Single responsibility: replace originalText with suggestedText in the editor.
 */
function applyAcceptToEditor(
  editor: ReturnType<typeof useEditor>,
  originalText: string,
  suggestedText: string,
) {
  if (!editor) return;

  const range = findTextRange(editor, originalText);
  if (!range) return;

  // Dispatch ProseMirror transaction directly to bypass Tiptap's isEditable=false lock
  // This allows the Owner to accept suggestions even when in "Viewing" mode
  editor.view.dispatch(
    editor.state.tr
      .delete(range.start, range.end)
      .insert(range.start, editor.schema.text(suggestedText))
  );
}

/**
 * Aside panel listing all pending suggestions for the current page.
 * Editors see Accept/Reject. Creators (visitors) see Withdraw.
 */
export default function SuggestionPanel({ pageId, editor }: SuggestionPanelProps) {
  const { t } = useTranslation();
  const { data: suggestions } = usePageSuggestionsQuery(pageId);
  const updateMutation = useUpdateSuggestionMutation();
  const deleteMutation = useDeleteSuggestionMutation();
  const currentUser = useAtomValue(userAtom);

  const { data: page } = usePageQuery({ pageId });
  const { data: space } = useGetSpaceBySlugQuery(page?.space?.slug);
  const spaceAbility = useSpaceAbility(space?.membership?.permissions);

  const isEditor =
    spaceAbility.can(SpaceCaslAction.Manage, SpaceCaslSubject.Page) ||
    spaceAbility.can(SpaceCaslAction.Edit, SpaceCaslSubject.Page);

  const pendingSuggestions = (suggestions ?? []).filter(
    (s) => s.status === SuggestionStatus.PENDING,
  );

  const handleAccept = async (suggestion: ISuggestion) => {
    // Apply the text change to the editor FIRST (optimistic update)
    applyAcceptToEditor(editor, suggestion.originalText, suggestion.suggestedText);
    
    try {
      await updateMutation.mutateAsync({
        id: suggestion.id,
        payload: { status: SuggestionStatus.ACCEPTED },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = (suggestion: ISuggestion) => {
    updateMutation.mutate({ id: suggestion.id, payload: { status: SuggestionStatus.REJECTED } });
  };

  const handleWithdraw = (suggestion: ISuggestion) => {
    deleteMutation.mutate(suggestion.id);
  };

  const handleFocus = (suggestion: ISuggestion) => {
    focusSuggestionInEditor(editor, suggestion);
  };

  if (pendingSuggestions.length === 0) {
    return (
      <Stack align="center" justify="center" h={200} gap="xs">
        <IconBulbOff size={32} color="var(--mantine-color-dimmed)" />
        <Text size="sm" c="dimmed">
          {t('No pending suggestions')}
        </Text>
      </Stack>
    );
  }

  return (
    <ScrollArea style={{ height: '85vh' }} scrollbarSize={5}>
      <Stack gap="sm" pb={200}>
        {pendingSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            isEditor={isEditor}
            currentUserId={currentUser?.id}
            onAccept={handleAccept}
            onReject={handleReject}
            onWithdraw={handleWithdraw}
            onFocus={handleFocus}
            isLoading={updateMutation.isPending || deleteMutation.isPending}
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}
