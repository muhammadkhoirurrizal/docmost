import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { SmartGuideController } from "./smart-guide-controller";

export const SmartGuideExtension = Extension.create({
  name: "smart-guide",

  addStorage() {
    return {
      controller: null as SmartGuideController | null,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("smart-guide"),
        view: (view: EditorView) => {
          const controller = new SmartGuideController(view);

          // Store controller on the editor DOM element for easy access
          (view.dom as any).__smartGuideController = controller;

          // Also try to set on storage
          this.storage.controller = controller;

          return {
            destroy: () => {
              controller.destroy();
              (view.dom as any).__smartGuideController = null;
              this.storage.controller = null;
            },
          };
        },
      }),
    ];
  },
});
