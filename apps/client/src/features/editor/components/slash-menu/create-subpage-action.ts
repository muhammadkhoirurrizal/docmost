import api from "@/lib/api-client";
import { buildPageUrl } from "@/features/page/page.utils";
import { v7 } from "uuid";
import { Editor } from "@tiptap/core";
import { IPage } from "@/features/page/types/page.types";

export const createSubpageAction = async (
  parentPageId: string,
  spaceId: string,
  spaceSlug: string,
  editor: Editor,
  range: any
) => {
  try {
    // Call API to create subpage
    const response = await api.post<IPage>("/pages/create", {
      title: "Untitled",
      parentPageId,
      spaceId,
    });
    
    const newPage = response.data;
    
    // Insert subpage link block in the editor
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: "mention",
        attrs: {
          id: v7(),
          label: newPage.title,
          entityType: "page",
          entityId: newPage.id,
          slugId: newPage.slugId,
          creatorId: newPage.creatorId,
        },
      })
      .insertContent(" ") // add a space after the block
      .run();
      
    // Redirect to the new page
    const pageUrl = buildPageUrl(spaceSlug, newPage.slugId, newPage.title);
    window.location.href = pageUrl;
  } catch (error) {
    console.error("Failed to create subpage", error);
  }
};
