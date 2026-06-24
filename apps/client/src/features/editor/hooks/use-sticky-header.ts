import { useEffect } from "react";
import { Editor } from "@tiptap/react";

/**
 * Options for sticky header behavior.
 */
export interface StickyHeaderOptions {
  /** Maximum number of header rows to keep frozen (default: 2) */
  maxHeaderRows?: number;
}

/**
 * Hook to manage sticky headers in the editor.
 * Supports freezing up to multiple header rows, with proper stacking
 * so each row stays at its correct offset from the container top.
 */
export const useStickyHeader = (
  editor: Editor | null,
  options: StickyHeaderOptions = {},
) => {
  const { maxHeaderRows = 2 } = options;

  useEffect(() => {
    if (!editor) return;
    if (maxHeaderRows < 1) return;

    const scrollParentCache = new Map<Element, HTMLElement>();

    const getScrollParent = (node: HTMLElement): HTMLElement => {
      if (node == null || node === document.documentElement) {
        return document.documentElement;
      }
      if (scrollParentCache.has(node)) {
        return scrollParentCache.get(node)!;
      }
      const style = window.getComputedStyle(node);
      const isScrollable = /(auto|scroll)/.test(
        style.overflow + style.overflowY,
      );
      if (isScrollable && node.scrollHeight > node.clientHeight) {
        scrollParentCache.set(node, node);
        return node;
      } else {
        const res = getScrollParent(node.parentNode as HTMLElement);
        scrollParentCache.set(node, res);
        return res;
      }
    };

    let isUpdating = false;

    const updateStickyHeaders = () => {
      if (isUpdating || !editor.view.dom) return;
      isUpdating = true;

      const allHeaders = Array.from(
        editor.view.dom.querySelectorAll("th"),
      ) as HTMLTableCellElement[];

      if (allHeaders.length === 0) {
        isUpdating = false;
        return;
      }

      // Group headers by their scroll parent
      const containerMap = new Map<HTMLElement, HTMLTableCellElement[]>();

      const tables = Array.from(editor.view.dom.querySelectorAll("table"));
      tables.forEach((table) => {
        const parent =
          (table.closest(".docmost-data-table") as HTMLElement) ||
          getScrollParent(table as HTMLElement);
        const tableHeaders = Array.from(
          table.querySelectorAll("th"),
        ) as HTMLTableCellElement[];
        if (tableHeaders.length > 0) {
          if (!containerMap.has(parent)) {
            containerMap.set(parent, []);
          }
          containerMap.get(parent)!.push(...tableHeaders);
        }
      });

      containerMap.forEach((headers, container) => {
        const containerRect = container.getBoundingClientRect();

        // Group headers by their row position
        const rows = new Map<
          HTMLTableRowElement,
          HTMLTableCellElement[]
        >();
        headers.forEach((th) => {
          const row = th.closest("tr") as HTMLTableRowElement;
          if (!row) return;
          if (!rows.has(row)) {
            rows.set(row, []);
          }
          rows.get(row)!.push(th);
        });

        // Sort rows by DOM order
        const sortedRows = Array.from(rows.entries()).sort((a, b) => {
          const pos = a[0].compareDocumentPosition(b[0]);
          if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
          if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
          return 0;
        });

        // Calculate cumulative heights and set top offsets
        let cumulativeHeight = 0;
        const rowTopOffsets = new Map<HTMLTableRowElement, number>();

        sortedRows.forEach(([row], index) => {
          if (index < maxHeaderRows) {
            rowTopOffsets.set(row, cumulativeHeight - 1); // -1px to avoid gap
            cumulativeHeight += row.getBoundingClientRect().height;
          }
        });

        // Track which rows have scrolled past the container
        const passedRows: HTMLTableRowElement[] = [];
        sortedRows.forEach(([row]) => {
          const firstCell = rows.get(row)?.[0];
          if (firstCell) {
            const rect = firstCell.getBoundingClientRect();
            if (rect.top <= containerRect.top + 5) {
              passedRows.push(row);
            }
          }
        });

        // Determine which rows should stay frozen
        let rowsToFreeze: Set<HTMLTableRowElement>;
        if (passedRows.length === 0) {
          // No rows have scrolled past — first few are frozen
          rowsToFreeze = new Set(
            sortedRows.slice(0, maxHeaderRows).map(([row]) => row),
          );
        } else if (passedRows.length >= sortedRows.length) {
          // All rows have scrolled past — last few visible ones are frozen
          const startIdx = Math.max(
            0,
            sortedRows.length - maxHeaderRows,
          );
          rowsToFreeze = new Set(
            sortedRows.slice(startIdx).map(([row]) => row),
          );
        } else {
          // Some rows scrolled past — freeze up to maxHeaderRows starting
          // from the first passed row
          const firstPassedIdx = sortedRows.findIndex(([row]) =>
            passedRows.includes(row),
          );
          const endIdx = Math.min(
            firstPassedIdx + maxHeaderRows,
            sortedRows.length,
          );
          rowsToFreeze = new Set(
            sortedRows.slice(firstPassedIdx, endIdx).map(([row]) => row),
          );
        }

        // Apply classes and top offsets
        sortedRows.forEach(([row, cells]) => {
          const shouldFreeze = rowsToFreeze.has(row);
          const topOffset = rowTopOffsets.get(row) ?? -1;

          cells.forEach((th) => {
            if (shouldFreeze) {
              th.classList.remove("is-covered");
              th.style.top = `${topOffset}px`;
              th.style.zIndex = "10";
            } else {
              if (!th.classList.contains("is-covered")) {
                th.classList.add("is-covered");
              }
              th.style.top = "";
              th.style.zIndex = "";
            }
          });
        });
      });

      isUpdating = false;
    };

    // Throttled update to prevent high CPU usage
    let timeoutId: any = null;
    const throttledUpdate = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        updateStickyHeaders();
        timeoutId = null;
      }, 50);
    };

    // MutationObserver to watch for structural content changes
    const mutationObserver = new MutationObserver((mutations) => {
      const significantChange = mutations.some((m) => {
        if (m.type !== "childList") return false;
        const nodes = Array.from(m.addedNodes).concat(
          Array.from(m.removedNodes),
        ) as HTMLElement[];
        return nodes.some((node) => {
          if (!node.classList) return true;
          return (
            !node.classList.contains("drag-handle") &&
            !node.closest?.(".drag-handle")
          );
        });
      });

      if (significantChange) {
        scrollParentCache.clear();
        throttledUpdate();
      }
    });

    mutationObserver.observe(editor.view.dom, {
      childList: true,
      subtree: true,
      characterData: false,
    });

    // ResizeObserver to watch for layout changes
    const resizeObserver = new ResizeObserver((entries) => {
      const hasRealChange = entries.some(
        (entry) =>
          entry.contentRect.width > 0 || entry.contentRect.height > 0,
      );
      if (hasRealChange) {
        scrollParentCache.clear();
        throttledUpdate();
      }
    });
    resizeObserver.observe(editor.view.dom);

    const handleScroll = () => {
      requestAnimationFrame(updateStickyHeaders);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });

    updateStickyHeaders();

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll, {
        capture: true,
      } as any);
    };
  }, [editor, maxHeaderRows]);
};
