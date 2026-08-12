import {
  Divider,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useAtomValue } from "jotai";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { extractPageSlugId } from "@/lib";
import { usePageQuery } from "@/features/page/queries/page-query.ts";
import { pageEditorAtom } from "@/features/editor/atoms/editor-atoms.ts";
import { formattedDate } from "@/lib/time.ts";
import { useTimeAgo } from "@/hooks/use-time-ago.tsx";
import { CustomAvatar } from "@/components/ui/custom-avatar.tsx";
import { LabelsSection } from "@/features/label/components/labels-section.tsx";
import { useEditorState } from "@tiptap/react";
import { useQuery } from "@tanstack/react-query";
import { getBacklinksCount } from "@/features/page-details/services/backlinks-service.ts";

export function PageDetailsAside() {
  const { pageSlug } = useParams();
  const { data: page } = usePageQuery({
    pageId: extractPageSlugId(pageSlug),
  });
  const pageEditor = useAtomValue(pageEditorAtom);

  const wordCount = useEditorState({
    editor: pageEditor,
    selector: ({ editor }) => editor?.storage?.characterCount?.words?.() ?? 0,
  }) ?? 0;

  const characterCount = useEditorState({
    editor: pageEditor,
    selector: ({ editor }) => editor?.storage?.characterCount?.characters?.() ?? 0,
  }) ?? 0;

  if (!page) return null;

  return (
    <>
      <Stack gap="md">
        <PeopleSection
          creator={page.creator}
          lastUpdatedBy={page.lastUpdatedBy}
        />

        <Divider />

        <StatsSection
          wordCount={wordCount}
          characterCount={characterCount}
          createdAt={page.createdAt}
          updatedAt={page.updatedAt}
        />

        <Divider />

        <BacklinksSection pageId={page.id} />

        <Divider />

        <LabelsSection
          pageId={page.id}
          canEdit={true}
        />
      </Stack>
    </>
  );
}

function PeopleSection({
  creator,
  lastUpdatedBy,
}: {
  creator: { id: string; name: string; avatarUrl: string } | null;
  lastUpdatedBy: { id: string; name: string; avatarUrl: string } | null;
}) {
  const { t } = useTranslation();
  return (
    <Stack gap="xs">
      <PersonRow label={t("Created by")} person={creator} />
      <PersonRow label={t("Last updated by")} person={lastUpdatedBy} />
    </Stack>
  );
}

function PersonRow({
  label,
  person,
}: {
  label: string;
  person: { id: string; name: string; avatarUrl: string } | null;
}) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      {person ? (
        <Group gap={6} wrap="nowrap">
          <CustomAvatar
            avatarUrl={person.avatarUrl}
            name={person.name}
            size={20}
            radius="xl"
          />
          <Text size="sm" lineClamp={1}>
            {person.name}
          </Text>
        </Group>
      ) : (
        <Text size="sm" c="dimmed">
          —
        </Text>
      )}
    </Group>
  );
}

function StatsSection({
  wordCount,
  characterCount,
  createdAt,
  updatedAt,
}: {
  wordCount: number;
  characterCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}) {
  const { t } = useTranslation();
  const lastUpdated = useTimeAgo(updatedAt);
  return (
    <Stack gap="xs">
      <Text size="xs" fw={500} c="dimmed">
        {t("Stats")}
      </Text>
      <StatRow label={t("Word count")} value={String(wordCount)} />
      <StatRow label={t("Characters")} value={String(characterCount)} />
      <StatRow
        label={t("Created")}
        value={formattedDate(new Date(createdAt))}
      />
      <StatRow label={t("Last updated")} value={lastUpdated} />
    </Stack>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value}</Text>
    </Group>
  );
}

function BacklinksSection({ pageId }: { pageId: string }) {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["backlinks-count", pageId],
    queryFn: () => getBacklinksCount(pageId),
  });

  return (
    <Stack gap="xs">
      <Text size="xs" fw={500} c="dimmed">
        {t("Backlinks")}
      </Text>
      <StatRow label={t("Incoming links")} value={String(data?.incoming ?? 0)} />
      <StatRow label={t("Outgoing links")} value={String(data?.outgoing ?? 0)} />
    </Stack>
  );
}
