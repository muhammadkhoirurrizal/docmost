import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { useTranslation } from "react-i18next";
import { Text, UnstyledButton, Group } from "@mantine/core";
import dayjs from "dayjs";

interface CalendarViewProps {
  items: DatabaseItem[];
  properties: DatabaseProperty[];
  onUpdateItem: (item: DatabaseItem) => void;
  onOpenItem: (itemId: string) => void;
}

export default function CalendarView({ items, properties, onOpenItem }: CalendarViewProps) {
  const { t } = useTranslation();
  
  // Sort items by date
  const itemsWithDate = items.filter(i => i.properties.date).sort((a, b) => dayjs(a.properties.date).valueOf() - dayjs(b.properties.date).valueOf());

  return (
    <div style={{ padding: "16px 24px" }}>
      <Text size="sm" c="dimmed" mb="md">{t("Upcoming Items (Calendar List View)")}</Text>
      {itemsWithDate.length === 0 ? (
        <Text size="sm" c="dimmed">{t("No items with a date property.")}</Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {itemsWithDate.map(item => (
            <Group key={item.id} justify="space-between" style={{ padding: "12px", border: "1px solid var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-md)" }}>
              <UnstyledButton onClick={() => onOpenItem(item.id)} fw={500}>
                {item.properties.title || "Untitled"}
              </UnstyledButton>
              <Text size="sm" c="dimmed">{dayjs(item.properties.date).format("MMM D, YYYY")}</Text>
            </Group>
          ))}
        </div>
      )}
    </div>
  );
}
