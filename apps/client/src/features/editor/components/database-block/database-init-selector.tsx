import { useTranslation } from "react-i18next";
import { Text, Group, Stack, Card } from "@mantine/core";
import { IconTablePlus, IconLink } from "@tabler/icons-react";

interface DatabaseInitSelectorProps {
  onNewDatabase: () => void;
  onSelectDataSource: () => void;
  layoutName: string;
}

export default function DatabaseInitSelector({
  onNewDatabase,
  onSelectDataSource,
  layoutName
}: DatabaseInitSelectorProps) {
  const { t } = useTranslation();

  return (
    <div style={{
      border: "1px solid var(--mantine-color-default-border)",
      borderRadius: "var(--mantine-radius-md)",
      padding: "24px",
      margin: "2rem 0",
      background: "var(--mantine-color-body)",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <Text size="sm" fw={600} c="dimmed" mb="lg">
        {t("Database")} &middot; {layoutName}
      </Text>
      
      <Group align="flex-start" gap="md">
        <Card 
          withBorder 
          padding="lg" 
          radius="md" 
          style={{ width: 200, cursor: "pointer", transition: "all 0.2s" }}
          onClick={onNewDatabase}
        >
          <Stack align="center" gap="sm">
            <IconTablePlus size={32} color="var(--mantine-color-blue-filled)" />
            <Text size="sm" fw={500}>{t("New database")}</Text>
          </Stack>
        </Card>

        <Card 
          withBorder 
          padding="lg" 
          radius="md" 
          style={{ width: 200, cursor: "not-allowed", opacity: 0.6 }}
          onClick={() => {}}
        >
          <Stack align="center" gap="sm">
            <IconLink size={32} color="var(--mantine-color-dimmed)" />
            <Text size="sm" fw={500} c="dimmed">{t("Select data source")}</Text>
            <Text size="xs" c="dimmed">{t("Coming soon")}</Text>
          </Stack>
        </Card>
      </Group>
    </div>
  );
}
