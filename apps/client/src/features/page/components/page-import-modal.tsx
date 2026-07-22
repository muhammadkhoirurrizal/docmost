import {
  Modal,
  Button,
  SimpleGrid,
  FileButton,
  Group,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconBrandGoogle,
  IconBrandNotion,
  IconCheck,
  IconFileCode,
  IconFileTypeZip,
  IconMarkdown,
  IconX,
} from "@tabler/icons-react";
import {
  importPage,
  importGoogleDoc,
  importZip,
} from "@/features/page/services/page-service.ts";
import { notifications } from "@mantine/notifications";
import { treeDataAtom } from "@/features/page/tree/atoms/tree-data-atom.ts";
import { useAtom } from "jotai";
import { buildTree } from "@/features/page/tree/utils";
import { IPage } from "@/features/page/types/page.types.ts";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfluenceIcon } from "@/components/icons/confluence-icon.tsx";
import { getFileImportSizeLimit, isCloud } from "@/lib/config.ts";
import { formatBytes } from "@/lib";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom.ts";
import { getFileTaskById } from "@/features/file-task/services/file-task-service.ts";
import { queryClient } from "@/main.tsx";
import { useQueryEmit } from "@/features/websocket/use-query-emit.ts";

interface PageImportModalProps {
  spaceId: string;
  open: boolean;
  onClose: () => void;
}

export default function PageImportModal({
  spaceId,
  open,
  onClose,
}: PageImportModalProps) {
  const { t } = useTranslation();
  return (
    <>
      <Modal.Root
        opened={open}
        onClose={onClose}
        size={600}
        padding="xl"
        yOffset="10vh"
        xOffset={0}
        mah={400}
        keepMounted={true}
      >
        <Modal.Overlay />
        <Modal.Content style={{ overflow: "hidden" }}>
          <Modal.Header py={0}>
            <Modal.Title fw={500}>{t("Import pages")}</Modal.Title>
            <Modal.CloseButton />
          </Modal.Header>
          <Modal.Body>
            <ImportFormatSelection spaceId={spaceId} onClose={onClose} />
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}

interface ImportFormatSelection {
  spaceId: string;
  onClose: () => void;
}
function ImportFormatSelection({ spaceId, onClose }: ImportFormatSelection) {
  const { t } = useTranslation();
  const [treeData, setTreeData] = useAtom(treeDataAtom);
  const [workspace] = useAtom(workspaceAtom);
  const [fileTaskId, setFileTaskId] = useState<string | null>(null);
  const [showGoogleDocs, setShowGoogleDocs] = useState(false);
  const [googleDocsUrl, setGoogleDocsUrl] = useState("");
  const googleDocsInputRef = useRef<HTMLInputElement>(null);
  const emit = useQueryEmit();

  const markdownFileRef = useRef<() => void>(null);
  const htmlFileRef = useRef<() => void>(null);
  const notionFileRef = useRef<() => void>(null);
  const confluenceFileRef = useRef<() => void>(null);
  const zipFileRef = useRef<() => void>(null);

  const canUseConfluence = isCloud() || workspace?.hasLicenseKey;

  useEffect(() => {
    if (showGoogleDocs) {
      googleDocsInputRef.current?.focus();
    }
  }, [showGoogleDocs]);

  const getErrorMessage = (err: any) =>
    err?.response?.data?.message || t("Unable to import this Google Doc. Please check the link and try again.");

  const handleGoogleDocsImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = googleDocsUrl.trim();
    if (!url) {
      googleDocsInputRef.current?.focus();
      return;
    }

    try {
      onClose();
      notifications.show({
        id: "import",
        title: t("Importing Google Doc"),
        message: t("Please don't close this tab."),
        loading: true,
        withCloseButton: false,
        autoClose: false,
      });

      const importTask = await importGoogleDoc(url, spaceId);
      notifications.update({
        id: "import",
        title: t("Importing pages"),
        message: t("Page import is in progress. You can check back later if this takes longer."),
        loading: true,
        withCloseButton: true,
        autoClose: false,
      });
      setFileTaskId(importTask.id);
      setGoogleDocsUrl("");
    } catch (err) {
      notifications.update({
        id: "import",
        color: "red",
        title: t("Failed to import Google Doc"),
        message: getErrorMessage(err),
        icon: <IconX size={18} />,
        loading: false,
        withCloseButton: true,
        autoClose: false,
      });
    }
  };

  const handleZipUpload = async (selectedFile: File, source: string) => {
    if (!selectedFile) {
      return;
    }

    try {
      onClose();

      notifications.show({
        id: "import",
        title: t("Uploading import file"),
        message: t("Please don't close this tab."),
        loading: true,
        withCloseButton: false,
        autoClose: false,
      });

      const importTask = await importZip(selectedFile, spaceId, source);
      notifications.update({
        id: "import",
        title: t("Importing pages"),
        message: t(
          "Page import is in progress. You can check back later if this takes longer.",
        ),
        loading: true,
        withCloseButton: true,
        autoClose: false,
      });

      setFileTaskId(importTask.id);

      // Reset file input after successful upload
      if (source === "notion" && notionFileRef.current) {
        notionFileRef.current();
      } else if (source === "confluence" && confluenceFileRef.current) {
        confluenceFileRef.current();
      } else if (source === "generic" && zipFileRef.current) {
        zipFileRef.current();
      }
    } catch (err) {
      console.log("Failed to upload import file", err);
      notifications.update({
        id: "import",
        color: "red",
        title: t("Failed to upload import file"),
        message: err?.response.data.message,
        icon: <IconX size={18} />,
        loading: false,
        withCloseButton: true,
        autoClose: false,
      });
    }
  };

  useEffect(() => {
    if (!fileTaskId) return;

    const intervalId = setInterval(async () => {
      try {
        const fileTask = await getFileTaskById(fileTaskId);
        const status = fileTask.status;

        if (status === "success") {
          notifications.update({
            id: "import",
            color: "teal",
            title: t("Import complete"),
            message: t("Your pages were successfully imported."),
            icon: <IconCheck size={18} />,
            loading: false,
            withCloseButton: true,
            autoClose: false,
          });
          clearInterval(intervalId);
          setFileTaskId(null);

          await queryClient.refetchQueries({
            queryKey: ["root-sidebar-pages", fileTask.spaceId],
          });

          setTimeout(() => {
            emit({
              operation: "refetchRootTreeNodeEvent",
              spaceId: spaceId,
            });
          }, 50);
        }

        if (status === "failed") {
          notifications.update({
            id: "import",
            color: "red",
            title: t("Page import failed"),
            message: t(
              "Something went wrong while importing pages: {{reason}}.",
              {
                reason: fileTask.errorMessage,
              },
            ),
            icon: <IconX size={18} />,
            loading: false,
            withCloseButton: true,
            autoClose: false,
          });
          clearInterval(intervalId);
          setFileTaskId(null);
          console.error(fileTask.errorMessage);
        }
      } catch (err) {
        notifications.update({
          id: "import",
          color: "red",
          title: t("Import failed"),
          message: t(
            "Something went wrong while importing pages: {{reason}}.",
            {
              reason: err.response?.data.message,
            },
          ),
          icon: <IconX size={18} />,
          loading: false,
          withCloseButton: true,
          autoClose: false,
        });
        clearInterval(intervalId);
        setFileTaskId(null);
        console.error("Failed to fetch import status", err);
      }
    }, 3000);
  }, [fileTaskId]);

  const handleFileUpload = async (selectedFiles: File[]) => {
    if (!selectedFiles) {
      return;
    }

    onClose();

    const alert = notifications.show({
      title: t("Importing pages"),
      message: t("Page import is in progress. Please do not close this tab."),
      loading: true,
      autoClose: false,
    });

    const pages: IPage[] = [];
    let pageCount = 0;

    for (const file of selectedFiles) {
      try {
        const page = await importPage(file, spaceId);
        pages.push(page);
        pageCount += 1;
      } catch (err) {
        console.log("Failed to import page", err);
      }
    }

    if (pages?.length > 0 && pageCount > 0) {
      const newTreeNodes = buildTree(pages);
      const fullTree = treeData.concat(newTreeNodes);

      if (newTreeNodes?.length && fullTree?.length > 0) {
        setTreeData(fullTree);
      }

      // Reset file inputs after successful upload
      if (markdownFileRef.current) markdownFileRef.current();
      if (htmlFileRef.current) htmlFileRef.current();

      const pageCountText =
        pageCount === 1 ? `1 ${t("page")}` : `${pageCount} ${t("pages")}`;

      notifications.update({
        id: alert,
        color: "teal",
        title: `${t("Successfully imported")} ${pageCountText}`,
        message: t("Your import is complete."),
        icon: <IconCheck size={18} />,
        loading: false,
        autoClose: 5000,
      });
    } else {
      notifications.update({
        id: alert,
        color: "red",
        title: t("Failed to import pages"),
        message: t("Unable to import pages. Please try again."),
        icon: <IconX size={18} />,
        loading: false,
        autoClose: 5000,
      });
    }
  };

  // @ts-ignore
  return (
    <>
      <SimpleGrid cols={2}>
        <FileButton onChange={handleFileUpload} accept=".md" multiple resetRef={markdownFileRef}>
          {(props) => (
            <Button
              justify="start"
              variant="default"
              leftSection={<IconMarkdown size={18} />}
              {...props}
            >
              Markdown
            </Button>
          )}
        </FileButton>

        <FileButton onChange={handleFileUpload} accept="text/html" multiple resetRef={htmlFileRef}>
          {(props) => (
            <Button
              justify="start"
              variant="default"
              leftSection={<IconFileCode size={18} />}
              {...props}
            >
              HTML
            </Button>
          )}
        </FileButton>

        <FileButton
          onChange={(file) => handleZipUpload(file, "notion")}
          accept="application/zip"
          resetRef={notionFileRef}
        >
          {(props) => (
            <Button
              justify="start"
              variant="default"
              leftSection={<IconBrandNotion size={18} />}
              {...props}
            >
              Notion
            </Button>
          )}
        </FileButton>
        <FileButton
          onChange={(file) => handleZipUpload(file, "confluence")}
          accept="application/zip"
          resetRef={confluenceFileRef}
        >
          {(props) => (
            <Tooltip
              label={t("Available in enterprise edition")}
              disabled={canUseConfluence}
            >
              <Button
                disabled={!canUseConfluence}
                justify="start"
                variant="default"
                leftSection={<ConfluenceIcon size={18} />}
                {...props}
              >
                Confluence
              </Button>
            </Tooltip>
          )}
        </FileButton>

        <Button
          justify="start"
          variant="default"
          leftSection={<IconBrandGoogle size={18} />}
          onClick={() => setShowGoogleDocs(true)}
        >
          Google Docs
        </Button>
      </SimpleGrid>

      <Group justify="center" gap="xl" mih={150}>
        {showGoogleDocs ? (
          <div style={{ width: "100%" }}>
            <Text ta="center" size="lg" inline>
              Import from Google Docs
            </Text>
            <Text ta="center" size="sm" c="dimmed" inline py="sm">
              {t("Imports a static copy with images. It is not synchronized and only works for documents accessible without Google sign-in.")}
            </Text>
            <form onSubmit={handleGoogleDocsImport}>
              <Group align="end" wrap="nowrap">
                <TextInput
                  ref={googleDocsInputRef}
                  label={t("Public Google Docs link")}
                  placeholder="https://docs.google.com/document/d/..."
                  type="url"
                  value={googleDocsUrl}
                  onChange={(event) => setGoogleDocsUrl(event.currentTarget.value)}
                  style={{ flex: 1 }}
                  required
                />
                <Button type="submit">{t("Import")}</Button>
              </Group>
            </form>
          </div>
        ) : <div>
          <Text ta="center" size="lg" inline>
            Import zip file
          </Text>
          <Text ta="center" size="sm" c="dimmed" inline py="sm">
            {t(
              `Upload zip file containing Markdown and HTML files. Max: {{sizeLimit}}`,
              {
                sizeLimit: formatBytes(getFileImportSizeLimit()),
              },
            )}
          </Text>
          <FileButton
            onChange={(file) => handleZipUpload(file, "generic")}
            accept="application/zip"
            resetRef={zipFileRef}
          >
            {(props) => (
              <Group justify="center">
                <Button
                  justify="center"
                  leftSection={<IconFileTypeZip size={18} />}
                  {...props}
                >
                  {t("Upload file")}
                </Button>
              </Group>
            )}
          </FileButton>
        </div>}
      </Group>
    </>
  );
}
