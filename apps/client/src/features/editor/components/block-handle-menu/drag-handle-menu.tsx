import { Menu, rem } from "@mantine/core";
import { Editor } from "@tiptap/react";
import { IconCopy, IconTrash } from "@tabler/icons-react";
import { useEffect, useState, useCallback } from "react";

interface DragHandleMenuProps {
    editor: Editor | null;
}

export const DragHandleMenu = ({ editor }: DragHandleMenuProps) => {
    const [opened, setOpened] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [targetPos, setTargetPos] = useState<number | null>(null);

    const handleContextMenu = useCallback(
        (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains("drag-handle")) {
                event.preventDefault();
                event.stopPropagation();

                const { clientX, clientY } = event;
                setMenuPosition({ x: clientX, y: clientY });

                if (editor) {
                    try {
                        // Logic similar to drag handle extension: find node at coordinates
                        // We offset slightly to ensure we hit the content area next to handle
                        const pos = editor.view.posAtCoords({ left: clientX + 40, top: clientY });
                        if (pos) {
                            const { state } = editor.view;
                            const $pos = state.doc.resolve(pos.pos);

                            // Find the top-level block node
                            let nodePos = pos.pos;
                            for (let d = $pos.depth; d > 0; d--) {
                                nodePos = $pos.before(d);
                                const node = state.doc.nodeAt(nodePos);
                                if (node && node.type.isBlock && d === 1) {
                                    break;
                                }
                            }

                            setTargetPos(nodePos);
                            setOpened(true);
                        }
                    } catch (e) {
                        console.error("Failed to find position at coords", e);
                    }
                }
            }
        },
        [editor],
    );

    useEffect(() => {
        window.addEventListener("contextmenu", handleContextMenu);
        return () => {
            window.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [handleContextMenu]);

    const handleDuplicate = () => {
        if (!editor || targetPos === null) return;

        const { state } = editor.view;
        try {
            const node = state.doc.nodeAt(targetPos);
            if (node) {
                const nextPos = targetPos + node.nodeSize;
                editor.chain().focus().insertContentAt(nextPos, node.toJSON()).run();
            }
        } catch (e) {
            console.error("Duplicate failed", e);
        }
        setOpened(false);
    };

    const handleDelete = () => {
        if (!editor || targetPos === null) return;

        const { state } = editor.view;
        try {
            const node = state.doc.nodeAt(targetPos);
            if (node) {
                editor.chain().focus().deleteRange({ from: targetPos, to: targetPos + node.nodeSize }).run();
            }
        } catch (e) {
            console.error("Delete failed", e);
        }
        setOpened(false);
    };

    if (!opened) return null;

    return (
        <div
            style={{
                position: "fixed",
                left: menuPosition.x,
                top: menuPosition.y,
                zIndex: 1000,
            }}
        >
            <Menu opened={opened} onChange={setOpened} shadow="md" width={160}>
                <Menu.Target>
                    <div style={{ visibility: "hidden", width: 1, height: 1 }} />
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item
                        leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
                        onClick={handleDuplicate}
                    >
                        Duplicate block
                    </Menu.Item>
                    <Menu.Item
                        color="red"
                        leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                        onClick={handleDelete}
                    >
                        Delete block
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </div>
    );
};
