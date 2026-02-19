import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

export interface TwineEditorOptions {
    HTMLAttributes: Record<string, any>;
    view: any;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        twineEditor: {
            insertTwineEditor: (attributes?: Record<string, any>) => ReturnType;
        };
    }
}

export const TwineEditor = Node.create<TwineEditorOptions>({
    name: "twineEditor",
    group: "block",
    draggable: true,
    selectable: true,
    atom: true,

    addOptions() {
        return {
            HTMLAttributes: {},
            view: null,
        };
    },

    addAttributes() {
        return {
            attachmentId: {
                default: undefined,
                parseHTML: (element) => element.getAttribute("data-attachment-id"),
                renderHTML: (attributes) => ({
                    "data-attachment-id": attributes.attachmentId,
                }),
            },
            src: {
                default: "",
                parseHTML: (element) => element.getAttribute("data-src"),
                renderHTML: (attributes) => ({
                    "data-src": attributes.src,
                }),
            },
            playUrl: {
                default: "",
                parseHTML: (element) => element.getAttribute("data-play-url"),
                renderHTML: (attributes) => ({
                    "data-play-url": attributes.playUrl,
                }),
            },
            playAttachmentId: {
                default: undefined,
                parseHTML: (element) => element.getAttribute("data-play-attachment-id"),
                renderHTML: (attributes) => ({
                    "data-play-attachment-id": attributes.playAttachmentId,
                }),
            },
            height: {
                default: 600,
                parseHTML: (element) => element.getAttribute("data-height"),
                renderHTML: (attributes) => ({
                    "data-height": attributes.height,
                }),
            },
            blockId: {
                default: undefined,
                parseHTML: (element) => element.getAttribute("data-block-id"),
                renderHTML: (attributes) => ({
                    "data-block-id": attributes.blockId,
                }),
            },
            title: {
                default: "",
                parseHTML: (element) => element.getAttribute("data-title"),
                renderHTML: (attributes) => ({
                    "data-title": attributes.title,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: `div[data-type="${this.name}"]`,
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ["div", mergeAttributes({ "data-type": this.name }, this.options.HTMLAttributes, HTMLAttributes)];
    },

    addCommands() {
        return {
            insertTwineEditor: (attributes) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: attributes || {},
                });
            },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(this.options.view);
    },
});
