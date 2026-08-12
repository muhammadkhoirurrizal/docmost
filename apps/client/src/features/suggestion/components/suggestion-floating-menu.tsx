import { Box, Button, Group, Text, Badge } from '@mantine/core';
import { useAtom } from 'jotai';
import { selectedSuggestionIdAtom } from '../atoms/suggestion-atom';
import { usePageSuggestionsQuery, useUpdateSuggestionMutation, useDeleteSuggestionMutation } from '../queries/suggestion-query';
import { useTranslation } from 'react-i18next';
import { useEditor } from '@tiptap/react';
import { SuggestionStatus } from '../types/suggestion.types';
import { userAtom } from '@/features/user/atoms/current-user-atom';
import { useAtomValue } from 'jotai';
import { IconTrash } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';

interface Props {
  editor: ReturnType<typeof useEditor>;
  pageId: string;
  editable: boolean;
}

export default function SuggestionFloatingMenu({ editor, pageId, editable }: Props) {
  const { t } = useTranslation();

  const [selectedId, setSelectedId] = useAtom(selectedSuggestionIdAtom);
  const { data: suggestions } = usePageSuggestionsQuery(pageId);
  const updateMutation = useUpdateSuggestionMutation();
  const deleteMutation = useDeleteSuggestionMutation();
  const currentUser = useAtomValue(userAtom);

  if (!selectedId || !suggestions || !editor) return null;

  const suggestion = suggestions.find(s => s.id === selectedId);
  if (!suggestion || suggestion.status !== SuggestionStatus.PENDING) return null;

  const handleClose = () => {
    setSelectedId('');
  };

  const handleAccept = async () => {
    await updateMutation.mutateAsync({
      id: suggestion.id,
      payload: { status: SuggestionStatus.ACCEPTED }
    });

    // Apply the edit to the document
    const { startIndex, endIndex, suggestedText } = suggestion;
    
    editor.chain().focus().deleteRange({ from: startIndex, to: endIndex }).insertContentAt(startIndex, suggestedText).run();
    handleClose();
  };

  const handleReject = async () => {
    await updateMutation.mutateAsync({
      id: suggestion.id,
      payload: { status: SuggestionStatus.REJECTED }
    });
    handleClose();
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(suggestion.id);
    handleClose();
  };

  const isCreator = currentUser?.id === suggestion.creatorId;

  return (
    <Box
      style={{
        position: 'fixed',
        top: '100px', // or position it based on the selection coordinates, but for now fixed is simpler
        right: '20px',
        width: '320px',
        background: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 1000,
        border: '1px solid #e9ecef',
      }}
    >
      <Group justify="space-between" mb="xs">
        <Text fw={500}>{t('Suggested Edit')}</Text>
        <Badge color="blue">{t('Pending')}</Badge>
      </Group>
      
      <Text size="sm" color="dimmed" mb="xs">
        {t('Original:')}
      </Text>
      <Text size="sm" style={{ 
        background: '#ffe3e3',
        padding: '4px 8px',
        borderRadius: '4px',
        textDecoration: 'line-through',
        marginBottom: '8px'
      }}>
        {suggestion.originalText}
      </Text>

      <Text size="sm" color="dimmed" mb="xs">
        {t('Suggestion:')}
      </Text>
      <Text size="sm" style={{ 
        background: '#d3f9d8',
        padding: '4px 8px',
        borderRadius: '4px',
        marginBottom: '16px'
      }}>
        {suggestion.suggestedText}
      </Text>

      {editable && (
        <Group justify="flex-end">
          <Button variant="outline" color="red" onClick={handleReject} loading={updateMutation.isPending}>
            {t('Reject')}
          </Button>
          <Button color="green" onClick={handleAccept} loading={updateMutation.isPending}>
            {t('Accept')}
          </Button>
        </Group>
      )}
      {!editable && isCreator && (
        <Group justify="flex-end">
          <Button variant="subtle" color="red" onClick={handleDelete} loading={deleteMutation.isPending} leftSection={<IconTrash size={16} />}>
            {t('Withdraw Suggestion')}
          </Button>
        </Group>
      )}
    </Box>
  );
}
