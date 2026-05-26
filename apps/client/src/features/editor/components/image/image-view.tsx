import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { ActionIcon, Modal, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getFileUrl } from "@/lib/config.ts";
import clsx from "clsx";
import classes from "./image-view.module.css";
import { IconX } from "@tabler/icons-react";

export default function ImageView(props: NodeViewProps) {
  const { node, selected, updateAttributes, editor } = props;
  const { src, width, title, caption } = node.attrs;
  const [hovered, setHovered] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState<number | string>(width || "100%");
  const [opened, { open, close }] = useDisclosure(false);

  const resizeRef = useRef<{
    startX: number;
    startWidth: number;
    direction: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const isEditable = editor.isEditable;
  const showPlaceholder = isEditable && (selected || hovered);
  const hasCaption = !!caption;

  useEffect(() => {
    setCurrentWidth(width || "100%");
  }, [width]);

  const onMouseDown = (
    e: React.MouseEvent,
    direction: number
  ) => {
    if (!isEditable || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const startWidth = containerRef.current.offsetWidth;

    resizeRef.current = {
      startX: e.clientX,
      startWidth,
      direction,
    };
    setResizing(true);

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!resizing) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;

      const { startX, startWidth, direction } = resizeRef.current;
      const uniqueDelta = (e.clientX - startX) * direction;

      // Calculate new width
      // We assume aspect ratio is maintained by height: auto
      const newWidth = Math.max(50, startWidth + uniqueDelta);

      // Update local state for smooth resizing
      setCurrentWidth(`${newWidth}px`);
    };

    const onMouseUp = () => {
      setResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (resizeRef.current) {
        // Commit the final width change
        // We use the last calculated width from the ref or derive it
        // Ideally we should have been tracking it in a ref if updates are slow, 
        // but setState is usually fast enough for mouseup commit.
        // Let's grab the actual DOM width if possible or trust currentWidth

        // Better: parse currentWidth if it is in px
        if (typeof currentWidth === 'string' && currentWidth.endsWith('px')) {
          updateAttributes({ width: currentWidth });
        }
      }
      resizeRef.current = null;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizing, currentWidth, updateAttributes]);

  return (
    <NodeViewWrapper
      as="span"
      className={clsx(classes.imageWrapper, {
        [classes.selected]: selected && isEditable,
        "ProseMirror-selectednode": selected && isEditable // Keep this for tiptap selection styles
      })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: currentWidth,
        display: "inline-block",
        verticalAlign: "top"
      }}
      ref={containerRef}
    >
      <img
        draggable="true"
        data-drag-handle
        src={getFileUrl(src)}
        alt={title}
        className={classes.image}
        onClick={!isEditable ? open : undefined}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: "var(--mantine-radius-md)",
          objectFit: "contain",
          cursor: !isEditable ? "zoom-in" : undefined
        }}
      />

      <Modal
        opened={opened}
        onClose={close}
        size="auto"
        centered
        withCloseButton={false}
        closeOnClickOutside={true}
        padding={0}
        styles={{
          content: {
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
          body: {
            padding: 0,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }
        }}
      >
        <div style={{ position: "relative", display: "inline-block", padding: 40 }}>
          <ActionIcon
            variant="filled"
            color="dark"
            onClick={close}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1000,
              borderRadius: "50%",
            }}
          >
            <IconX size={18} />
          </ActionIcon>
          <img
            src={getFileUrl(src)}
            alt={title}
            style={{
              maxWidth: "calc(90vw - 80px)",
              maxHeight: "calc(90vh - 80px)",
              display: "block",
              borderRadius: "var(--mantine-radius-md)",
              boxShadow: "var(--mantine-shadow-xl)",
            }}
          />
        </div>
      </Modal>

      {/* Visual resize handles */}
      {isEditable && (selected || resizing) && (
        <>
          <div
            className={clsx(classes.resizeHandle, classes.resizeHandleNw)}
            onMouseDown={(e) => onMouseDown(e, -1)}
          />
          <div
            className={clsx(classes.resizeHandle, classes.resizeHandleNe)}
            onMouseDown={(e) => onMouseDown(e, 1)}
          />
          <div
            className={clsx(classes.resizeHandle, classes.resizeHandleSw)}
            onMouseDown={(e) => onMouseDown(e, -1)}
          />
          <div
            className={clsx(classes.resizeHandle, classes.resizeHandleSe)}
            onMouseDown={(e) => onMouseDown(e, 1)}
          />
        </>
      )}

      {/* Caption Input */}
      <TextInput
        variant="unstyled"
        placeholder="Add a caption..."
        value={caption || ""}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        styles={{
          input: {
            textAlign: "center",
            color: "var(--mantine-color-dimmed)",
            fontSize: "var(--mantine-font-size-sm)",
            marginTop: "4px",
            padding: 0,
            minHeight: 0,
            height: "auto",
            opacity: hasCaption || showPlaceholder ? 1 : 0,
            transition: "opacity 0.2s ease-in-out",
            pointerEvents: isEditable ? "auto" : "none",
            width: "100%", // Caption takes full width of the resized container
          },
          root: {
            width: "100%"
          }
        }}
        readOnly={!isEditable}
      />
    </NodeViewWrapper>
  );
}
