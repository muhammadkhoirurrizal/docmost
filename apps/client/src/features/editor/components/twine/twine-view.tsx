import { NodeViewProps, NodeViewWrapper, useEditorState } from "@tiptap/react";
import React, { useMemo, useCallback } from "react";
import clsx from "clsx";
import {
    Button,
    Card,
    Text,
    Popover,
    Stack,
} from "@mantine/core";
import { IconEdit, IconPlayerPlay, IconUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getFileUrl } from "@/lib/config.ts";
import { ResizableWrapper } from "../common/resizable-wrapper";
import { uploadFile } from "@/features/page/services/page-service.ts";
import { deleteAttachment } from "@/features/attachments/services/attachment-service.ts";
import { IAttachment } from "@/features/attachments/types/attachment.types.ts";
import { notifications } from "@mantine/notifications";
import classes from "./twine-view.module.css";

export default function TwineView(props: NodeViewProps) {
    const { t } = useTranslation();
    const { node, selected, updateAttributes, editor } = props;
    const { attachmentId, playUrl, playAttachmentId, height: nodeHeight, title } = node.attrs;


    const isEditable = useEditorState({
        editor,
        selector: (ctx) => ctx.editor.isEditable,
    });

    const fileInputRef = React.useRef<HTMLInputElement>(null);


    const finalPlayUrl = useMemo(() => {
        if (playUrl) {
            return playUrl;
        }
        if (playAttachmentId) {
            return getFileUrl(playAttachmentId);
        }
        return null;
    }, [playUrl, playAttachmentId]);


    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const pageId = editor.storage.pageId;
        if (!pageId) return;

        try {
            const oldAttachmentId = attachmentId;
            const response = await uploadFile(file, pageId);
            // handled potential wrapping by TransformHttpResponseInterceptor
            // @ts-ignore
            const attachment = response?.data || response;

            if (!attachment?.id) {
                throw new Error("Failed to get attachment ID");
            }

            const playUrl = `/api/files/${attachment.id}/${attachment.fileName}`;

            updateAttributes({
                playAttachmentId: attachment.id,
                playUrl: playUrl,
                attachmentId: attachment.id,
                title: attachment.fileName || file.name,
            });

            if (oldAttachmentId) {
                deleteAttachment(oldAttachmentId).catch(err => {
                    console.error("Failed to delete old attachment:", err);
                });
            }

            notifications.show({
                message: t("Story uploaded successfully"),
                color: "green",
            });
        } catch (error) {
            notifications.show({
                message: t("Failed to upload story"),
                color: "red",
            });
        }
    }, [editor.storage.pageId, updateAttributes, t]);

    const handleResize = useCallback(
        (newHeight: number) => {
            updateAttributes({ height: newHeight });
        },
        [updateAttributes],
    );

    return (
        <NodeViewWrapper
            data-drag-handle
            className={clsx(classes.twineWrapper, {
                [classes.selected]: selected,
            })}
            contentEditable={false}
        >
            <ResizableWrapper
                initialHeight={nodeHeight || 600}
                minHeight={200}
                maxHeight={2000}
                onResize={handleResize}
                isEditable={isEditable}
            >
                {isEditable ? (
                    <Card
                        radius="md"
                        p="xl"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                        }}
                        withBorder
                    >
                        <IconPlayerPlay size={48} color="var(--mantine-color-blue-6)" />
                        <Text size="lg" mt="md" fw={500}>
                            {t("Twine Story")}
                        </Text>
                        <Text size="sm" c="dimmed" mb="xl" ta="center" style={{ maxWidth: "80%" }}>
                            {finalPlayUrl
                                ? title
                                    ? `${t("Selected")}: ${title}`
                                    : t("Story selected and ready")
                                : t("No story data selected")}
                        </Text>
                        <Popover width={300} position="bottom" withArrow shadow="md">
                            <Popover.Target>
                                <Button leftSection={<IconEdit size={16} />}>
                                    {finalPlayUrl ? t("Change Story") : t("Select Story")}
                                </Button>
                            </Popover.Target>
                            <Popover.Dropdown bg="var(--mantine-color-body)">
                                <Stack gap="xs">
                                    <Text size="sm" fw={500}>{t("Upload Story File")}</Text>
                                    <Button
                                        variant="light"
                                        leftSection={<IconUpload size={16} />}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {t("Upload HTML file")}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: "none" }}
                                        accept=".html"
                                        onChange={handleFileUpload}
                                    />
                                </Stack>
                            </Popover.Dropdown>
                        </Popover>
                    </Card>
                ) : finalPlayUrl ? (
                    <iframe
                        className={classes.twineIframe}
                        src={finalPlayUrl}
                        allow="encrypted-media"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        allowFullScreen
                        style={{ width: "100%", height: "100%", border: "none" }}
                    />
                ) : (
                    <Card
                        radius="md"
                        p="xl"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                        }}
                        withBorder
                    >
                        <IconPlayerPlay size={48} color="var(--mantine-color-blue-6)" />
                        <Text size="lg" mt="md" fw={500}>
                            {t("Twine Story")}
                        </Text>
                        <Text size="sm" c="dimmed">
                            {t("No story data selected")}
                        </Text>
                    </Card>
                )}
            </ResizableWrapper>
        </NodeViewWrapper>
    );
}
