import { useTranslation } from "react-i18next";
import { Text, Group, Stack, Card } from "@mantine/core";
import { IconTablePlus, IconLink } from "@tabler/icons-react";

interface DatabaseInitSelectorProps {
  onNewDatabase: () => void;
  onSelectDataSource: () => void;
  layoutName: string;
}

const cardBase: React.CSSProperties = {
  width: 200,
  cursor: "pointer",
  transition: "box-shadow 0.2s, background 0.2s",
  borderRadius: 8,
};

export default function DatabaseInitSelector({
  onNewDatabase,
  layoutName
}: DatabaseInitSelectorProps) {
  const { t } = useTranslation();

  return (
    <div style={{
      border: "1px solid var(--mantine-color-default-border)",
      borderRadius: 8,
      padding: "24px",
      margin: "2rem 0",
      background: "var(--mantine-color-body)",
    }}>
      <Text size="sm" fw={600} c="dimmed" mb="lg">
        {t("Database")} · {layoutName}
      </Text>
      
      <Group align="flex-start" gap="md">
        {/* New Database */}
        <div
          style={{
            ...cardBase,
            border: "1px solid var(--mantine-color-default-border)",
            padding: 20,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--mantine-color-default-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          onClick={onNewDatabase}
        >
          <Stack align="center" gap="sm">
            <IconTablePlus size={32} color="var(--mantine-color-blue-filled)" />
            <Text size="sm" fw={500}>{t("New database")}</Text>
          </Stack>
        </div>

        {/* Select data source (coming soon) */}
        <div
          style={{
            ...cardBase,
            border: "1px solid var(--mantine-color-default-border)",
            padding: 20,
            cursor: "not-allowed",
            opacity: 0.5,
          }}
        >
          <Stack align="center" gap="sm">
            <IconLink size={32} color="var(--mantine-color-dimmed)" />
            <Text size="sm" fw={500} c="dimmed">{t("Select data source")}</Text>
            <Text size="xs" c="dimmed">{t("Coming soon")}</Text>
          </Stack>
        </div>
      </Group>
    </div>
  );
}
