import { useAtom } from "jotai";
import { useCallback } from "react";
import { pageEditorAtom, unsavedPageChangesAtom } from "@/features/editor/atoms/editor-atoms";
import { useUpdatePageMutation } from "@/features/page/queries/page-query";
import { notifications } from "@mantine/notifications";

export function useManualSave(pageId: string) {
    const [pageEditor] = useAtom(pageEditorAtom);
    const [, setUnsavedPageChanges] = useAtom(unsavedPageChangesAtom);
    const updatePageMutation = useUpdatePageMutation();

    const handleManualSave = useCallback(async () => {
        if (!pageEditor) {
            return;
        }

        try {
            const content = pageEditor.getJSON();

            await updatePageMutation.mutateAsync({
                pageId,
                content,
                forceHistorySave: true,
            });

            setUnsavedPageChanges((current) => {
                const { [pageId]: _removed, ...rest } = current;
                return rest;
            });
        } catch {
            notifications.show({
                message: "Failed to save page",
                color: "red",
                position: "top-right",
            });
        }
    }, [pageEditor, pageId, updatePageMutation, setUnsavedPageChanges]);

    return { handleManualSave, isSaving: updatePageMutation.isPending };
}
