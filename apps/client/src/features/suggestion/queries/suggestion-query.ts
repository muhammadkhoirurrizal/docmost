import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSuggestion,
  getPageSuggestions,
  updateSuggestion,
  deleteSuggestion,
} from '../services/suggestion-service';
import { ICreateSuggestionPayload, IUpdateSuggestionPayload } from '../types/suggestion.types';

export const suggestionKeys = {
  all: ['suggestions'] as const,
  lists: () => [...suggestionKeys.all, 'list'] as const,
  list: (pageId: string) => [...suggestionKeys.lists(), { pageId }] as const,
};

export const usePageSuggestionsQuery = (pageId?: string) => {
  return useQuery({
    queryKey: suggestionKeys.list(pageId as string),
    queryFn: () => getPageSuggestions(pageId as string),
    enabled: !!pageId,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
};

export const useCreateSuggestionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ICreateSuggestionPayload) => createSuggestion(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: suggestionKeys.list(data.pageId),
      });
    },
  });
};

export const useUpdateSuggestionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IUpdateSuggestionPayload }) =>
      updateSuggestion(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: suggestionKeys.list(data.pageId),
      });
    },
  });
};

export const useDeleteSuggestionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSuggestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: suggestionKeys.lists(),
      });
    },
  });
};
