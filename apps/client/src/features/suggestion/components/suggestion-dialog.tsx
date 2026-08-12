import { Box, Button, Group, Text, Textarea } from '@mantine/core';
import { useAtom } from 'jotai';
import { showSuggestionPopupAtom, suggestionRangeAtom } from '../atoms/suggestion-atom';
import { useState } from 'react';
import { useCreateSuggestionMutation } from '../queries/suggestion-query';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { extractPageSlugId } from '@/lib';
import { usePageQuery } from '@/features/page/queries/page-query';

export default function SuggestionDialog() {
  const { t } = useTranslation();
  const { pageSlug } = useParams();
  const pageId = extractPageSlugId(pageSlug);

  const [opened, setOpened] = useAtom(showSuggestionPopupAtom);
  const [range, setRange] = useAtom(suggestionRangeAtom);

  const [text, setText] = useState('');
  const createMutation = useCreateSuggestionMutation();

  const handleClose = () => {
    setOpened(false);
    setRange({ active: false, from: 0, to: 0, originalText: '' });
    setText('');
  };

  const handleSubmit = async () => {
    if (!range.active || !text.trim() || !pageId) return;

    await createMutation.mutateAsync({
      pageId,
      originalText: range.originalText,
      suggestedText: text,
      startIndex: range.from,
      endIndex: range.to,
    });

    handleClose();
  };

  if (!opened || !range.active) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '320px',
        background: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 1000,
      }}
    >
      <Text fw={500} mb="sm">{t('Suggest Edit')}</Text>
      
      <Text size="sm" color="dimmed" mb="xs" style={{ 
        whiteSpace: 'nowrap', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis',
        background: '#f1f3f5',
        padding: '4px 8px',
        borderRadius: '4px'
      }}>
        <del>{range.originalText}</del>
      </Text>

      <Textarea
        placeholder={t('Enter your suggested text...')}
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        minRows={3}
        mb="md"
        data-autofocus
      />

      <Group justify="flex-end">
        <Button variant="default" onClick={handleClose}>
          {t('Cancel')}
        </Button>
        <Button onClick={handleSubmit} loading={createMutation.isPending} disabled={!text.trim()}>
          {t('Submit')}
        </Button>
      </Group>
    </Box>
  );
}
