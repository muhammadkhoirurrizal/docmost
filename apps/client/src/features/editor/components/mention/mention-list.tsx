import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchSuggestionsQuery } from "@/features/search/queries/search-query.ts";
import {
  ActionIcon,
  Group,
  Paper,
  ScrollArea,
  Text,
  UnstyledButton,
} from "@mantine/core";
import clsx from "clsx";
import classes from "./mention.module.css";
import { CustomAvatar } from "@/components/ui/custom-avatar.tsx";
import {
  IconChevronDown,
  IconChevronRight,
  IconFileDescription,
  IconPlus,
} from "@tabler/icons-react";
import { useSpaceQuery } from "@/features/space/queries/space-query.ts";
import { useParams } from "react-router-dom";
import { v7 as uuid7 } from "uuid";
import { useAtom } from "jotai";
import { currentUserAtom } from "@/features/user/atoms/current-user-atom.ts";
import {
  MentionListProps,
  MentionSuggestionItem,
} from "@/features/editor/components/mention/mention.type.ts";
import { IPage } from "@/features/page/types/page.types";
import { useCreatePageMutation, usePageQuery } from "@/features/page/queries/page-query";
import { treeDataAtom } from "@/features/page/tree/atoms/tree-data-atom";
import { SimpleTree } from "react-arborist";
import { SpaceTreeNode } from "@/features/page/tree/types";
import { useTranslation } from "react-i18next";
import { useQueryEmit } from "@/features/websocket/use-query-emit";
import { extractPageSlugId } from "@/lib";
import { getPageChildren } from "@/features/search/services/search-service";
import { notifications } from "@mantine/notifications";

const MentionList = forwardRef<any, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { pageSlug, spaceSlug } = useParams();
  const { data: page } = usePageQuery({ pageId: extractPageSlugId(pageSlug) });
  const { data: space } = useSpaceQuery(spaceSlug);
  const [currentUser] = useAtom(currentUserAtom);
  const [renderItems, setRenderItems] = useState<MentionSuggestionItem[]>([]);
  const { t } = useTranslation();
  const [data, setData] = useAtom(treeDataAtom);
  const tree = useMemo(() => new SimpleTree<SpaceTreeNode>(data), [data]);
  const createPageMutation = useCreatePageMutation();
  const emit = useQueryEmit();
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set());

  const isPageMode = props.text?.startsWith("@@") ?? false;
  const searchQuery = isPageMode ? (props.query || "").replace(/^@/, "") : props.query;

  const { data: suggestion, isLoading } = useSearchSuggestionsQuery({
    query: searchQuery,
    includeUsers: !isPageMode,
    includePages: isPageMode,
    spaceId: space.id,
    limit: 10,
  });

  const createPageItem = (label: string) : MentionSuggestionItem => {
    return {
      id: null,
      label: label,
      entityType: "page",
      entityId: null,
      slugId: null,
      icon: null,
    }
  }

  const toggleExpand = useCallback(async (pageId: string, index: number) => {
    // Use functional updates to avoid stale closure issues
    setRenderItems((prevItems) => {
      const item = prevItems[index];
      if (!item || item.entityType !== "page") return prevItems;

      const isCurrentlyExpanded = expandedPages.has(pageId);

      if (isCurrentlyExpanded) {
        // Collapse: remove all children of this page
        setExpandedPages((prev) => {
          const next = new Set(prev);
          next.delete(pageId);
          return next;
        });

        const itemDepth = item.depth || 0;
        const newItems: MentionSuggestionItem[] = [];
        let removing = false;

        for (let i = 0; i < prevItems.length; i++) {
          if (i === index) {
            newItems.push({ ...prevItems[i], isExpanded: false });
            removing = true;
            continue;
          }

          if (removing) {
            if (prevItems[i].entityType === "page" && (prevItems[i].depth || 0) > itemDepth) {
              // This is a child, skip it
              continue;
            } else {
              removing = false;
              newItems.push(prevItems[i]);
            }
          } else {
            newItems.push(prevItems[i]);
          }
        }

        return newItems;
      }

      // For expansion, we'll fetch async and update later
      return prevItems;
    });

    // Check if we need to expand (fetch children)
    const isCurrentlyExpanded = expandedPages.has(pageId);
    if (!isCurrentlyExpanded) {
      // Expand: fetch children
      setExpandedPages((prev) => {
        const next = new Set(prev);
        next.add(pageId);
        return next;
      });

      setLoadingPages((prev) => {
        const next = new Set(prev);
        next.add(pageId);
        return next;
      });

      try {
        const children = await getPageChildren({ pageId });
        
        setRenderItems((prevItems) => {
          const item = prevItems[index];
          if (!item) return prevItems;
          
          const childDepth = (item.depth || 0) + 1;

          const childItems: MentionSuggestionItem[] = children.map((child) => ({
            id: uuid7(),
            label: child.title || "Untitled",
            entityType: "page" as const,
            entityId: child.id,
            slugId: child.slugId,
            icon: child.icon,
            hasChildren: child.hasChildren,
            isExpanded: false,
            depth: childDepth,
          }));

          const newItems: MentionSuggestionItem[] = [];
          for (let i = 0; i < prevItems.length; i++) {
            newItems.push(prevItems[i]);
            if (i === index) {
              // Mark as expanded
              newItems[newItems.length - 1] = { ...newItems[newItems.length - 1], isExpanded: true };
              // Insert children after
              newItems.push(...childItems);
            }
          }

          // Update editor storage
          props.editor.storage.mentionItems = newItems;
          
          return newItems;
        });
      } catch (error) {
        console.error("Failed to fetch page children:", error);
        // Revert expanded state on error
        setExpandedPages((prev) => {
          const next = new Set(prev);
          next.delete(pageId);
          return next;
        });
      } finally {
        setLoadingPages((prev) => {
          const next = new Set(prev);
          next.delete(pageId);
          return next;
        });
      }
    }
  }, [expandedPages]);

  useEffect(() => {
    if (suggestion && !isLoading) {
      let items: MentionSuggestionItem[] = [];

      if (isPageMode) {
        if (suggestion?.pages?.length > 0) {
          items.push({ entityType: "header", label: t("page_mention_header") });
          items = items.concat(
            suggestion.pages.map((page) => ({
              id: uuid7(),
              label: page.title || "Untitled",
              entityType: "page",
              entityId: page.id,
              slugId: page.slugId,
              icon: page.icon,
              hasChildren: page.hasChildren || false,
              isExpanded: false,
              depth: 0,
            })),
          );
        }
      } else {
        if (suggestion?.users?.length > 0) {
          items.push({ entityType: "header", label: t("Users") });
          items = items.concat(
            suggestion.users.map((user) => ({
              id: uuid7(),
              label: user.name,
              entityType: "user",
              entityId: user.id,
              avatarUrl: user.avatarUrl,
            })),
          );
        }
      }

      if (props.editor.isEditable) {
        items.push(createPageItem(isPageMode ? searchQuery : props.query));
      }

      setRenderItems(items);
      // update editor storage
      props.editor.storage.mentionItems = items;
    }
  }, [suggestion, isLoading, isPageMode, searchQuery]);

  const selectItem = useCallback(
    (index: number) => {
      const item = renderItems?.[index];
      const trigger = isPageMode ? "@@" : "@";
      if (item) {
        if (item.entityType === "user") {
          props.command({
            id: item.id,
            label: item.label,
            entityType: "user",
            entityId: item.entityId,
            creatorId: currentUser?.user.id,
            trigger,
          });
        }
        if (item.entityType === "page" && item.id!==null) {
          props.command({
            id: item.id,
            label: item.label || "Untitled",
            entityType: "page",
            entityId: item.entityId,
            slugId: item.slugId,
            creatorId: currentUser?.user.id,
            trigger,
          });
        }
        if (item.entityType === "page" && item.id===null) {
          createPage(item.label);
        }
      }
    },
    [renderItems, isPageMode],
  );

  const upHandler = () => {
    if (!renderItems.length) return;

    let newIndex = selectedIndex;

    do {
      newIndex = (newIndex + renderItems.length - 1) % renderItems.length;
    } while (renderItems[newIndex].entityType === "header");
    setSelectedIndex(newIndex);
  };

  const downHandler = () => {
    if (!renderItems.length) return;
    let newIndex = selectedIndex;
    do {
      newIndex = (newIndex + 1) % renderItems.length;
    } while (renderItems[newIndex].entityType === "header");
    setSelectedIndex(newIndex);
  };

  const enterHandler = () => {
    if (!renderItems.length) return;
    if (renderItems[selectedIndex].entityType !== "header") {
      selectItem(selectedIndex);
    }
  };

  const rightHandler = () => {
    const item = renderItems[selectedIndex];
    if (!item || item.entityType !== "page" || !item.hasChildren) return false;
    if (item.isExpanded) {
      setSelectedIndex(selectedIndex + 1);
      return true;
    }
    toggleExpand(item.entityId, selectedIndex);
    return true;
  };

  const leftHandler = () => {
    const item = renderItems[selectedIndex];
    if (!item || item.entityType !== "page") return false;
    if (item.isExpanded) {
      toggleExpand(item.entityId, selectedIndex);
      return true;
    }
    return false;
  };

  useEffect(() => {
    setSelectedIndex(1);
  }, [suggestion]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "ArrowRight") {
        return rightHandler();
      }

      if (event.key === "ArrowLeft") {
        return leftHandler();
      }

      if (event.key === "Enter") {
        // don't trap the enter button if there are no items to render
        if (renderItems.length === 0) {
          return false;
        }
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  const createPage = async (title: string) => {
    const payload: { spaceId: string; parentPageId?: string; title: string } = {
      spaceId: space.id,
      parentPageId: page.id || null,
      title: title
    };
    
    let createdPage: IPage;
    try {
      createdPage = await createPageMutation.mutateAsync(payload);
      const parentId = page.id || null;
      const data = {
        id: createdPage.id,
        slugId: createdPage.slugId,
        name: createdPage.title,
        position: createdPage.position,
        spaceId: createdPage.spaceId,
        parentPageId: createdPage.parentPageId,
        children: [],
      } as any;

      const lastIndex = tree.data.length;

      tree.create({ parentId, index: lastIndex, data });
      setData(tree.data);

      props.command({
        id: uuid7(),
        label:  createdPage.title || "Untitled",
        entityType: "page",
        entityId: createdPage.id,
        slugId: createdPage.slugId,
        creatorId: currentUser?.user.id,
        trigger: isPageMode ? "@@" : "@",
      });

      setTimeout(() => {
      emit({
        operation: "addTreeNode",
        spaceId: space.id,
        payload: {
          parentId,
          index: lastIndex,
          data,
        },
      });
    }, 50);

    } catch {
      throw new Error("Failed to create page");
    }
  }

  // if no results and enter what to do?

  useEffect(() => {
    viewportRef.current
      ?.querySelector(`[data-item-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    if (!isPageMode && props.query && props.query.length > 0) {
      const tipShown = localStorage.getItem("mention_tip_pages_shown");
      if (!tipShown) {
        notifications.show({
          message: t("mention_tip_pages"),
          color: "blue",
          autoClose: 5000,
        });
        localStorage.setItem("mention_tip_pages_shown", "true");
      }
    }
  }, [isPageMode, props.query]);

  if (renderItems.length === 0) {
    if (isPageMode && !searchQuery) {
      return (
        <Paper shadow="md" p="xs" withBorder>
          { t("page_mention_empty_hint") }
        </Paper>
      );
    }
    return (
      <Paper shadow="md" p="xs" withBorder>
        { t("No results") }
      </Paper>
    );
  }

  return (
    <Paper id="mention" shadow="md" p="xs" withBorder>
      <ScrollArea.Autosize
        viewportRef={viewportRef}
        mah={350}
        w={320}
        scrollbarSize={8}
      >
        {renderItems?.map((item, index) => {
          if (item.entityType === "header") {
            return (
              <div key={`${item.label}-${index}`}>
                <Text c="dimmed" mb={4} tt="uppercase">
                  {item.label}
                </Text>
              </div>
            );
          } else if (item.entityType === "user") {
            return (
              <UnstyledButton
                data-item-index={index}
                key={index}
                onClick={() => selectItem(index)}
                className={clsx(classes.menuBtn, {
                  [classes.selectedItem]: index === selectedIndex,
                })}
              >
                <Group>
                  <CustomAvatar
                    size={"sm"}
                    avatarUrl={item.avatarUrl}
                    name={item.label}
                  />

                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {item.label}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            );
          } else if (item.entityType === "page") {
            const depth = item.depth || 0;
            const isLoadingChildren = item.entityId && loadingPages.has(item.entityId);

            return (
              <UnstyledButton
                data-item-index={index}
                key={index}
                onClick={() => selectItem(index)}
                className={clsx(classes.menuBtn, {
                  [classes.selectedItem]: index === selectedIndex,
                })}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
              >
                <Group gap="xs">
                  {item.hasChildren ? (
                    <ActionIcon
                      variant="transparent"
                      component="div"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.entityId) {
                          toggleExpand(item.entityId, index);
                        }
                      }}
                      loading={isLoadingChildren}
                    >
                      {item.isExpanded ? (
                        <IconChevronDown size={14} />
                      ) : (
                        <IconChevronRight size={14} />
                      )}
                    </ActionIcon>
                  ) : (
                    <div style={{ width: 28 }} />
                  )}

                  <ActionIcon
                    variant="default"
                    component="div"
                    aria-label={item.label}
                  >
                    {item.icon || (
                      <ActionIcon
                        component="span"
                        variant="transparent"
                        color="gray"
                        size={18}
                      >
                        { (item.id) ? <IconFileDescription size={18} /> : <IconPlus size={18} /> }
                      </ActionIcon>
                    )}
                  </ActionIcon>

                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      { (item.id) ? item.label : t("Create page") + ': ' + item.label }
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            );
          } else {
            return null;
          }
        })}
      </ScrollArea.Autosize>
    </Paper>
  );
});

export default MentionList;
