import { Stack, Text, Badge, Group, Button, Box, Divider, ActionIcon, Tooltip } from '@mantine/core';
import { IconBulb, IconCheck, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ISuggestion } from '../types/suggestion.types';
import { formatRelativeTime } from '@/features/notification/notification.utils';

interface SuggestionCardProps {
  suggestion: ISuggestion;
  isEditor: boolean;
  onAccept: (suggestion: ISuggestion) => void;
  onReject: (suggestion: ISuggestion) => void;
  onWithdraw: (suggestion: ISuggestion) => void;
  onFocus: (suggestion: ISuggestion) => void;
  currentUserId?: string;
  isLoading?: boolean;
}

/**
 * Displays a single suggestion card.
 * Shows Accept/Reject for editors, Withdraw for creators.
 */
export function SuggestionCard({
  suggestion,
  isEditor,
  onAccept,
  onReject,
  onWithdraw,
  onFocus,
  currentUserId,
  isLoading,
}: SuggestionCardProps) {
  const { t } = useTranslation();
  const isOwn = suggestion.creatorId === currentUserId;

  return (
    <Box
      p="sm"
      style={{
        borderRadius: 'var(--mantine-radius-md)',
        border: '1px solid var(--mantine-color-default-border)',
        background: 'var(--mantine-color-body)',
        cursor: 'pointer',
      }}
      onClick={() => onFocus(suggestion)}
    >
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Group gap={4}>
          <IconBulb size={14} color="var(--mantine-color-yellow-filled)" />
          <Text size="xs" c="dimmed">
            {formatRelativeTime(suggestion.createdAt)}
          </Text>
        </Group>
        <Badge size="xs" variant="light" color="yellow">
          {t('Pending')}
        </Badge>
      </Group>

      <Text
        size="xs"
        c="dimmed"
        mb={2}
        style={{ textDecoration: 'line-through', fontStyle: 'italic' }}
        lineClamp={2}
      >
        {suggestion.originalText}
      </Text>
      <Text size="xs" c="teal" lineClamp={2}>
        → {suggestion.suggestedText}
      </Text>

      {isEditor && (
        <Group gap="xs" mt="sm" onClick={(e) => e.stopPropagation()}>
          <Button
            size="xs"
            color="green"
            leftSection={<IconCheck size={12} />}
            onClick={() => onAccept(suggestion)}
            loading={isLoading}
            flex={1}
          >
            {t('Accept')}
          </Button>
          <Button
            size="xs"
            variant="outline"
            color="red"
            leftSection={<IconX size={12} />}
            onClick={() => onReject(suggestion)}
            loading={isLoading}
            flex={1}
          >
            {t('Reject')}
          </Button>
        </Group>
      )}

      {!isEditor && isOwn && (
        <Group mt="sm" onClick={(e) => e.stopPropagation()}>
          <Button
            size="xs"
            variant="subtle"
            color="red"
            onClick={() => onWithdraw(suggestion)}
            loading={isLoading}
            fullWidth
          >
            {t('Withdraw')}
          </Button>
        </Group>
      )}
    </Box>
  );
}
