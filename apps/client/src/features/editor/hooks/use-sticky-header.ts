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

        const getScrollParent = (node: HTMLElement): HTMLElement => {
            if (node == null || node === document.documentElement) {
                return document.documentElement;
            }
            const style = window.getComputedStyle(node);
            const isScrollable = /(auto|scroll)/.test(style.overflow + style.overflowY);
            if (isScrollable && node.scrollHeight > node.clientHeight) {
                return node;
            } else {
                return getScrollParent(node.parentNode as HTMLElement);
            }
        };

        const updateStickyHeaders = () => {
            const allHeaders = Array.from(editor.view.dom.querySelectorAll("th")) as HTMLTableCellElement[];
            if (allHeaders.length === 0) return;

            // Group headers by their scroll parent
            const containerMap = new Map<HTMLElement, HTMLTableCellElement[]>();
            allHeaders.forEach(th => {
                const parent = th.closest(".docmost-data-table") as HTMLElement || getScrollParent(th);
                if (!containerMap.has(parent)) {
                    containerMap.set(parent, []);
                }
                containerMap.get(parent)!.push(th);
            });

            containerMap.forEach((headers, container) => {
                const containerRect = container.getBoundingClientRect();

                // Find all headers that have reached or passed the top of the container
                const passedHeaders: HTMLTableCellElement[] = [];

                headers.forEach((th) => {
                    const rect = th.getBoundingClientRect();
                    // Using a small buffer (5px). If the header's top is at or above the container's top.
                    if (rect.top <= containerRect.top + 5) {
                        passedHeaders.push(th);
                    }
                });

                if (passedHeaders.length === 0) {
                    headers.forEach(th => th.classList.remove("is-covered"));
                    return;
                }

                // The "active" header is the LAST one in DOM order that has passed the top.
                const activeHeader = passedHeaders[passedHeaders.length - 1];
                const activeRow = activeHeader.closest("tr");

                headers.forEach((th) => {
                    const row = th.closest("tr");
                    if (row === activeRow) {
                        th.classList.remove("is-covered");
                        return;
                    }

                    // Any header row that appeared BEFORE the active row in the DOM
                    // and has already "passed" the top should be covered.
                    // Actually, we can just cover ALL headers before the active one.
                    const thIndex = headers.indexOf(th);
                    const activeIndex = headers.indexOf(activeHeader);

                    if (thIndex < activeIndex) {
                        th.classList.add("is-covered");
                    } else {
                        th.classList.remove("is-covered");
                    }
                });
            });
        };

        // MutationObserver to watch for content changes (new tables, deleted rows, etc.)
        const mutationObserver = new MutationObserver(() => {
            updateStickyHeaders();
        });

        mutationObserver.observe(editor.view.dom, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // ResizeObserver to watch for layout changes
        const resizeObserver = new ResizeObserver(() => {
            updateStickyHeaders();
        });
        resizeObserver.observe(editor.view.dom);

        const handleScroll = () => {
            requestAnimationFrame(updateStickyHeaders);
        };

        // Listen for scroll events on window AND capture scroll events from any element (like ScrollArea)
        window.addEventListener("scroll", handleScroll, { passive: true, capture: true });

        // Initial check
        updateStickyHeaders();

        return () => {
            mutationObserver.disconnect();
            resizeObserver.disconnect();
            window.removeEventListener("scroll", handleScroll, { capture: true } as any);
        };
    }, [editor]);
};
