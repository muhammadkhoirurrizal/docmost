import { useMemo } from "react";
import { generateHTML } from "@tiptap/html";
import { Box, Divider, Text } from "@mantine/core";
import { useGetChildrenContentQuery } from "@/features/page/queries/page-query";
import { mainExtensions } from "@/features/editor/extensions/extensions";
import { useTranslation } from "react-i18next";
import { sortPositionKeys } from "@/features/page/tree/utils/utils";
import classes from "./subpages.module.css";

interface SubpagesContentProps {
  pageId: string;
}

type PageNode = {
  id: string;
  slugId: string;
  title: string;
  icon: string;
  content: any;
  depth: number;
  parentPageId: string | null;
  position: string;
  children: PageNode[];
};

export default function SubpagesContent({ pageId }: SubpagesContentProps) {
  const { t } = useTranslation();
  const { data: subpages, isLoading, error } = useGetChildrenContentQuery(pageId);

  const rootNodes = useMemo<PageNode[]>(() => {
    if (!subpages?.length) return [];

    const nodes = subpages.map((page) => {
      let contentJson: any = null;
      try {
        contentJson = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      } catch {
        contentJson = null;
      }

      return {
        id: page.id,
        slugId: page.slugId,
        title: page.title,
        icon: page.icon,
        content: contentJson,
        depth: page.depth,
        parentPageId: page.parentPageId || null,
        position: page.position,
        children: [] as PageNode[],
      };
    });

    const nodeMap = new Map<string, PageNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const childrenByParent = new Map<string, PageNode[]>();
    nodes.forEach((n) => {
      const parentId = n.parentPageId || pageId;
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, []);
      }
      childrenByParent.get(parentId)!.push(n);
    });

    const buildTree = (parentId: string): PageNode[] => {
      const children = childrenByParent.get(parentId) || [];
      return sortPositionKeys(children).map((child) => ({
        ...child,
        children: buildTree(child.id),
      }));
    };

    return buildTree(pageId);
  }, [subpages, pageId]);

  if (isLoading) {
    return (
      <Box py="md">
        <Text c="dimmed" size="sm">
          {t("Loading subpages content...")}
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box py="md">
        <Text c="dimmed" size="sm">
          {t("Failed to load subpages content")}
        </Text>
      </Box>
    );
  }

  if (!rootNodes.length) {
    return null;
  }

  return (
    <Box className={classes.contentRollup}>
      {rootNodes.map((node, index) => (
        <PageNodeItem
          key={node.id}
          node={node}
          isLast={index === rootNodes.length - 1}
        />
      ))}
    </Box>
  );
}

function PageNodeItem({
  node,
  isLast,
}: {
  node: PageNode;
  isLast: boolean;
}) {
  return (
    <article
      className={classes.childPage}
      style={{
        marginLeft: `${Math.max(0, node.depth - 1) * 1.5}rem`,
      }}
    >
      <ChildPageHeader node={node} />

      <ChildPageContent contentJson={node.content} />

      {node.children.length > 0 && (
        <Box mt="lg">
          {node.children.map((child, index) => (
            <PageNodeItem
              key={child.id}
              node={child}
              isLast={index === node.children.length - 1}
            />
          ))}
        </Box>
      )}

      {!isLast && <Divider my="xl" />}
    </article>
  );
}

function ChildPageHeader({ node }: { node: PageNode }) {
  const { t } = useTranslation();
  // Depth 1 => h2, depth 2 => h3, etc.
  const level = Math.min(6, node.depth + 1);

  return (
    <header className={classes.childHeader}>
      <Text
        component={`h${level}` as any}
        size={level === 2 ? "xl" : level === 3 ? "lg" : "md"}
        fw={600}
      >
        {node.icon && <span className={classes.icon}>{node.icon}</span>}
        {node.title || t("untitled")}
      </Text>
    </header>
  );
}

function ChildPageContent({ contentJson }: { contentJson: any }) {
  if (!contentJson) return null;

  const html = useMemo(() => {
    try {
      return generateHTML(contentJson, mainExtensions);
    } catch {
      return "";
    }
  }, [contentJson]);

  if (!html) return null;

  return (
    <div
      className={classes.childContent}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
