import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
import clsx from "clsx";
import {
  ActionIcon,
  Button,
  Card,
  FocusTrap,
  Group,
  Popover,
  Text,
  TextInput,
  Modal,
  Tooltip,
} from "@mantine/core";
import { IconEdit, IconExternalLink, IconMaximize } from "@tabler/icons-react";
import { z } from "zod";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import {
  getEmbedProviderById,
  getEmbedUrlAndProvider,
  sanitizeUrl,
} from "@docmost/editor-ext";
import { ResizableWrapper } from "../common/resizable-wrapper";
import classes from "./embed-view.module.css";
import { NodeSelection } from "@tiptap/pm/state";
import { useDisclosure } from "@mantine/hooks";

const schema = z.object({
  url: z
    .string()
    .trim()
    .url({ message: i18n.t("Please enter a valid url") }),
});

export default function EmbedView(props: NodeViewProps) {
  const { t } = useTranslation();
  const { node, selected, updateAttributes, editor, getPos } = props;
  const { src, provider, height: nodeHeight } = node.attrs;
  const [opened, { open, close }] = useDisclosure(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollPosRef = useRef({ x: 0, y: 0 });

  const embedUrl = useMemo(() => {
    if (src) {
      return getEmbedUrlAndProvider(src).embedUrl;
    }
    return null;
  }, [src]);

  const embedForm = useForm<{ url: string }>({
    initialValues: {
      url: "",
    },
    validate: zodResolver(schema),
  });

  const handleResize = useCallback(
    (newHeight: number) => {
      updateAttributes({ height: newHeight });
    },
    [updateAttributes],
  );

  // SCROLL JUMP PROTECTION FOR IN-PLACE EDITING
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      if (e.target === iframeRef.current) {
        const { x, y } = scrollPosRef.current;
        const start = Date.now();
        const lock = () => {
          if (Date.now() - start < 500) {
            if (window.scrollY !== y) window.scrollTo(x, y);
            requestAnimationFrame(lock);
          }
        };
        lock();
      }
    };

    window.addEventListener("focus", handleFocus, true);
    return () => window.removeEventListener("focus", handleFocus, true);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editor.isEditable || typeof getPos !== "function") return;

    // Record position precisely
    scrollPosRef.current = { x: window.scrollX, y: window.scrollY };

    if (!selected) {
      e.preventDefault();
      e.stopPropagation();
      const pos = getPos();
      editor.view.dispatch(
        editor.state.tr
          .setSelection(NodeSelection.create(editor.state.doc, pos))
          .setMeta("scrollIntoView", false)
      );
    } else {
      // If already selected, stop propagation so Tiptap doesn't deselect,
      // but let the click happen on our overlay.
      e.stopPropagation();
    }
  }, [editor, getPos, selected]);

  async function onSubmit(data: { url: string }) {
    if (!editor.isEditable) return;
    if (provider) {
      const embedProvider = getEmbedProviderById(provider);
      if (!embedProvider) return;
      if (embedProvider.id === "iframe") {
        updateAttributes({ src: sanitizeUrl(data.url) });
        return;
      }
      if (embedProvider.regex.test(data.url)) {
        updateAttributes({ src: sanitizeUrl(data.url) });
      } else {
        notifications.show({
          message: t("Invalid {{provider}} embed link", { provider: embedProvider.name }),
          position: "top-right",
          color: "red",
        });
      }
    }
  }

  const providerName = useMemo(() => {
    return getEmbedProviderById(provider)?.name || provider;
  }, [provider]);

  const isSlides = provider === "gslides" || provider === "google slides";
  const isDrive = provider === "gdrive" || provider === "google drive";

  const buttonLabel = useMemo(() => {
    if (isSlides || isDrive) {
      return t("View {{provider}}", { provider: providerName });
    }
    return t("Edit {{provider}}", { provider: providerName });
  }, [isSlides, isDrive, providerName, t]);

  const modalTitle = useMemo(() => {
    if (isSlides || isDrive) {
      return t("Viewing {{provider}}", { provider: providerName });
    }
    return t("Editing {{provider}}", { provider: providerName });
  }, [isSlides, isDrive, providerName, t]);

  return (
    <NodeViewWrapper contentEditable={false} className="docmost-embed-node">
      {embedUrl ? (
        <>
          <ResizableWrapper
            initialHeight={nodeHeight || 480}
            minHeight={200}
            maxHeight={1200}
            onResize={handleResize}
            isEditable={editor.isEditable}
            className={clsx(classes.embedWrapper, {
              "ProseMirror-selectednode": selected,
            })}
          >
            <div 
              className={classes.iframeWrapper} 
              style={{ width: '100%', height: '100%', position: 'relative' }}
            >
              <iframe
                ref={iframeRef}
                className={classes.embedIframe}
                src={sanitizeUrl(embedUrl)}
                allow="encrypted-media"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                allowFullScreen
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  border: 0,
                  pointerEvents: "none" // Disable all interaction with the iframe view
                }}
              />
              
              {selected && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    zIndex: 20,
                    pointerEvents: "auto"
                  }}
                >
                  <Button 
                    leftSection={<IconMaximize size={18} />}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      open();
                    }}
                    variant="filled"
                    color="blue"
                    radius="xl"
                    size="compact-sm"
                  >
                    {buttonLabel}
                  </Button>
                </div>
              )}

              {/* Selection shield: Always catch clicks to select the node, never let them reach the iframe */}
              <div
                onMouseDown={handleMouseDown}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 20, // Leave space for resize handle
                  zIndex: 10,
                  cursor: "default",
                  background: "transparent"
                }}
              />
            </div>
          </ResizableWrapper>

          {/* Modal for Jump-Free Editing/Viewing */}
          <Modal
            opened={opened}
            onClose={close}
            size="100%"
            fullScreen={true}
            title={
              <Group gap="xs">
                <Text fw={600}>{modalTitle}</Text>
                <Tooltip label={t("Open in new tab")}>
                   <ActionIcon component="a" href={src} target="_blank" variant="subtle" color="gray">
                      <IconExternalLink size={16} />
                   </ActionIcon>
                </Tooltip>
              </Group>
            }
            styles={{
              body: { height: 'calc(100vh - 60px)', padding: 0 },
              content: { overflow: 'hidden' }
            }}
          >
            <iframe
              src={sanitizeUrl(embedUrl)}
              allow="encrypted-media"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              allowFullScreen
              style={{
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          </Modal>
        </>
      ) : (
        <Popover width={300} position="bottom" withArrow shadow="md" disabled={!editor.isEditable}>
          <Popover.Target>
            <Card
              radius="md"
              p="xs"
              style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
              withBorder
              className={clsx(selected ? "ProseMirror-selectednode" : "")}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <ActionIcon variant="transparent" color="gray"><IconEdit size={18} /></ActionIcon>
                <Text component="span" size="lg" c="dimmed">
                  {t("Embed {{provider}}", {
                    provider: providerName,
                  })}
                </Text>
              </div>
            </Card>
          </Popover.Target>
          <Popover.Dropdown bg="var(--mantine-color-body)">
            <form onSubmit={embedForm.onSubmit(onSubmit)}>
              <FocusTrap active={true}>
                <TextInput
                  placeholder={t("Enter {{provider}} link to embed", {
                    provider: providerName,
                  })}
                  key={embedForm.key("url")}
                  {...embedForm.getInputProps("url")}
                  data-autofocus
                />
              </FocusTrap>

              <Group justify="center" mt="xs">
                <Button type="submit">{t("Embed link")}</Button>
              </Group>
            </form>
          </Popover.Dropdown>
        </Popover>
      )}
    </NodeViewWrapper>
  );
}
