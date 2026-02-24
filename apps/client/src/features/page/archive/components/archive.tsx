import { useParams } from "react-router-dom";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query";
import {
  Container,
  Title,
  Table,
  Group,
  ActionIcon,
  Text,
  Stack,
  Menu,
} from "@mantine/core";
import {
  IconDots,
  IconRestore,
  IconArchive,
  IconFileDescription,
} from "@tabler/icons-react";
import {
  useArchivedPagesQuery,
  useUnarchivePageMutation,
} from "@/features/page/queries/page-query";
import { modals } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import { formattedDate } from "@/lib/time";
import { useState } from "react";
import TrashPageContentModal from "@/features/page/trash/components/trash-page-content-modal";
import Paginate from "@/components/common/paginate.tsx";
import { usePaginateAndSearch } from "@/hooks/use-paginate-and-search";

export default function Archive() {
  const { t } = useTranslation();
  const { spaceSlug } = useParams();
  const { page, setPage } = usePaginateAndSearch();
  const { data: space } = useGetSpaceBySlugQuery(spaceSlug);
  const { data: archivedPages, isLoading } = useArchivedPagesQuery(space?.id, {
    page, limit: 50
  });
  const unarchivePageMutation = useUnarchivePageMutation();

  const [selectedPage, setSelectedPage] = useState<{
    title: string;
    content: any;
  } | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  const handleUnarchivePage = async (pageId: string) => {
    await unarchivePageMutation.mutateAsync(pageId);
  };

  const openUnarchiveModal = (pageId: string, pageTitle: string) => {
    modals.openConfirmModal({
      title: t("Unarchive page"),
      children: (
        <Text size="sm">
          {t("Unarchive '{{title}}'?", {
            title: pageTitle || "Untitled",
          })}
        </Text>
      ),
      centered: true,
      labels: { confirm: t("Unarchive"), cancel: t("Cancel") },
      confirmProps: { color: "blue" },
      onConfirm: () => handleUnarchivePage(pageId),
    });
  };

  const hasPages = archivedPages && archivedPages.items.length > 0;

  const handlePageClick = (page: any) => {
    setSelectedPage({ title: page.title, content: page.content });
    setModalOpened(true);
  };

  return (
    <Container size="lg" py="lg">
      <Stack gap="md">
        <Group justify="space-between" mb="md">
          <Title order={2}>{t("Archive")}</Title>
        </Group>

        {isLoading || !archivedPages ? (
          <></>
        ) : hasPages ? (
          <Table.ScrollContainer minWidth={500}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("Page")}</Table.Th>
                  <Table.Th style={{ whiteSpace: "nowrap" }}>
                    {t("Archived at")}
                  </Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {archivedPages.items.map((page) => (
                  <Table.Tr key={page.id}>
                    <Table.Td>
                      <Group
                        wrap="nowrap"
                        style={{ cursor: "pointer" }}
                        onClick={() => handlePageClick(page)}
                      >
                        {page.icon || (
                          <ActionIcon
                            variant="transparent"
                            color="gray"
                            size={18}
                          >
                            <IconFileDescription size={18} />
                          </ActionIcon>
                        )}
                        <div>
                          <Text fw={500} size="sm" lineClamp={1}>
                            {page.title || t("Untitled")}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        c="dimmed"
                        style={{ whiteSpace: "nowrap" }}
                        size="xs"
                        fw={500}
                      >
                        {formattedDate(page.archivedAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Menu>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={20} stroke={1.5} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconRestore size={16} />}
                            onClick={() =>
                              openUnarchiveModal(page.id, page.title)
                            }
                          >
                            {t("Unarchive")}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <Text ta="center" py="xl" c="dimmed">
            {t("No pages in archive")}
          </Text>
        )}

        {archivedPages && archivedPages.items.length > 0 && (
          <Paginate
            currentPage={page}
            hasPrevPage={archivedPages.meta.hasPrevPage}
            hasNextPage={archivedPages.meta.hasNextPage}
            onPageChange={setPage}
          />
        )}
      </Stack>

      {selectedPage && (
        <TrashPageContentModal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          pageTitle={selectedPage.title}
          pageContent={selectedPage.content}
        />
      )}
    </Container>
  );
}
