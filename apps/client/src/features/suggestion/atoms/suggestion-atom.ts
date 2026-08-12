import { atom } from 'jotai';

export const showSuggestionPopupAtom = atom<boolean>(false);
export const suggestionRangeAtom = atom({ active: false, from: 0, to: 0, originalText: '' });
export const selectedSuggestionIdAtom = atom('');
