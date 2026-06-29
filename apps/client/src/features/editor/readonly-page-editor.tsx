import "@/features/editor/styles/index.css";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { EditorProvider } from "@tiptap/react";
import { mainExtensions } from "@/features/editor/extensions/extensions";
import { Document } from "@tiptap/extension-document";
import { Heading, UniqueID } from "@docmost/editor-ext";
import { Text } from "@tiptap/extension-text";
import { Placeholder } from "@tiptap/extension-placeholder";
import { useAtom } from "jotai";
import { readOnlyEditorAtom } from "@/features/editor/atoms/editor-atoms.ts";
import { useEditorScroll } from "./hooks/use-editor-scroll";

interface PageEditorProps {
  title: string;
  content: any;
  pageId?: string;
}

export default function ReadonlyPageEditor({
  title,
  content,
  pageId,
}: PageEditorProps) {
  const [, setReadOnlyEditor] = useAtom(readOnlyEditorAtom);
  const isComponentMounted = useRef(false);
  const editorCreated = useRef(false);

  const canScroll = useCallback(
    () => isComponentMounted.current && editorCreated.current,
    [isComponentMounted, editorCreated],
  );
  const initialScrollTo = window.location.hash
    ? window.location.hash.slice(1)
    : "";
  const { handleScrollTo } = useEditorScroll({ canScroll, initialScrollTo });

  useEffect(() => {
    isComponentMounted.current = true;
  }, []);

  const extensions = useMemo(() => {
    const filteredExtensions = mainExtensions.filter(
      (ext) => ext.name !== "uniqueID",
    );

    return [
      ...filteredExtensions,
      UniqueID.configure({
        types: ["heading", "paragraph"],
        updateDocument: false,
      }),
    ];
  }, []);

  const titleExtensions = [
    Document.extend({
      content: "heading",
    }),
    Heading,
    Text,
    Placeholder.configure({
      placeholder: "Untitled",
      showOnlyWhenEditable: false,
    }),
  ];

  return (
    <>
      <EditorProvider
        editable={false}
        immediatelyRender={false}
        extensions={titleExtensions}
        content={title}
        editorProps={{
          attributes: {
            tabindex: "0",
          },
          handleDOMEvents: {
            copy: (_view, event) => {
              const selection = window.getSelection();
              if (!selection || selection.isCollapsed) {
                return false;
              }
              const text = selection.toString();
              if (event.clipboardData) {
                event.clipboardData.setData("text/plain", text);
              }
              event.preventDefault();
              return true;
            },
          },
        }}
      ></EditorProvider>

      <EditorProvider
        editable={false}
        immediatelyRender={false}
        extensions={extensions}
        content={content}
        editorProps={{
          attributes: {
            tabindex: "0",
          },
          handleDOMEvents: {
            copy: (_view, event) => {
              const selection = window.getSelection();
              if (!selection || selection.isCollapsed) {
                return false;
              }
              const range = selection.getRangeAt(0);
              const htmlContent = range.cloneContents();
              const tempDiv = document.createElement("div");
              tempDiv.appendChild(htmlContent.cloneNode(true));
              const html = tempDiv.innerHTML;
              const text = selection.toString();
              if (event.clipboardData) {
                event.clipboardData.setData("text/html", html);
                event.clipboardData.setData("text/plain", text);
              }
              event.preventDefault();
              return true;
            },
          },
        }}
        onCreate={({ editor }) => {
          if (editor) {
            if (pageId) {
              editor.storage.pageId = pageId;
            }
            // @ts-ignore
            setReadOnlyEditor(editor);

            handleScrollTo(editor);
            editorCreated.current = true;
          }
        }}
      ></EditorProvider>
      <div style={{ paddingBottom: "20vh" }}></div>
    </>
  );
}
