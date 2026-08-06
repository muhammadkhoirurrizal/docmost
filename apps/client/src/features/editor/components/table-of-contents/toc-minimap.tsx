import { useAtom, useAtomValue } from "jotai";
import { pageEditorAtom } from "../../atoms/editor-atoms";
import { asideStateAtom } from "@/components/layouts/global/hooks/atoms/sidebar-atom";
import React, { FC, useEffect, useRef, useState, useCallback } from "react";
import classes from "./toc-minimap.module.css";
import clsx from "clsx";
import { ActionIcon, Box, Group, HoverCard, ScrollArea, Text, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconLink } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useParams } from "react-router-dom";
import { buildPageUrl } from "@/features/page/page.utils";
import { getAppUrl } from "@/lib/config";
import { extractPageSlugId } from "@/lib";
import { copyToClipboard } from "@/features/editor/utils/clipboard";
import { usePageQuery } from "@/features/page/queries/page-query.ts";
import { TextSelection } from "@tiptap/pm/state";
import { HeadingLink, recalculateLinks } from "./table-of-contents";

export const TocMinimap: FC = () => {
  const { t } = useTranslation();
  const [links, setLinks] = useState<HeadingLink[]>([]);
  const [headingDOMNodes, setHeadingDOMNodes] = useState<HTMLElement[]>([]);
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
  const headerPaddingRef = useRef<HTMLDivElement | null>(null);

  const { pageSlug, spaceSlug } = useParams();
  const { data: page } = usePageQuery({
    pageId: extractPageSlugId(pageSlug),
  });

  const pageEditor = useAtomValue(pageEditorAtom);
  const [{ tab, isAsideOpen }] = useAtom(asideStateAtom);

  const handleUpdate = useCallback(() => {
    if (!pageEditor) return;
    const result = recalculateLinks(pageEditor.$nodes("heading"));
    setLinks(result.links);
    setHeadingDOMNodes(result.nodes);
  }, [pageEditor]);

  useEffect(() => {
    if (!pageEditor) return;
    pageEditor.on("update", handleUpdate);
    handleUpdate();

    return () => {
      pageEditor.off("update", handleUpdate);
    };
  }, [pageEditor, handleUpdate]);

  useEffect(() => {
    if (!headingDOMNodes.length || !pageEditor) return;
    try {
      const observeHandler = (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveElement(entry.target as HTMLElement);
          }
        });
      };

      let headerOffset = 0;
      if (headerPaddingRef.current) {
        headerOffset = parseInt(
          window.getComputedStyle(headerPaddingRef.current).getPropertyValue("top"),
        );
      }
      const observerOptions: IntersectionObserverInit = {
        rootMargin: `-${headerOffset}px 0px -85% 0px`,
        threshold: 0,
        root: null,
      };
      const observer = new IntersectionObserver(observeHandler, observerOptions);

      headingDOMNodes.forEach((heading) => {
        observer.observe(heading);
      });
      return () => {
        headingDOMNodes.forEach((heading) => {
          observer.unobserve(heading);
        });
      };
    } catch (err) {
      console.log(err);
    }
  }, [headingDOMNodes, pageEditor]);

  const handleScrollToHeading = (position: number) => {
    if (!pageEditor) return;
    const { view } = pageEditor;

    let headerOffset = 0;
    if (headerPaddingRef.current) {
      headerOffset = parseInt(
        window.getComputedStyle(headerPaddingRef.current).getPropertyValue("top"),
      );
    }

    const { node } = view.domAtPos(position);
    const element = node as HTMLElement;
    const scrollPosition =
      element.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top: scrollPosition,
      behavior: "smooth",
    });

    const tr = view.state.tr;
    tr.setSelection(new TextSelection(tr.doc.resolve(position)));
    view.dispatch(tr);
    view.focus();
  };

  const handleCopyLink = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!page) return;
    const pageUrl = getAppUrl() + buildPageUrl(spaceSlug, page.slugId, page.title);
    const url = `${pageUrl}#${id}`;
    const success = await copyToClipboard(url);
    if (success) {
      notifications.show({ message: t("Link copied") });
    } else {
      notifications.show({
        message: t("Failed to copy link"),
        color: "red",
      });
    }
  };

  // Hide minimap if native aside TOC is open or there are no headings
  if (isAsideOpen && tab === "toc") return null;
  if (links.length === 0) return null;

  return (
    <>
      <div
        ref={headerPaddingRef}
        style={{
          display: "none",
          top: "calc(var(--app-shell-header-offset, 0rem) + var(--app-shell-header-height, 0rem))",
        }}
      />
      <div className={classes.minimapContainer}>
        <HoverCard
          position="left-start"
          offset={10}
          shadow="md"
          radius="md"
          width={320}
          classNames={{ dropdown: classes.popoverDropdown }}
        >
          <HoverCard.Target>
            <div className={classes.linesWrapper}>
              {links.map((item, idx) => {
                let width = "8px"; // Default (e.g. H3)
                if (item.level === 1) width = "18px";
                else if (item.level === 2) width = "12px";

                return (
                  <div
                    key={idx}
                    className={classes.line}
                    style={{
                      width,
                      backgroundColor:
                        item.element === activeElement
                          ? "var(--mantine-color-blue-filled)"
                          : undefined,
                    }}
                  />
                );
              })}
            </div>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <ScrollArea.Autosize mah={400} offsetScrollbars p="sm">
              <Text fw={500} mb="xs" size="sm" c="dimmed">
                {t("Table of contents")}
              </Text>
              {links.map((item, idx) => (
                <Box<"a">
                  component="a"
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleScrollToHeading(item.position);
                  }}
                  key={idx}
                  className={clsx(classes.link, {
                    [classes.linkActive]: item.element === activeElement,
                  })}
                  style={{
                    paddingLeft: `calc(${(item.level - 1) * 0.75}rem)`,
                  }}
                >
                  <Group justify="space-between" wrap="nowrap" gap={4}>
                    <Text truncate="end" fw={500} size="sm" style={{ flex: 1, minWidth: 0 }} title={item.label}>
                      {item.label}
                    </Text>
                    <Tooltip label={t("Copy link")}>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="gray"
                        onClick={(e) => handleCopyLink(e, item.id)}
                        className={classes.linkBtn}
                      >
                        <IconLink size={12} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Box>
              ))}
            </ScrollArea.Autosize>
          </HoverCard.Dropdown>
        </HoverCard>
      </div>
    </>
  );
};
