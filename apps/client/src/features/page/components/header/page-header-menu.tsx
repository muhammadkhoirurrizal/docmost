import { ActionIcon, Badge, Group, Menu, Text, Tooltip } from "@mantine/core";
import {
  IconArchive,
  IconArrowRight,
  IconArrowsHorizontal,
  IconDots,
  IconFileExport,
  IconFiles,
  IconHistory,
  IconLink,
  IconList,
  IconMessage,
  IconPrinter,
  IconTrash,
  IconWifiOff,
} from "@tabler/icons-react";
import React, { useEffect } from "react";
import useToggleAside from "@/hooks/use-toggle-aside.tsx";
import { useAtom } from "jotai";
import { historyAtoms } from "@/features/page-history/atoms/history-atoms.ts";
import {
  useDisclosure,
  useHotkeys,
} from "@mantine/hooks";
import { useNavigate, useParams } from "react-router-dom";
import {
  usePageQuery,
  useArchivePageMutation,
  useUnarchivePageMutation,
  useCreatePageMutation,
  useGetChildrenContentQuery,
} from "@/features/page/queries/page-query.ts";
import { buildPageUrl } from "@/features/page/page.utils.ts";
import { buildRollupContent } from "@/features/page/utils/build-rollup-content.ts";
import { notifications } from "@mantine/notifications";
import { getAppUrl, getSpaceUrl } from "@/lib/config.ts";
import { extractPageSlugId } from "@/lib";
import { copyToClipboard } from "@/features/editor/utils/clipboard";
import { treeApiAtom } from "@/features/page/tree/atoms/tree-api-atom.ts";
import { useDeletePageModal } from "@/features/page/hooks/use-delete-page-modal.tsx";
import { PageWidthToggle } from "@/features/user/components/page-width-pref.tsx";
import { Trans, useTranslation } from "react-i18next";
import ExportModal from "@/components/common/export-modal";
import {
  lastSavedPageAtom,
  pageEditorAtom,
  yjsConnectionStatusAtom,
} from "@/features/editor/atoms/editor-atoms.ts";
import { formattedDate } from "@/lib/time.ts";
import { PageStateSegmentedControl } from "@/features/user/components/page-state-pref.tsx";
import MovePageModal from "@/features/page/components/move-page-modal.tsx";
import { useTimeAgo } from "@/hooks/use-time-ago.tsx";
import ShareModal from "@/features/share/components/share-modal.tsx";
import { useUserRole } from "@/hooks/use-user-role";


interface PageHeaderMenuProps {
  readOnly?: boolean;
}
export default function PageHeaderMenu({ readOnly }: PageHeaderMenuProps) {
  const { t } = useTranslation();
  const toggleAside = useToggleAside();
  const userRole = useUserRole();
  const [yjsConnectionStatus] = useAtom(yjsConnectionStatusAtom);
  const [lastSavedPage, setLastSavedPage] = useAtom(lastSavedPageAtom);
  const { pageSlug } = useParams();
  const slugId = extractPageSlugId(pageSlug);
  const showSavedIndicator = lastSavedPage?.id === slugId;
  const savedPageTitle = showSavedIndicator ? lastSavedPage.title : "";
  const savedAt = showSavedIndicator ? lastSavedPage.savedAt : undefined;

  useEffect(() => {
    if (!savedAt) return;

    const timeout = window.setTimeout(() => {
      setLastSavedPage((current) =>
        current?.savedAt === savedAt ? null : current,
      );
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [savedAt, setLastSavedPage]);

  useHotkeys(
    [
      [
        "mod+F",
        () => {
          const event = new CustomEvent("openFindDialogFromEditor", {});
          document.dispatchEvent(event);
        },
      ],
      [
        "Escape",
        () => {
          const event = new CustomEvent("closeFindDialogFromEditor", {});
          document.dispatchEvent(event);
        },
      ],
    ],
    []
  );

  return (
    <>
      {yjsConnectionStatus === "disconnected" && (
        <Tooltip
          label={t("Real-time editor connection lost. Retrying...")}
          openDelay={250}
          withArrow
        >
          <ActionIcon variant="default" c="red" style={{ border: "none" }}>
            <IconWifiOff size={20} stroke={2} />
          </ActionIcon>
        </Tooltip>
      )}
      {!userRole.isVisitor && !readOnly && (
        <>
          <PageStateSegmentedControl size="xs" pageId={slugId} />
          {showSavedIndicator && (
            <Badge color="green" variant="light" size="sm">
              {t("Page {{title}} Saved", { title: savedPageTitle })}
            </Badge>
          )}
          <ShareModal readOnly={readOnly} />
        </>
      )}

      <Tooltip label={t("Comments")} openDelay={250} withArrow>
        <ActionIcon
          variant="default"
          style={{ border: "none" }}
          onClick={() => toggleAside("comments")}
        >
          <IconMessage size={20} stroke={2} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label={t("Table of contents")} openDelay={250} withArrow>
        <ActionIcon
          variant="default"
          style={{ border: "none" }}
          onClick={() => toggleAside("toc")}
        >
          <IconList size={20} stroke={2} />
        </ActionIcon>
      </Tooltip>
      <PageActionMenu readOnly={readOnly} />
    </>
  );
}

interface PageActionMenuProps {
  readOnly?: boolean;
}
function PageActionMenu({ readOnly }: PageActionMenuProps) {
  const { t } = useTranslation();
  const [, setHistoryModalOpen] = useAtom(historyAtoms);
  const { pageSlug, spaceSlug } = useParams();
  const navigate = useNavigate();
  const { data: page, isLoading: _isLoading } = usePageQuery({
    pageId: extractPageSlugId(pageSlug),
  });
  const { openDeleteModal } = useDeletePageModal();
  const archivePageMutation = useArchivePageMutation();
  const unarchivePageMutation = useUnarchivePageMutation();
  const createPageMutation = useCreatePageMutation();
  const { data: childrenContent, refetch: refetchChildrenContent } =
    useGetChildrenContentQuery(page?.id);

  const handleArchive = async () => {
    await archivePageMutation.mutateAsync(page.id);
    navigate(getSpaceUrl(spaceSlug));
  };

  const handleUnarchive = async () => {
    await unarchivePageMutation.mutateAsync(page.id);
    // Optional: could redirect or stay, but if archived page was being viewed (e.g. from Archive list),
    // redirecting to space home might be safer to refresh sidebar
    navigate(getSpaceUrl(spaceSlug));
  };
  const [tree] = useAtom(treeApiAtom);
  const [exportOpened, { open: openExportModal, close: closeExportModal }] =
    useDisclosure(false);
  const [
    movePageModalOpened,
    { open: openMovePageModal, close: closeMoveSpaceModal },
  ] = useDisclosure(false);
  const [pageEditor] = useAtom(pageEditorAtom);
  const pageUpdatedAt = useTimeAgo(page?.updatedAt);
  const userRole = useUserRole();

  const handleCopyLink = async () => {
    const pageUrl =
      getAppUrl() + buildPageUrl(spaceSlug, page.slugId, page.title);

    const success = await copyToClipboard(pageUrl);
    if (success) {
      notifications.show({ message: t("Link copied") });
    } else {
      notifications.show({
        message: t("Failed to copy link"),
        color: "red",
      });
    }
  };

  const handleGenerateRollup = async () => {
    if (!page) return;

    const descendants =
      childrenContent ?? (await refetchChildrenContent()).data;

    if (!descendants?.length) {
      notifications.show({
        message: t("No subpages to rollup"),
        color: "orange",
      });
      return;
    }

    const rollupContent = buildRollupContent(page.title, descendants);

    createPageMutation.mutate(
      {
        title: `${page.title} - ${t("All Content")}`,
        parentPageId: page.id,
        spaceId: page.spaceId,
        content: rollupContent,
        icon: "📑",
      } as any,
      {
        onSuccess: (createdPage) => {
          navigate(
            buildPageUrl(spaceSlug, createdPage.slugId, createdPage.title),
          );
        },
      },
    );
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const openHistoryModal = () => {
    setHistoryModalOpen(true);
  };

  const handleDeletePage = () => {
    openDeleteModal({ onConfirm: () => tree?.delete(page.id) });
  };

  return (
    <>
      <Menu
        shadow="xl"
        position="bottom-end"
        offset={20}
        width={230}
        withArrow
        arrowPosition="center"
      >
        <Menu.Target>
          <ActionIcon variant="default" style={{ border: "none" }}>
            <IconDots size={20} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconLink size={16} />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCopyLink();
            }}
          >
            {t("Copy link")}
          </Menu.Item>

          {page?.hasChildren && (
            <Menu.Item
              leftSection={<IconFiles size={16} />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGenerateRollup();
              }}
            >
              {t("Generate rollup page")}
            </Menu.Item>
          )}

          <Menu.Divider />

          <Menu.Item leftSection={<IconArrowsHorizontal size={16} />}>
            <Group wrap="nowrap">
              <PageWidthToggle label={t("Full width")} />
            </Group>
          </Menu.Item>
          {!userRole.isVisitor && (
            <>
              <Menu.Item
                leftSection={<IconHistory size={16} />}
                onClick={openHistoryModal}
              >
                {t("Page history")}
              </Menu.Item>

              <Menu.Divider />

              {!readOnly && (
                <Menu.Item
                  leftSection={<IconArrowRight size={16} />}
                  onClick={openMovePageModal}
                >
                  {t("Move")}
                </Menu.Item>
              )}

              <Menu.Item
                leftSection={<IconFileExport size={16} />}
                onClick={openExportModal}
              >
                {t("Export")}
              </Menu.Item>

              <Menu.Item
                leftSection={<IconPrinter size={16} />}
                onClick={handlePrint}
              >
                {t("Print PDF")}
              </Menu.Item>

              {!readOnly && (
                <>
                  {page.archivedAt ? (
                    <Menu.Item
                      leftSection={<IconArchive size={16} />}
                      onClick={handleUnarchive}
                    >
                      {t("Unarchive")}
                    </Menu.Item>
                  ) : (
                    <Menu.Item
                      leftSection={<IconArchive size={16} />}
                      onClick={handleArchive}
                    >
                      {t("Archive")}
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item
                    color={"red"}
                    leftSection={<IconTrash size={16} />}
                    onClick={handleDeletePage}
                  >
                    {t("Move to trash")}
                  </Menu.Item>
                </>
              )}
            </>
          )}


          <Menu.Divider />

          <>
            <Group px="sm" wrap="nowrap" style={{ cursor: "pointer" }}>
              <Tooltip
                label={t("Edited by {{name}} {{time}}", {
                  name: page.lastUpdatedBy.name,
                  time: pageUpdatedAt,
                })}
                position="left-start"
              >
                <div style={{ width: 210 }}>
                  <Text size="xs" c="dimmed" truncate="end">
                    {t("Word count: {{wordCount}}", {
                      wordCount: pageEditor?.storage?.characterCount?.words(),
                    })}
                  </Text>

                  <Text size="xs" c="dimmed" lineClamp={1}>
                    <Trans
                      defaults="Created by: <b>{{creatorName}}</b>"
                      values={{ creatorName: page?.creator?.name }}
                      components={{ b: <Text span fw={500} /> }}
                    />
                  </Text>
                  <Text size="xs" c="dimmed" truncate="end">
                    {t("Created at: {{time}}", {
                      time: formattedDate(page.createdAt),
                    })}
                  </Text>
                </div>
              </Tooltip>
            </Group>
          </>
        </Menu.Dropdown>
      </Menu>

      <ExportModal
        type="page"
        id={page.id}
        open={exportOpened}
        onClose={closeExportModal}
      />

      <MovePageModal
        pageId={page.id}
        slugId={page.slugId}
        currentSpaceSlug={spaceSlug}
        onClose={closeMoveSpaceModal}
        open={movePageModalOpened}
      />
    </>
  );
}
