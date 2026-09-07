"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  removePropertyPhotoAction,
  uploadPropertyPhotoAction,
} from "@/server/actions/documents";
import {
  isAllowedPropertyPhoto,
  isHeicMimeOrName,
  MAX_PROPERTY_PHOTO_BYTES,
  propertyPhotoAcceptAttribute,
} from "@/lib/property-photo";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLimited, setPreviewLimited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // After a successful save, the server refreshes currentPhotoUrl — clear local preview.
  useEffect(() => {
    if (currentPhotoUrl && !selectedFile) {
      setMessage((prev) => prev);
    }
  }, [currentPhotoUrl, selectedFile]);

  const displayUrl = previewUrl || currentPhotoUrl;
  const hasSavedPhoto = Boolean(currentPhotoUrl) && !selectedFile;

  function openPicker() {
    if (!canUpload || pending) return;
    inputRef.current?.click();
  }

  function clearLocalSelection() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewLimited(false);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!isAllowedPropertyPhoto(file.type, file.name)) {
      setError("Please choose a JPG, JPEG, PNG, WebP, or HEIC photo.");
      setMessage(null);
      return;
    }
    if (file.size > MAX_PROPERTY_PHOTO_BYTES) {
      setError("That photo is too large. Please use a file under 10 MB.");
      setMessage(null);
      return;
    }

    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    const localUrl = URL.createObjectURL(file);
    const heic = isHeicMimeOrName(file.type, file.name);
    setSelectedFile(file);
    setPreviewUrl(localUrl);
    setPreviewLimited(heic);
    setError(null);
    setMessage(null);
  }

  function savePhoto() {
    if (!selectedFile || pending) return;
    const formData = new FormData();
    formData.set("file", selectedFile);

    startTransition(async () => {
      const result = await uploadPropertyPhotoAction(propertyId, formData);
      if (result?.error) {
        setError(result.error);
        setMessage(null);
        return;
      }
      clearLocalSelection();
      setError(null);
      setMessage(result?.success || "Property photo saved.");
    });
  }

  function removePhoto() {
    if (pending) return;
    startTransition(async () => {
      if (selectedFile) {
        clearLocalSelection();
        setError(null);
        setMessage("Selection cleared.");
        return;
      }
      const result = await removePropertyPhotoAction(propertyId);
      if (result?.error) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setError(null);
      setMessage(result?.success || "Property photo removed.");
    });
  }

  return (
    <div className="w-full max-w-xs md:w-64">
      <input
        ref={inputRef}
        type="file"
        accept={propertyPhotoAcceptAttribute()}
        className="sr-only"
        onChange={onFileChange}
        disabled={!canUpload || pending}
      />

      <div
        className={`relative h-44 w-full overflow-hidden rounded-2xl border-2 border-dashed ${
          canUpload ? "border-[var(--border-strong)]" : "border-[var(--border)]"
        } ${pending ? "opacity-80" : ""}`}
      >
        {displayUrl && !previewLimited ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={`Photo of ${nickname}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[var(--muted)] px-4 text-center">
            <span className="text-lg font-semibold text-[var(--foreground)]">
              {selectedFile
                ? selectedFile.name
                : canUpload
                  ? "No photo yet"
                  : "No photo yet"}
            </span>
            {previewLimited ? (
              <span className="text-base text-[var(--muted-foreground)]">
                HEIC selected — preview is limited until you save
              </span>
            ) : canUpload && !selectedFile ? (
              <span className="text-base text-[var(--muted-foreground)]">
                Choose a photo from your computer
              </span>
            ) : null}
          </div>
        )}

        {pending ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(28,36,48,0.55)] px-3 text-center text-base font-semibold text-white">
            Uploading photo…
          </div>
        ) : null}
      </div>

      {canUpload ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="small" onClick={openPicker} disabled={pending}>
            {hasSavedPhoto || selectedFile ? "Choose Photo" : "Upload Photo"}
          </Button>
          {selectedFile ? (
            <Button type="button" size="small" variant="secondary" onClick={savePhoto} disabled={pending}>
              Save Photo
            </Button>
          ) : null}
          {selectedFile || currentPhotoUrl ? (
            <Button type="button" size="small" variant="outline" onClick={removePhoto} disabled={pending}>
              {selectedFile ? "Clear" : "Remove Photo"}
            </Button>
          ) : null}
        </div>
      ) : null}

      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        {canUpload
          ? "JPG, JPEG, PNG, WebP, or HEIC · max 10 MB. Preview before saving."
          : "You can view this photo, but uploading requires document permission."}
      </p>
      {error ? (
        <p className="mt-1 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mt-1 text-sm text-[var(--success)]">{message}</p> : null}
    </div>
  );
}
