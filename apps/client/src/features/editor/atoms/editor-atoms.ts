import { atom } from "jotai";
import { Editor } from "@tiptap/core";

export const pageEditorAtom = atom<Editor | null>(null);

export const titleEditorAtom = atom<Editor | null>(null);

export const readOnlyEditorAtom = atom<Editor | null>(null);

export const yjsConnectionStatusAtom = atom<string>("");

export const unsavedPageChangesAtom = atom<Record<string, boolean>>({});

export type LastSavedPage = {
  id: string;
  title: string;
  savedAt: number;
};

export const lastSavedPageAtom = atom<LastSavedPage | null>(
  null as LastSavedPage | null,
);
