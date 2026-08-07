"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPropertyPhotoAction } from "@/server/actions/documents";

type Props = {
  propertyId: string;
  nickname: string;
  currentPhotoUrl: string | null;
  canUpload: boolean;
};

export function PropertyPhotoUpload({
  propertyId,
  nickname,
  currentPhotoUrl,
  canUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const displayUrl = previewUrl || currentPhotoUrl;

  function openPicker() {
    if (!canUpload || pending) return;
    inputRef.current?.click();
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP photo.");
      setMessage(null);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadPropertyPhotoAction(propertyId, formData);
      if (result?.error) {
        setError(result.error);
        setMessage(null);
        setPreviewUrl(null);
        URL.revokeObjectURL(localUrl);
        return;
      }
      setMessage(result?.success || "Property photo saved.");
      // Keep preview until server refresh replaces currentPhotoUrl.
    });
  }

  return (
    <div className="w-full max-w-xs md:w-64">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onFileChange}
        disabled={!canUpload || pending}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={!canUpload || pending}
        aria-label={
          displayUrl
            ? `Change photo for ${nickname}`
            : `Upload a photo for ${nickname}`
        }
        className={`group relative block h-44 w-full overflow-hidden rounded-2xl border-2 border-dashed text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] ${
          canUpload
            ? "cursor-pointer border-[var(--border-strong)] hover:border-[var(--primary)]"
            : "cursor-default border-[var(--border)]"
        } ${pending ? "opacity-80" : ""}`}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={`Photo of ${nickname}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[var(--muted)] px-4 text-center">
            <span className="text-lg font-semibold text-[var(--foreground)]">
              {canUpload ? "Add property photo" : "No photo yet"}
            </span>
            {canUpload ? (
              <span className="text-base text-[var(--muted-foreground)]">
                Click to upload
              </span>
            ) : null}
          </div>
        )}

        {canUpload ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[rgba(28,36,48,0.55)] px-3 text-center text-base font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            {pending
              ? "Saving photo..."
              : displayUrl
                ? "Click to change photo"
                : "Click to upload photo"}
          </span>
        ) : null}
      </button>

      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        {canUpload
          ? "Hover and click the photo area to upload or change the picture."
          : "You can view this photo, but uploading requires document permission."}
      </p>
      {error ? <p className="mt-1 text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="mt-1 text-sm text-[var(--success)]">{message}</p> : null}
    </div>
  );
}
