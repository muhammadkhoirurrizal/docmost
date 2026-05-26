import { EditorView } from "@tiptap/pm/view";
import { getPageById } from "@/features/page/services/page-service.ts";
import { IPage } from "@/features/page/types/page.types.ts";
import { v7 } from "uuid";
import { extractPageSlugId } from "@/lib";

export type LinkFn = (
  url: string,
  view: EditorView,
  pos: number,
  creatorId: string,
  anchorId?: string,
) => void;

export interface InternalLinkOptions {
  validateFn: (url: string, view: EditorView) => boolean;
  onResolveLink: (linkedPageId: string, creatorId: string) => Promise<any>;
}

function extractHeadingTextFromContent(
  content: any,
  anchorId: string,
): string | null {
  if (!content) return null;

  const doc = typeof content === "string" ? JSON.parse(content) : content;

  function findHeadingText(node: any): string | null {
    if (node.type === "heading" && node.attrs?.id === anchorId) {
      return extractTextFromNode(node);
    }
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        const text = findHeadingText(child);
        if (text) return text;
      }
    }
    return null;
  }

  function extractTextFromNode(node: any): string {
    if (!node.content || !Array.isArray(node.content)) return "";
    return node.content
      .map((child: any) => {
        if (child.type === "text") return child.text || "";
        if (child.content) return extractTextFromNode(child);
        return "";
      })
      .join("");
  }

  return findHeadingText(doc);
}

export const handleInternalLink =
  ({ validateFn, onResolveLink }: InternalLinkOptions): LinkFn =>
  async (url: string, view, pos, creatorId, anchorId) => {
    const validated = validateFn(url, view);
    if (!validated) return;

    const linkedPageId = extractPageSlugId(url);

    await onResolveLink(linkedPageId, creatorId).then(
      (page: IPage) => {
        const { schema } = view.state;

        let label = page.title || "Untitled";

        if (anchorId) {
          const headingText = extractHeadingTextFromContent(
            page.content,
            anchorId,
          );
          if (headingText) {
            label = `${label} - ${headingText}`;
          }
        }

        const node = schema.nodes.mention.create({
          id: v7(),
          label,
          entityType: "page",
          entityId: page.id,
          slugId: page.slugId,
          creatorId: creatorId,
          anchorId: anchorId,
        });

        if (!node) return;

        const transaction = view.state.tr.replaceWith(pos, pos, node);
        view.dispatch(transaction);
      },
      () => {
        // on failure, insert as normal link
        const { schema } = view.state;

        const transaction = view.state.tr.insertText(url, pos);
        transaction.addMark(
          pos,
          pos + url.length,
          schema.marks.link.create({ href: url }),
        );

        view.dispatch(transaction);
      },
    );
  };

export const createMentionAction = handleInternalLink({
  onResolveLink: async (linkedPageId: string): Promise<any> => {
    // eslint-disable-next-line no-useless-catch
    try {
      return await getPageById({ pageId: linkedPageId });
    } catch (err) {
      throw err;
    }
  },
  validateFn: (_url: string, _view: EditorView) => {
    // validation is already done on the paste handler
    return true;
  },
});
