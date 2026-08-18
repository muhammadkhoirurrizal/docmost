import {
  ActionIcon,
  Group,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBell,
  IconCheck,
  IconFileDescription,
  IconPointFilled,
} from "@tabler/icons-react";
import { Avatar } from "@mantine/core";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { INotification } from "../types/notification.types";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useMarkReadMutation } from "../queries/notification-query";
import { buildPageUrl, getPageTitle } from "@/features/page/page.utils";
import { formatRelativeTime } from "../notification.utils";
import classes from "../notification.module.css";
import { useSetAtom } from "jotai";
import { asideStateAtom } from "@/components/layouts/global/hooks/atoms/sidebar-atom";

type NotificationItemProps = {
  notification: INotification;
  onNavigate: () => void;
};

export function NotificationItem({
  notification,
  onNavigate,
}: NotificationItemProps) {
  const { t } = useTranslation();
  const markRead = useMarkReadMutation();
  const [hovered, setHovered] = useState(false);
  const setAsideState = useSetAtom(asideStateAtom);

  const isUnread = !notification.readAt;

  const getNotificationMessageKey = (): string => {
    switch (notification.type) {
      case "comment.user_mention":
        return "<bold>{{name}}</bold> mentioned you in a comment";
      case "comment.created":
        return "<bold>{{name}}</bold> commented on a page";
      case "comment.resolved":
        return "<bold>{{name}}</bold> resolved a comment";
      case "page.user_mention":
        return "<bold>{{name}}</bold> mentioned you on a page";
      case "page.permission_granted":
        return notification.data?.role === "writer"
          ? "<bold>{{name}}</bold> gave you edit access to a page"
          : "<bold>{{name}}</bold> gave you view access to a page";
      case "page.updated":
        return "<bold>{{name}}</bold> updated a page";
      case "suggestion.created":
        return "<bold>{{name}}</bold> suggested an edit on a page";
      case "suggestion.resolved":
        return "<bold>{{name}}</bold> resolved your suggested edit";

      default:
        return "";
    }
  };

  const pageUrl =
    notification.page && notification.space
      ? buildPageUrl(
          notification.space.slug,
          notification.page.slugId,
          notification.page.title,
        )
      : undefined;

  const markReadIfNeeded = () => {
    if (isUnread) {
      markRead.mutate([notification.id]);
    }
  };

  const handleClick = () => {
    markReadIfNeeded();
    // For suggestion notifications, also open the suggestions panel
    if (
      notification.type === "suggestion.created" ||
      notification.type === "suggestion.resolved"
    ) {
      // Delay so navigation completes first before opening aside
      setTimeout(() => {
        setAsideState({ tab: "suggestions", isAsideOpen: true });
      }, 300);
    }
    onNavigate();
  };

  const handleMarkRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markReadIfNeeded();
  };

  return (
    <UnstyledButton
      component={Link}
      to={pageUrl ?? ""}
      onClick={handleClick}
      // auxclick fires for all non-primary buttons; guard to middle-click only (button 1)
      // so that right-click (button 2, context menu) does not mark as read
      onAuxClick={(e: React.MouseEvent) => e.button === 1 && markReadIfNeeded()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      w="100%"
      className={classes.notificationItem}
    >
      <Group wrap="nowrap" align="flex-start" gap="sm">
        {notification.actor ? (
          <CustomAvatar
            avatarUrl={notification.actor.avatarUrl}
            name={notification.actor.name}
            size="sm"
          />
        ) : (
          <Avatar size="sm" color="gray" radius="xl">
            <IconBell size={14} />
          </Avatar>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" lineClamp={2}>
            <Trans
              i18nKey={getNotificationMessageKey()}
              values={{ name: notification.actor?.name }}
              components={{ bold: <Text span fw={600} /> }}
            />
          </Text>

          {notification.page && (
            <Group gap={4} mt={2} wrap="nowrap">
              {notification.page.icon ? (
                <Text size="xs" style={{ flexShrink: 0 }}>
                  {notification.page.icon}
                </Text>
              ) : (
                <IconFileDescription
                  size={14}
                  stroke={1.5}
                  style={{ flexShrink: 0, color: "var(--mantine-color-dimmed)" }}
                />
              )}
              <Text size="xs" c="dimmed" lineClamp={1}>
                {getPageTitle(notification.page.title, undefined, t)}
              </Text>
            </Group>
          )}
        </div>

        <Group gap={4} wrap="nowrap" align="center" style={{ flexShrink: 0 }}>
          {hovered && isUnread ? (
            <Tooltip label={t("Mark as read")} withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleMarkRead}
              >
                <IconCheck size={14} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {formatRelativeTime(notification.createdAt)}
            </Text>
          )}

          {isUnread && (
            <IconPointFilled
              size={12}
              color="var(--mantine-color-blue-filled)"
              style={{ flexShrink: 0 }}
            />
          )}
        </Group>
      </Group>
    </UnstyledButton>
  );
}
