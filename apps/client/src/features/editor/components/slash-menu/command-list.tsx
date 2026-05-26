import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SlashMenuGroupedItemsType,
  SlashMenuItemType,
} from "@/features/editor/components/slash-menu/types";
import {
  ActionIcon,
  Group,
  Paper,
  ScrollArea,
  Text,
  UnstyledButton,
} from "@mantine/core";
import classes from "./slash-menu.module.css";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

const CommandList = forwardRef<any, {
  items: SlashMenuGroupedItemsType;
  command: any;
  editor: any;
  range: any;
}>(({
  items,
  command,
  editor: _editor,
  range: _range,
}, ref) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  const flatItems = useMemo(() => {
    return Object.values(items).flat();
  }, [items]);

  const selectItem = useCallback(
    (index: number) => {
      const item = flatItems[index];
      if (item) {
        command(item);
      }
    },
    [command, flatItems],
  );

  const upHandler = useCallback(() => {
    setSelectedIndex((prev) => (prev + flatItems.length - 1) % flatItems.length);
  }, [flatItems.length]);

  const downHandler = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % flatItems.length);
  }, [flatItems.length]);

  const enterHandler = useCallback(() => {
    selectItem(selectedIndex);
  }, [selectItem, selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  useEffect(() => {
    setSelectedIndex(0);
  }, [flatItems]);

  useEffect(() => {
    viewportRef.current
      ?.querySelector(`[data-item-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return flatItems.length > 0 ? (
    <Paper id="slash-command" shadow="md" p="xs" withBorder>
      <ScrollArea viewportRef={viewportRef} h={350} w={270} scrollbarSize={8}>
        {Object.entries(items).map(([category, categoryItems]) => (
          <div key={category}>
            <Text c="dimmed" mb={4} fw={500} tt="capitalize">
              {category}
            </Text>
            {categoryItems.map((item: SlashMenuItemType, index: number) => (
              <UnstyledButton
                data-item-index={index}
                key={index}
                onClick={() => selectItem(index)}
                className={clsx(classes.menuBtn, {
                  [classes.selectedItem]: index === selectedIndex,
                })}
              >
                <Group>
                  <ActionIcon
                    variant="default"
                    component="div"
                  >
                    <item.icon size={18} />
                  </ActionIcon>

                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {t(item.title)}
                    </Text>

                    <Text c="dimmed" size="xs">
                      {t(item.description)}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            ))}
          </div>
        ))}
      </ScrollArea>
    </Paper>
  ) : null;
});

export default CommandList;
