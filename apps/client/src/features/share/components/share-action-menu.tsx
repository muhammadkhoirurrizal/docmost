import { Menu, ActionIcon, Text } from "@mantine/core";
import React from "react";
import {
  IconCopy,
  IconDots,
  IconFileDescription,
  IconTrash,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import { ISharedItem } from "@/features/share/types/share.types.ts";
import {
  buildPageUrl,
  buildSharedPageUrl,
} from "@/features/page/page.utils.ts";
import { notifications } from "@mantine/notifications";
import { copyToClipboard } from "@/features/editor/utils/clipboard";
import { useNavigate } from "react-router-dom";
import { useDeleteShareMutation } from "@/features/share/queries/share-query.ts";

import { getAppUrl } from "@/lib/config.ts";

interface Props {
  share: ISharedItem;
}
export default function ShareActionMenu({ share }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteShareMutation = useDeleteShareMutation();

  const openPage = () => {
    const pageLink = buildPageUrl(
      share.space.slug,
      share.page.slugId,
      share.page.title,
    );
    navigate(pageLink);
  };

  const copyLink = async () => {
    try {
      const shareLink =
        getAppUrl() +
        buildSharedPageUrl({
          shareId: share.key,
          pageTitle: share.page.title,
          pageSlugId: share.page.slugId,
        });

      await copyToClipboard(shareLink);
      notifications.show({ message: t("Link copied") });
    } catch {
      notifications.show({
        message: t("Failed to copy link"),
        color: "red",
      });
    }
  };
  const onDelete = async () => {
    deleteShareMutation.mutateAsync(share.key);
  };

  const openDeleteModal = () =>
    modals.openConfirmModal({
      title: t("Delete public share link"),
      children: (
        <Text size="sm">
          {t("Are you sure you want to delete this shared link?")}
        </Text>
      ),
      centered: true,
      labels: { confirm: t("Delete"), cancel: t("Don't") },
      confirmProps: { color: "red" },
      onConfirm: onDelete,
    });

  return (
    <>
      <Menu
        shadow="xl"
        position="bottom-end"
        offset={20}
        width={200}
        withArrow
        arrowPosition="center"
      >
        <Menu.Target>
          <ActionIcon variant="subtle" c="gray">
            <IconDots size={20} stroke={2} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item onClick={copyLink} leftSection={<IconCopy size={16} />}>
            {t("Copy link")}
          </Menu.Item>

          <Menu.Item
            onClick={openPage}
            leftSection={<IconFileDescription size={16} />}
          >
            {t("Open page")}
          </Menu.Item>
          <Menu.Item
            c="red"
            onClick={openDeleteModal}
            leftSection={<IconTrash size={16} />}
            disabled={share.space?.userRole === "reader"}
          >
            {t("Delete share")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );
}
