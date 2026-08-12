import api from '@/lib/api-client';
import {
  ICreateSuggestionPayload,
  ISuggestion,
  IUpdateSuggestionPayload,
} from '../types/suggestion.types';

export const createSuggestion = async (
  payload: ICreateSuggestionPayload,
): Promise<ISuggestion> => {
  const response = await api.post('/suggestions/create', payload);
  return response.data;
};

export const getPageSuggestions = async (
  pageId: string,
): Promise<ISuggestion[]> => {
  const response = await api.get(`/suggestions/page/${pageId}`);
  return response.data;
};

export const updateSuggestion = async (
  id: string,
  payload: IUpdateSuggestionPayload,
): Promise<ISuggestion> => {
  const response = await api.patch(`/suggestions/${id}`, payload);
  return response.data;
};
