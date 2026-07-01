export interface RollupPage {
  id: string;
  slugId: string;
  title: string;
  icon?: string;
  content: any;
  depth: number;
}

/**
 * Build a single ProseMirror document that aggregates every descendant page's
 * title (as a heading) and content. The parent folder's title is used as the
 * document's top heading.
 */
export function buildRollupContent(
  parentTitle: string,
  pages: RollupPage[],
): object {
  const docContent: any[] = [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: `All content under ${parentTitle || "folder"}`,
        },
      ],
    },
  ];

  for (const page of pages) {
    const pageContent =
      typeof page.content === "string" ? JSON.parse(page.content) : page.content;

    const childNodes = pageContent?.content || [];

    const headingLevel = Math.min(6, page.depth + 1);
    docContent.push({
      type: "heading",
      attrs: { level: headingLevel },
      content: [
        {
          type: "text",
          text: page.icon ? `${page.icon} ${page.title || "untitled"}` : page.title || "untitled",
        },
      ],
    });

    docContent.push(...childNodes);
  }

  return { type: "doc", content: docContent };
}
