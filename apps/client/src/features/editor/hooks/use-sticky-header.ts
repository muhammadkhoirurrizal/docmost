import { useEffect } from "react";
import { Editor } from "@tiptap/react";

/**
 * Hook to manage sticky headers in the editor.
 * Ensures that only the current table's header remains sticky at the top,
 * while previous headers are set to relative to avoid stacking.
 */
export const useStickyHeader = (editor: Editor | null) => {
    useEffect(() => {
        if (!editor) return;

        const scrollParentCache = new Map<Element, HTMLElement>();

        const getScrollParent = (node: HTMLElement): HTMLElement => {
            if (node == null || node === document.documentElement) {
                return document.documentElement;
            }
            if (scrollParentCache.has(node)) {
                return scrollParentCache.get(node)!;
            }
            const style = window.getComputedStyle(node);
            const isScrollable = /(auto|scroll)/.test(style.overflow + style.overflowY);
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

            const allHeaders = Array.from(editor.view.dom.querySelectorAll("th")) as HTMLTableCellElement[];
            if (allHeaders.length === 0) {
                isUpdating = false;
                return;
            }

            // Group headers by their scroll parent
            const containerMap = new Map<HTMLElement, HTMLTableCellElement[]>();

            // Optimization: Find scroll parent for each table instead of each cell
            const tables = Array.from(editor.view.dom.querySelectorAll("table"));
            tables.forEach(table => {
                const parent = table.closest(".docmost-data-table") as HTMLElement || getScrollParent(table as HTMLElement);
                const tableHeaders = Array.from(table.querySelectorAll("th"));
                if (tableHeaders.length > 0) {
                    if (!containerMap.has(parent)) {
                        containerMap.set(parent, []);
                    }
                    containerMap.get(parent)!.push(...tableHeaders);
                }
            });

            containerMap.forEach((headers, container) => {
                const containerRect = container.getBoundingClientRect();
                const passedHeaders: HTMLTableCellElement[] = [];

                headers.forEach((th) => {
                    const rect = th.getBoundingClientRect();
                    if (rect.top <= containerRect.top + 5) {
                        passedHeaders.push(th);
                    }
                });

                if (passedHeaders.length === 0) {
                    headers.forEach(th => {
                        if (th.classList.contains("is-covered")) th.classList.remove("is-covered");
                    });
                    return;
                }

                const activeHeader = passedHeaders[passedHeaders.length - 1];
                const activeRow = activeHeader.closest("tr");

                headers.forEach((th) => {
                    const row = th.closest("tr");
                    const thIndex = headers.indexOf(th);
                    const activeIndex = headers.indexOf(activeHeader);

                    const shouldBeCovered = row !== activeRow && thIndex < activeIndex;

                    if (shouldBeCovered) {
                        if (!th.classList.contains("is-covered")) th.classList.add("is-covered");
                    } else {
                        if (th.classList.contains("is-covered")) th.classList.remove("is-covered");
                    }
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
            }, 50); // 50ms throttle
        };

        // MutationObserver to watch for structural content changes (new tables, etc.)
        const mutationObserver = new MutationObserver((mutations) => {
            // Ignore text changes (characterData) and anything related to the drag handle
            const significantChange = mutations.some(m => {
                if (m.type !== "childList") return false;

                // Check if the added/removed nodes are not just the drag handle
                const nodes = Array.from(m.addedNodes).concat(Array.from(m.removedNodes)) as HTMLElement[];
                return nodes.some(node => {
                    if (!node.classList) return true;
                    return !node.classList.contains("drag-handle") && !node.closest?.(".drag-handle");
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
            characterData: false // Ignore typing to prevent lag
        });

        // ResizeObserver to watch for layout changes
        const resizeObserver = new ResizeObserver((entries) => {
            const hasRealChange = entries.some(entry => entry.contentRect.width > 0 || entry.contentRect.height > 0);
            if (hasRealChange) {
                scrollParentCache.clear();
                throttledUpdate();
            }
        });
        resizeObserver.observe(editor.view.dom);

        const handleScroll = () => {
            requestAnimationFrame(updateStickyHeaders);
        };

        window.addEventListener("scroll", handleScroll, { passive: true, capture: true });

        updateStickyHeaders();

        return () => {
            mutationObserver.disconnect();
            resizeObserver.disconnect();
            if (timeoutId) clearTimeout(timeoutId);
            window.removeEventListener("scroll", handleScroll, { capture: true } as any);
        };
    }, [editor]);
};
