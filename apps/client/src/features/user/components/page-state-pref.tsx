import { Text, MantineSize, SegmentedControl } from "@mantine/core";
import { useAtom } from "jotai";
import { userAtom } from "@/features/user/atoms/current-user-atom.ts";
import { updateUser } from "@/features/user/services/user-service.ts";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageEditMode } from "@/features/user/types/user.types.ts";
import {
  ResponsiveSettingsRow,
  ResponsiveSettingsContent,
  ResponsiveSettingsControl,
} from "@/components/ui/responsive-settings-row";
import {
  lastSavedPageAtom,
  pageEditorAtom,
  unsavedPageChangesAtom,
} from "@/features/editor/atoms/editor-atoms.ts";
import { useUpdatePageMutation } from "@/features/page/queries/page-query.ts";
import { notifications } from "@mantine/notifications";

export default function PageStatePref() {
  const { t } = useTranslation();

  return (
    <ResponsiveSettingsRow>
      <ResponsiveSettingsContent>
        <Text size="md">{t("Default page edit mode")}</Text>
        <Text size="sm" c="dimmed">
          {t("Choose your preferred page edit mode. Avoid accidental edits.")}
        </Text>
      </ResponsiveSettingsContent>

      <ResponsiveSettingsControl>
        <PageStateSegmentedControl />
      </ResponsiveSettingsControl>
    </ResponsiveSettingsRow>
  );
}

interface PageStateSegmentedControlProps {
  size?: MantineSize;
  pageId?: string;
}

export function PageStateSegmentedControl({
  size,
  pageId,
}: PageStateSegmentedControlProps) {
  const { t } = useTranslation();
  const [user, setUser] = useAtom(userAtom);
  const [pageEditor] = useAtom(pageEditorAtom);
  const [unsavedPageChanges, setUnsavedPageChanges] = useAtom(unsavedPageChangesAtom);
  const [, setLastSavedPage] = useAtom(lastSavedPageAtom);
  const updatePageMutation = useUpdatePageMutation();
  const pageEditMode =
    user?.settings?.preferences?.pageEditMode ?? PageEditMode.Edit;
  const [value, setValue] = useState(pageEditMode);
  const hasUnsavedChanges = pageId ? !!unsavedPageChanges[pageId] : false;

  const clearUnsavedChanges = useCallback(() => {
    if (!pageId) return;

    setUnsavedPageChanges((current) => {
      const { [pageId]: _removed, ...rest } = current;
      return rest;
    });
  }, [pageId, setUnsavedPageChanges]);

  const handleChange = useCallback(
    async (newValue: string) => {
      // Safety Check: Only save if the editor's internal pageId matches the expected pageId
      const editorPageId = pageEditor?.storage?.pageId;
      if (newValue === PageEditMode.Read && pageEditor && pageId) {
        if (editorPageId !== pageId) {
          const updatedUser = await updateUser({ pageEditMode: newValue });
          setValue(newValue);
          setUser(updatedUser);
          return;
        }

        try {
          const content = pageEditor.getJSON();
          const savedPage = await updatePageMutation.mutateAsync({
            pageId,
            content,
            forceHistorySave: true,
          });
          setLastSavedPage({
            id: pageId,
            title: savedPage.title || t("Untitled"),
            savedAt: Date.now(),
          });
          clearUnsavedChanges();
        } catch {
          notifications.show({
            message: t("Failed to save page"),
            color: "red",
            position: "top-right",
          });
          return; // Don't switch mode if save failed
        }
      }

      const updatedUser = await updateUser({ pageEditMode: newValue });
      setValue(newValue);
      setUser(updatedUser);
    },
    [setUser, pageEditor, pageId, updatePageMutation, setLastSavedPage, clearUnsavedChanges, t]
  );

  useEffect(() => {
    if (pageEditMode !== value) {
      setValue(pageEditMode);
    }
  }, [pageEditMode, value]);

  return (
    <SegmentedControl
      size={size}
      value={value}
      onChange={handleChange}
      color={hasUnsavedChanges ? "orange" : undefined}
      data={[
        { label: t("Edit"), value: PageEditMode.Edit },
        {
          label: hasUnsavedChanges ? (
            <Text span fw={600} c="orange.7" size={size === "xs" ? "xs" : undefined}>
              {t("Save")}
            </Text>
          ) : t("Read"),
          value: PageEditMode.Read
        },
      ]}
    />
  );
}
