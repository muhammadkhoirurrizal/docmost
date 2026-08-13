import { Table, TextInput, UnstyledButton } from "@mantine/core";
import { DatabaseItem, DatabaseProperty } from "@docmost/editor-ext";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

interface TableViewProps {
  items: DatabaseItem[];
  properties: DatabaseProperty[];
  onUpdateItem: (item: DatabaseItem) => void;
  onOpenItem: (itemId: string) => void;
}

export default function TableView({ items, properties, onUpdateItem, onOpenItem }: TableViewProps) {
  const { t } = useTranslation();

  const renderCell = (item: DatabaseItem, prop: DatabaseProperty) => {
    const value = item.properties[prop.id];

    if (prop.id === "title") {
      return (
        <UnstyledButton onClick={() => onOpenItem(item.id)} fw={500} style={{ display: 'block', width: '100%', padding: '4px 0' }}>
          {value || "Untitled"}
        </UnstyledButton>
      );
    }

    if (prop.type === "date") {
      return value ? dayjs(value).format('MMM D, YYYY') : "";
    }

    if (prop.type === "status") {
      const option = prop.options?.find(o => o.id === value);
      return option ? (
        <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: "12px", background: `var(--mantine-color-${option.color}-light)`, color: `var(--mantine-color-${option.color}-filled)`, fontSize: "12px", fontWeight: 500 }}>
          {option.label}
        </div>
      ) : "";
    }

    return value || "";
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <Table verticalSpacing="sm" highlightOnHover style={{ minWidth: 600 }}>
        <Table.Thead>
          <Table.Tr>
            {properties.map((prop) => (
              <Table.Th key={prop.id} style={{ color: "var(--mantine-color-dimmed)", fontWeight: 500 }}>
                {prop.name}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item) => (
            <Table.Tr key={item.id}>
              {properties.map((prop) => (
                <Table.Td key={prop.id} style={{ verticalAlign: "middle" }}>
                  {renderCell(item, prop)}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
          {items.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={properties.length} align="center" style={{ color: "var(--mantine-color-dimmed)", padding: "24px 0" }}>
                {t("No items")}
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
}
