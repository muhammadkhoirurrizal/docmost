import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionIcon, Modal, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getFileUrl } from "@/lib/config.ts";
import clsx from "clsx";
import classes from "./image-view.module.css";
import { IconX } from "@tabler/icons-react";

export default function ImageView(props: NodeViewProps) {
  const { node, selected, updateAttributes, editor } = props;
  const { src, width, title, caption, align } = node.attrs;
  const [hovered, setHovered] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState<number | string>(width || "100%");
  const [opened, { open, close }] = useDisclosure(false);

  // Zoom & pan state for lightbox
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const isZoomedIn = zoomLevel > fitScale + 0.01;
  const [imageError, setImageError] = useState(false);

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
    if (width && typeof width === 'string' && width.endsWith('px') && containerRef.current?.parentElement) {
      // Convert pixel width to percentage for consistency
      const parentWidth = containerRef.current.parentElement.offsetWidth || 1;
      const pxValue = parseInt(width);
      const percentage = Math.max(10, Math.min(100, Math.round((pxValue / parentWidth) * 100)));
      setCurrentWidth(`${percentage}%`);
    } else {
      setCurrentWidth(width || "100%");
    }
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

    // Start smart guides
    const controller = (editor.view.dom as any).__smartGuideController;
    if (controller) {
      controller.startInteraction(props.getPos());
    }

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!resizing) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current || !containerRef.current) return;

      const { startX, startWidth, direction } = resizeRef.current;
      const uniqueDelta = (e.clientX - startX) * direction;

      // Calculate new width in pixels
      const newWidthPx = Math.max(50, startWidth + uniqueDelta);

      // Convert to percentage relative to parent container
      const parentWidth = containerRef.current.parentElement?.offsetWidth || 1;
      const percentage = Math.max(10, Math.min(100, Math.round((newWidthPx / parentWidth) * 100)));

      // Update local state as percentage for smooth resizing
      setCurrentWidth(`${percentage}%`);

      // Update smart guides
      const controller = (editor.view.dom as any).__smartGuideController;
      if (controller && containerRef.current) {
        controller.updateGuides(containerRef.current.getBoundingClientRect());
      }
    };

    const onMouseUp = () => {
      setResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      // End smart guides
      const controller = (editor.view.dom as any).__smartGuideController;
      if (controller) {
        controller.endInteraction();
      }

      if (resizeRef.current) {
        // Commit the final width change as percentage
        if (typeof currentWidth === 'string' && currentWidth.endsWith('%')) {
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

  // -- Zoom & pan handlers --

  const handleImageLoad = useCallback(() => {
    if (!imageRef.current) return;
    const { naturalWidth, naturalHeight } = imageRef.current;
    if (!naturalWidth || !naturalHeight) return;

    const maxW = window.innerWidth * 0.9 - 80;
    const maxH = window.innerHeight * 0.9 - 80;

    const scale = Math.min(maxW / naturalWidth, maxH / naturalHeight, 1);
    setFitScale(scale);
    setZoomLevel(scale);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleClose = useCallback(() => {
    setIsPanning(false);
    setZoomLevel(fitScale);
    setPanOffset({ x: 0, y: 0 });
    close();
  }, [fitScale, close]);

  const toggleZoom = useCallback(() => {
    if (isZoomedIn) {
      setZoomLevel(fitScale);
      setPanOffset({ x: 0, y: 0 });
    } else {
      const target = Math.min(Math.max(fitScale * 2, 1), 5);
      setZoomLevel(target);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isZoomedIn, fitScale]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setZoomLevel((prev) => {
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        const next = Math.max(0.3, Math.min(5, prev + delta));
        if (next <= fitScale + 0.01) {
          setPanOffset({ x: 0, y: 0 });
        }
        return next;
      });
    },
    [fitScale],
  );

  const handleViewportMouseDown = useCallback(
    (e: React.MouseEvent) => {
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
      hasMoved.current = false;

      if (isZoomedIn) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: panOffset.x,
          panY: panOffset.y,
        };
      }
    },
    [isZoomedIn, panOffset],
  );

  // Panning move/up listeners on document
  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved.current = true;
      }

      setPanOffset({
        x: panStartRef.current.panX + e.clientX - panStartRef.current.x,
        y: panStartRef.current.panY + e.clientY - panStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning]);

  // Reset zoom when modal opens
  useEffect(() => {
    if (opened) {
      setZoomLevel(fitScale);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [opened, fitScale]);

  // -- End zoom & pan --

  return (
    <NodeViewWrapper
      as="span"
      className={clsx(classes.imageWrapper, {
        [classes.selected]: selected && isEditable,
        "ProseMirror-selectednode": selected && isEditable,
        alignLeft: align === "left",
        alignCenter: align === "center",
        alignRight: align === "right",
      })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: currentWidth,
        display: "block",
        marginLeft: align === "left" ? 0 : "auto",
        marginRight: align === "right" ? 0 : "auto",
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
        onClose={handleClose}
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
            onClick={handleClose}
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
          <div
            style={{
              overflow: "hidden",
              width: "calc(90vw - 80px)",
              height: "calc(90vh - 80px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isZoomedIn ? (isPanning ? "grabbing" : "grab") : "zoom-in",
            }}
            onWheel={handleWheel}
            onMouseDown={handleViewportMouseDown}
            onMouseUp={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              if (!hasMoved.current) {
                toggleZoom();
              }
            }}
          >
            <img
              ref={imageRef}
              src={getFileUrl(src)}
              alt={title}
              onLoad={() => {
                setImageError(false);
                handleImageLoad();
              }}
              onError={() => setImageError(true)}
              draggable={false}
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 0.15s ease-out",
                display: imageError ? "none" : "block",
                borderRadius: "var(--mantine-radius-md)",
                boxShadow: "var(--mantine-shadow-xl)",
                maxWidth: "100%",
                maxHeight: "100%",
                userSelect: "none",
                pointerEvents: "none",
                willChange: isPanning ? "transform" : "auto",
              }}
            />
            {imageError && (
              <div
                style={{
                  position: "absolute",
                  color: "var(--mantine-color-dimmed)",
                  fontSize: "var(--mantine-font-size-sm)",
                  textAlign: "center",
                }}
              >
                Failed to load image
              </div>
            )}
          </div>
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
