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
import { useUserRole } from '@/hooks/use-user-role';
import { SuggestionCard } from './suggestion-card';

interface SuggestionPanelProps {
  pageId: string;
  editor: ReturnType<typeof useEditor>;
}

/**
 * Scrolls the editor view to the location of a suggestion's originalText.
 * Single responsibility: handle scroll-to-text navigation.
 */
function scrollToSuggestion(
  editor: ReturnType<typeof useEditor>,
  suggestion: ISuggestion,
) {
  if (!editor) return;

  let found = false;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (!node.isText || !node.text) return;

    const idx = node.text.indexOf(suggestion.originalText);
    if (idx !== -1) {
      const start = pos + idx;
      editor.chain().focus().setTextSelection(start).run();

      // Give time for focus to settle, then scroll to selection
      requestAnimationFrame(() => {
        const { view } = editor;
        const coords = view.coordsAtPos(start);
        window.scrollTo({ top: coords.top + window.scrollY - 120, behavior: 'smooth' });
      });

      found = true;
    }
  });
}

/**
 * Aside panel listing all pending suggestions for the current page.
 * Editors see Accept/Reject. Creators see Withdraw.
 */
export default function SuggestionPanel({ pageId, editor }: SuggestionPanelProps) {
  const { t } = useTranslation();
  const { data: suggestions } = usePageSuggestionsQuery(pageId);
  const updateMutation = useUpdateSuggestionMutation();
  const deleteMutation = useDeleteSuggestionMutation();
  const currentUser = useAtomValue(userAtom);
  const userRole = useUserRole();

  const pendingSuggestions = (suggestions ?? []).filter(
    (s) => s.status === SuggestionStatus.PENDING,
  );

  const handleAccept = (suggestion: ISuggestion) => {
    updateMutation.mutate({ id: suggestion.id, payload: { status: SuggestionStatus.ACCEPTED } });
  };

  const handleReject = (suggestion: ISuggestion) => {
    updateMutation.mutate({ id: suggestion.id, payload: { status: SuggestionStatus.REJECTED } });
  };

  const handleWithdraw = (suggestion: ISuggestion) => {
    deleteMutation.mutate(suggestion.id);
  };

  const handleFocus = (suggestion: ISuggestion) => {
    scrollToSuggestion(editor, suggestion);
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
            isEditor={!userRole.isVisitor}
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
