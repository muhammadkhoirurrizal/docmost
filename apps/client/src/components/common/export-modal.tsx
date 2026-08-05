import {
  Modal,
  Button,
  Group,
  Text,
  Select,
  Switch,
  Divider,
  PasswordInput,
} from "@mantine/core";
import { exportPage } from "@/features/page/services/page-service.ts";
import { useRef, useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { ExportFormat } from "@/features/page/types/page.types.ts";
import { notifications } from "@mantine/notifications";
import { exportSpace } from "@/features/space/services/space-service";
import { useTranslation } from "react-i18next";

interface ExportModalProps {
  id: string;
  type: "space" | "page";
  open: boolean;
  onClose: () => void;
}

export default function ExportModal({
  id,
  type,
  open,
  onClose,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>(ExportFormat.Markdown);
  const [includeChildren, setIncludeChildren] = useState<boolean>(false);
  const [includeAttachments, setIncludeAttachments] = useState<boolean>(false);
  const [passwordProtection, setPasswordProtection] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) {
      setPasswordProtection(false);
      setPassword("");
      setPasswordError(null);
    }
  }, [open]);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const isExportingRef = useRef<boolean>(false);

  const handleExport = async () => {
    if (isExportingRef.current) return;

    if (passwordProtection && password.trim().length < 4) {
      setPasswordError(
        t("Password must contain at least 4 non-whitespace characters."),
      );
      passwordInputRef.current?.focus();
      return;
    }

    // Gunakan flushSync untuk memaksa React segera me-render state loading
    // sebelum thread diblokir oleh pemanggilan async.
    flushSync(() => {
      isExportingRef.current = true;
      setIsExporting(true);
    });

    try {
      if (type === "page") {
        await exportPage({
          pageId: id,
          format,
          includeChildren,
          includeAttachments,
          password: passwordProtection ? password : undefined,
        });
      }
      if (type === "space") {
        await exportSpace({
          spaceId: id,
          format,
          includeAttachments,
          password: passwordProtection ? password : undefined,
        });
      }
      onClose();
    } catch (err: any) {
      let msg = err.response?.data?.message || err.message;

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          msg = parsed.message || text;
        } catch {
          msg = "Export failed";
        }
      }

      notifications.show({
        message: "Export failed: " + msg,
        color: "red",
      });
    } finally {
      isExportingRef.current = false;
      setIsExporting(false);
    }
  };

  const handleChange = (format: ExportFormat) => {
    setFormat(format);
  };

  return (
    <Modal.Root
      opened={open}
      onClose={() => {
        if (!isExporting) {
          onClose();
        }
      }}
      size={500}
      padding="xl"
      yOffset="10vh"
      xOffset={0}
      mah={400}
      onClick={(e) => e.stopPropagation()}
    >
      <Modal.Overlay />
      <Modal.Content style={{ overflow: "hidden" }}>
        <Modal.Header py={0}>
          <Modal.Title fw={500}>{t(`Export ${type}`)}</Modal.Title>
          <Modal.CloseButton disabled={isExporting} />
        </Modal.Header>
        <Modal.Body>
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text size="md">{t("Format")}</Text>
            </div>
            <ExportFormatSelection format={format} onChange={handleChange} />
          </Group>

          {type === "page" && (
            <>
              <Divider my="sm" />

              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text size="md">{t("Include subpages")}</Text>
                </div>
                <Switch
                  onChange={(event) =>
                    setIncludeChildren(event.currentTarget.checked)
                  }
                  checked={includeChildren}
                />
              </Group>

              <Group justify="space-between" wrap="nowrap" mt="md">
                <div>
                  <Text size="md">{t("Include attachments")}</Text>
                </div>
                <Switch
                  onChange={(event) =>
                    setIncludeAttachments(event.currentTarget.checked)
                  }
                  checked={includeAttachments}
                />
              </Group>
            </>
          )}

          {type === "space" && (
            <>
              <Divider my="sm" />

              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text size="md">{t("Include attachments")}</Text>
                </div>
                <Switch
                  onChange={(event) =>
                    setIncludeAttachments(event.currentTarget.checked)
                  }
                  checked={includeAttachments}
                />
              </Group>
            </>
          )}

          <Divider my="sm" />

          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text size="md">{t("Password protection")}</Text>
            </div>
            <Switch
              onChange={(event) => {
                setPasswordProtection(event.currentTarget.checked);
                setPasswordError(null);
                if (!event.currentTarget.checked) {
                  setPassword("");
                }
              }}
              checked={passwordProtection}
            />
          </Group>

          {passwordProtection && (
            <>
              <PasswordInput
                placeholder={t("Enter password (4+ characters)")}
                value={password}
                onChange={(event) => {
                  setPassword(event.currentTarget.value);
                  setPasswordError(null);
                }}
                maxLength={128}
                mt="sm"
                ref={passwordInputRef}
                error={passwordError}
              />
              <Text size="xs" c="dimmed" mt={4}>
                {format === ExportFormat.PDF
                  ? t(
                      "Protected PDF downloads are encrypted ZIP archives containing PDF files, not password-encrypted PDFs.",
                    )
                  : t(
                      "Protected downloads are encrypted archives containing your exported files.",
                    )}
              </Text>
            </>
          )}

          <Group justify="center" mt="md">
            <Button onClick={onClose} variant="default" disabled={isExporting}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleExport} loading={isExporting} disabled={isExporting}>
              {t("Export")}
            </Button>
          </Group>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}

interface ExportFormatSelection {
  format: ExportFormat;
  onChange: (value: string) => void;
}
function ExportFormatSelection({ format, onChange }: ExportFormatSelection) {
  const { t } = useTranslation();

  return (
    <Select
      data={[
        { value: "markdown", label: "Markdown" },
        { value: "html", label: "HTML" },
        { value: "pdf", label: "PDF" },
      ]}
      defaultValue={format}
      onChange={onChange}
      styles={{ wrapper: { maxWidth: 120 } }}
      comboboxProps={{ width: "120" }}
      allowDeselect={false}
      withCheckIcon={false}
      aria-label={t("Select export format")}
    />
  );
}
