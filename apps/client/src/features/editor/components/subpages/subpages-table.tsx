import { Table, Text, Anchor, ActionIcon, Container } from "@mantine/core";
import { IconFileDescription } from "@tabler/icons-react";
import { useGetSidebarPagesQuery } from "@/features/page/queries/page-query";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { buildPageUrl } from "@/features/page/page.utils.ts";
import { useTranslation } from "react-i18next";
import { sortPositionKeys } from "@/features/page/tree/utils/utils";
import { useSharedPageSubpages } from "@/features/share/hooks/use-shared-page-subpages";
import classes from "./subpages.module.css";

interface SubpagesTableProps {
  pageId: string;
  spaceSlug?: string;
}

type SubpageRow = {
  id: string;
  slugId: string;
  title: string;
  icon: string;
  position: string;
};

export default function SubpagesTable({ pageId, spaceSlug }: SubpagesTableProps) {
  const { t } = useTranslation();
  const { shareId } = useParams();

  const sharedSubpages = useSharedPageSubpages(pageId);

  const { data, isLoading, error } = useGetSidebarPagesQuery({
    pageId,
  });

  const subpages: SubpageRow[] = useMemo(() => {
    if (shareId && sharedSubpages) {
      return sharedSubpages.map((node) => ({
        id: node.value,
        slugId: node.slugId,
        title: node.name,
        icon: node.icon,
        position: node.position,
      }));
    }

    if (!data?.pages) return [];
    const allPages = data.pages.flatMap((p) => p.items);
    return sortPositionKeys(allPages).map((p: any) => ({
      id: p.id,
      slugId: p.slugId,
      title: p.title,
      icon: p.icon,
      position: p.position,
    }));
  }, [data, shareId, sharedSubpages]);

  if (isLoading && !shareId) {
    return null;
  }

  if (error && !shareId) {
    return (
      <Container py="md">
        <Text c="dimmed" size="sm">
          {t("Failed to load subpages")}
        </Text>
      </Container>
    );
  }

  if (subpages.length === 0) {
    return (
      <Container py="md">
        <Text c="dimmed" size="sm">
          {t("No subpages")}
        </Text>
      </Container>
    );
  }

  return (
    <Container py="md" px={0} className={classes.container}>
      <Table
        striped
        highlightOnHover
        withTableBorder
        withColumnBorders
        className={classes.table}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={50}>#</Table.Th>
            <Table.Th>{t("Title")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {subpages.map((page, index) => (
            <Table.Tr key={page.id}>
              <Table.Td ta="center" c="dimmed">
                {index + 1}
              </Table.Td>
              <Table.Td>
                <Anchor
                  component={Link}
                  to={buildPageUrl(spaceSlug, page.slugId, page.title)}
                  underline="hover"
                  draggable={false}
                  className={classes.pageLink}
                >
                  {page.icon ? (
                    <span className={classes.icon}>{page.icon}</span>
                  ) : (
                    <ActionIcon
                      variant="transparent"
                      color="gray"
                      component="span"
                      size={18}
                      className={classes.icon}
                    >
                      <IconFileDescription size={16} />
                    </ActionIcon>
                  )}
                  <span>{page.title || t("untitled")}</span>
                </Anchor>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Container>
  );
}
