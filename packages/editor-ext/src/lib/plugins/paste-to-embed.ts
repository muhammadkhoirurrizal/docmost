import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { TextSelection } from "@tiptap/pm/state";
import { getEmbedUrlAndProvider, IEmbedResult } from "../embed-provider";

export interface PasteToEmbedOptions {
  fetchMetadata?: (
    url: string
  ) => Promise<{ title: string | null; icon: string | null; provider: string }>;
}

interface PasteToEmbedState {
  active: boolean;
  from: number;
  to: number;
  url: string;
  provider: string;
  title: string | null;
  icon: string | null;
}

export const PasteToEmbedKey = new PluginKey<PasteToEmbedState>("pasteToEmbed");

function createPopup(): HTMLElement {
  const popup = document.createElement("div");
  popup.className = "paste-to-embed-popup";
  popup.setAttribute("role", "tooltip");
  Object.assign(popup.style, {
    position: "fixed",
    display: "none",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    backgroundColor: "var(--mantine-color-gray-1, #f8f9fa)",
    border: "1px solid var(--mantine-color-gray-4, #ced4da)",
    borderRadius: "var(--mantine-radius-md, 8px)",
    boxShadow: "var(--mantine-shadow-md, 0 4px 12px rgba(0,0,0,0.15))",
    fontSize: "var(--mantine-font-size-sm, 13px)",
    color: "var(--mantine-color-text, #212529)",
    zIndex: "9999",
    pointerEvents: "none",
    whiteSpace: "nowrap",
  });
  return popup;
}

function updatePopupContent(
  popup: HTMLElement,
  state: PasteToEmbedState,
  t?: (key: string) => string
) {
  const replaceText = t ? t("to be replaced with") : "untuk diganti dengan";

  const title = state.title || state.provider;
  const icon = state.icon
    ? `<img src="${state.icon}" alt="" style="width:16px;height:16px;border-radius:2px;object-fit:cover;" />`
    : `<span style="font-size:14px;">📎</span>`;

  popup.innerHTML = `
    <span style="
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:2px 6px;
      background:var(--mantine-color-gray-2,#e9ecef);
      border:1px solid var(--mantine-color-gray-4,#ced4da);
      border-radius:4px;
      font-size:11px;
      font-weight:600;
      color:var(--mantine-color-dimmed,#495057);
      font-family:monospace;
    ">Tab</span>
    <span style="color:var(--mantine-color-dimmed,#868e96);">${replaceText}</span>
    <span style="display:inline-flex;align-items:center;gap:4px;font-weight:500;">
      ${icon}
      <span>${title}</span>
    </span>
  `;
}

function positionPopup(popup: HTMLElement, view: EditorView, from: number) {
  const coords = view.coordsAtPos(from);
  const rect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;

  let left = coords.left;
  let top = coords.bottom + 8;

  // Keep within viewport
  if (left + rect.width > viewportWidth) {
    left = viewportWidth - rect.width - 16;
  }
  if (left < 8) {
    left = 8;
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

export function PasteToEmbedPlugin(options: PasteToEmbedOptions = {}): Plugin {
  let popup: HTMLElement | null = null;

  return new Plugin<PasteToEmbedState>({
    key: PasteToEmbedKey,

    state: {
      init() {
        return {
          active: false,
          from: -1,
          to: -1,
          url: "",
          provider: "",
          title: null,
          icon: null,
        };
      },
      apply(tr, state) {
        const meta = tr.getMeta(PasteToEmbedKey);
        if (meta === undefined) {
          // If document changed significantly, hide popup
          if (state.active && tr.docChanged) {
            return {
              ...state,
              active: false,
            };
          }
          return state;
        }
        if (meta === null) {
          return {
            active: false,
            from: -1,
            to: -1,
            url: "",
            provider: "",
            title: null,
            icon: null,
          };
        }
        return { ...state, ...meta };
      },
    },

    props: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain").trim();
        if (!text) return false;

        const result: IEmbedResult = getEmbedUrlAndProvider(text);
        if (result.provider === "iframe") {
          return false; // Not an embeddable URL, let default handler process it
        }

        const { state } = view;
        const { from } = state.selection;

        // Insert the URL as a link mark
        const tr = state.tr;
        const linkMark = state.schema.marks.link.create({ href: text });
        tr.insertText(text, from);
        tr.addMark(from, from + text.length, linkMark);
        tr.setMeta(PasteToEmbedKey, {
          active: true,
          from,
          to: from + text.length,
          url: text,
          provider: result.provider,
          title: null,
          icon: null,
        });
        view.dispatch(tr);

        // Fetch metadata if callback provided
        if (options.fetchMetadata) {
          options
            .fetchMetadata(text)
            .then((metadata) => {
              const currentState = PasteToEmbedKey.getState(view.state);
              if (
                !currentState?.active ||
                currentState.url !== text
              ) {
                return;
              }
              view.dispatch(
                view.state.tr.setMeta(PasteToEmbedKey, {
                  ...currentState,
                  title: metadata.title,
                  icon: metadata.icon,
                  provider: metadata.provider,
                })
              );
            })
            .catch(() => {
              // Ignore metadata fetch errors
            });
        }

        event.preventDefault();
        return true;
      },

      handleKeyDown(view, event) {
        const state = PasteToEmbedKey.getState(view.state);
        if (!state?.active) return false;

        if (event.key === "Tab" && !event.shiftKey) {
          event.preventDefault();

          const { schema } = view.state;
          const embedNode = schema.nodes.embed;
          if (!embedNode) return false;

          const result = getEmbedUrlAndProvider(state.url);

          const tr = view.state.tr;
          tr.deleteRange(state.from, state.to);
          tr.insert(
            state.from,
            embedNode.create({
              src: state.url,
              provider: result.provider,
            })
          );

          // Insert paragraph after embed for continuation
          const afterPos = state.from + 1;
          tr.insert(afterPos, schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.near(tr.doc.resolve(afterPos + 1)));

          tr.setMeta(PasteToEmbedKey, null);
          view.dispatch(tr);
          return true;
        }

        if (event.key === "Escape") {
          const tr = view.state.tr.setMeta(PasteToEmbedKey, null);
          view.dispatch(tr);
          return true;
        }

        return false;
      },
    },

    view(editorView) {
      popup = createPopup();
      document.body.appendChild(popup);

      return {
        update(view) {
          const state = PasteToEmbedKey.getState(view.state);
          if (!popup || !state?.active) {
            if (popup) popup.style.display = "none";
            return;
          }

          updatePopupContent(popup, state);
          popup.style.display = "flex";
          positionPopup(popup, view, state.from);
        },
        destroy() {
          popup?.remove();
          popup = null;
        },
      };
    },
  });
}
