import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { extractPropertyFromDocumentAction } from "@/server/actions/property-document-import";
import type { ExtractedPropertyFields } from "@/lib/document-property-extract";

type Props = {
  onApply: (fields: ExtractedPropertyFields) => void;
};

export function PropertyDocumentImport({ onApply }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    setError(null);
    setMessage(null);
    setWarnings([]);

    startTransition(async () => {
      const response = await extractPropertyFromDocumentAction(formData);
      if (response.error) {
        setError(response.error);
        return;
      }
      const result = response.result;
      if (!result) {
        setError("We could not read that document.");
        return;
      }
      onApply(result.fields);
      setWarnings(result.warnings);
      setMessage(
        result.filledCount
          ? `Filled ${result.filledCount} field${result.filledCount === 1 ? "" : "s"} from “${file.name}”. Please review them.`
          : `Read “${file.name}”, but no familiar fields matched. Fill the form by hand.`,
      );
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
      <h2 className="text-xl font-semibold">Import from a document</h2>
      <p className="mt-2 text-base text-[var(--muted-foreground)]">
        Upload a closing statement, tax bill, lease, insurance page, or a clear scan. Pachtfolio
        reads the file on this server and suggests fields — it does not scrape Zillow or Redfin.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,text/plain"
        className="sr-only"
        onChange={onFileChange}
        disabled={pending}
      />
      <div className="mt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Reading document..." : "Upload document or scan"}
        </Button>
      </div>
      {pending ? (
        <p className="mt-3 text-base text-[var(--muted-foreground)]">
          Scans can take a little while to read. Please keep this page open.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-base text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="mt-3 text-base text-[var(--success)]">{message}</p> : null}
      {warnings.map((warning) => (
        <p key={warning} className="mt-2 text-base text-[var(--muted-foreground)]">
          {warning}
        </p>
      ))}
    </div>
  );
}
