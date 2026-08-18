import { Box, Button, Group, Text, Badge, ActionIcon } from '@mantine/core';
import { useAtom } from 'jotai';
import { selectedSuggestionIdAtom } from '../atoms/suggestion-atom';
import { usePageSuggestionsQuery, useUpdateSuggestionMutation, useDeleteSuggestionMutation } from '../queries/suggestion-query';
import { useTranslation } from 'react-i18next';
import { useEditor } from '@tiptap/react';
import { SuggestionStatus } from '../types/suggestion.types';
import { userAtom } from '@/features/user/atoms/current-user-atom';
import { useAtomValue } from 'jotai';
import { IconTrash, IconX } from '@tabler/icons-react';
import { usePageQuery } from '@/features/page/queries/page-query';
import { useGetSpaceBySlugQuery } from '@/features/space/queries/space-query';
import { useSpaceAbility } from '@/features/space/permissions/use-space-ability';
import { SpaceCaslAction, SpaceCaslSubject } from '@/features/space/permissions/permissions.type';

interface Props {
  editor: ReturnType<typeof useEditor>;
  pageId: string;
  editable: boolean;
}

/**
 * Finds the actual ProseMirror position of a text string inside the document.
 * Returns { start, end } or null if not found.
 */
function findLivePosition(
  editor: ReturnType<typeof useEditor>,
  originalText: string,
): { start: number; end: number } | null {
  if (!editor) return null;

  let found: { start: number; end: number } | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (!node.isText || !node.text) return;

    const idx = node.text.indexOf(originalText);
    if (idx !== -1) {
      found = { start: pos + idx, end: pos + idx + originalText.length };
    }
  });

  return found;
}

/**
 * Applies the accepted suggestion text to the editor document.
 * Uses live position lookup (not stale DB index) for accuracy.
 */
function applyAcceptedTextToEditor(
  editor: ReturnType<typeof useEditor>,
  originalText: string,
  suggestedText: string,
) {
  const position = findLivePosition(editor, originalText);
  if (!position) return;

  // Dispatch ProseMirror transaction directly to bypass Tiptap's isEditable=false lock
  // This allows the Owner to accept suggestions even when in "Viewing" mode
  editor.view.dispatch(
    editor.state.tr
      .delete(position.start, position.end)
      .insert(position.start, editor.schema.text(suggestedText))
  );
}

/**
 * Floating popup that appears when user clicks a suggestion highlight.
 * Shows Accept/Reject for editors, Withdraw + Close for creators.
 * Always shows a Close (X) button so it can be dismissed.
 */
export default function SuggestionFloatingMenu({ editor, pageId, editable }: Props) {
  const { t } = useTranslation();

  const [selectedId, setSelectedId] = useAtom(selectedSuggestionIdAtom);
  const { data: suggestions } = usePageSuggestionsQuery(pageId);
  const updateMutation = useUpdateSuggestionMutation();
  const deleteMutation = useDeleteSuggestionMutation();
  const currentUser = useAtomValue(userAtom);

  const { data: page } = usePageQuery({ pageId });
  const { data: space } = useGetSpaceBySlugQuery(page?.space?.slug);
  const spaceAbility = useSpaceAbility(space?.membership?.permissions);

  const hasEditPermission =
    spaceAbility.can(SpaceCaslAction.Manage, SpaceCaslSubject.Page) ||
    spaceAbility.can(SpaceCaslAction.Edit, SpaceCaslSubject.Page);

  if (!selectedId || !suggestions || !editor) return null;

  const suggestion = suggestions.find(s => s.id === selectedId);
  if (!suggestion || suggestion.status !== SuggestionStatus.PENDING) return null;

  const isCreator = currentUser?.id === suggestion.creatorId;

  const handleClose = () => setSelectedId('');

  const handleAccept = async () => {
    // Optimistically apply text to editor first to avoid component unmount race conditions
    applyAcceptedTextToEditor(editor, suggestion.originalText, suggestion.suggestedText);
    
    try {
      await updateMutation.mutateAsync({
        id: suggestion.id,
        payload: { status: SuggestionStatus.ACCEPTED },
      });
    } catch (e) {
      console.error(e);
      // If it fails, ideally we would revert, but for now just close
    }
    handleClose();
  };

  const handleReject = async () => {
    await updateMutation.mutateAsync({
      id: suggestion.id,
      payload: { status: SuggestionStatus.REJECTED },
    });
    handleClose();
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(suggestion.id);
    handleClose();
  };

  return (
    <Box
      style={{
        position: 'fixed',
        top: '100px',
        right: '20px',
        width: '320px',
        background: 'var(--mantine-color-body)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        borderRadius: 'var(--mantine-radius-md)',
        padding: '16px',
        zIndex: 1000,
        border: '1px solid var(--mantine-color-default-border)',
      }}
    >
      {/* Header row — always has a Close button (fix problem 4) */}
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Group gap={6}>
          <Text fw={500} size="sm">{t('Suggested Edit')}</Text>
          <Badge size="xs" color="yellow" variant="light">{t('Pending')}</Badge>
        </Group>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleClose();
          }}
          aria-label={t('Close')}
        >
          <IconX size={14} />
        </ActionIcon>
      </Group>

      <Text size="xs" c="dimmed" mb={4}>{t('Original:')}</Text>
      <Text
        size="sm"
        mb="xs"
        style={{
          background: 'rgba(250, 82, 82, 0.1)',
          padding: '4px 8px',
          borderRadius: 'var(--mantine-radius-sm)',
          textDecoration: 'line-through',
          color: 'var(--mantine-color-text)',
        }}
      >
        {suggestion.originalText}
      </Text>

      <Text size="xs" c="dimmed" mb={4}>{t('Suggestion:')}</Text>
      <Text
        size="sm"
        mb="md"
        style={{
          background: 'rgba(64, 192, 87, 0.1)',
          padding: '4px 8px',
          borderRadius: 'var(--mantine-radius-sm)',
          color: 'var(--mantine-color-text)',
        }}
      >
        {suggestion.suggestedText}
      </Text>

      {/* Only users with Edit permission can Accept/Reject (even if currently in View mode) */}
      {hasEditPermission && (
        <Group justify="flex-end">
          <Button variant="outline" color="red" size="xs" onClick={handleReject} loading={updateMutation.isPending}>
            {t('Reject')}
          </Button>
          <Button color="green" size="xs" onClick={handleAccept} loading={updateMutation.isPending}>
            {t('Accept')}
          </Button>
        </Group>
      )}

      {/* Visitors who are creators can only Withdraw their own suggestion */}
      {!hasEditPermission && isCreator && (
        <Group justify="flex-end">
          <Button
            variant="subtle"
            color="red"
            size="xs"
            onClick={handleDelete}
            loading={deleteMutation.isPending}
            leftSection={<IconTrash size={14} />}
          >
            {t('Withdraw')}
          </Button>
        </Group>
      )}

      {/* Visitor who is NOT the creator — just show info, no actions */}
      {!hasEditPermission && !isCreator && (
        <Text size="xs" c="dimmed" ta="center">
          {t('You can only view this suggestion')}
        </Text>
      )}
    </Box>
  );
}
