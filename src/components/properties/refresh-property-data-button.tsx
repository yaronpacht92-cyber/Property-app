"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { refreshPropertyDataAction } from "@/server/actions/property-refresh";
import { formatDate } from "@/lib/utils";

export function RefreshPropertyDataButton({ propertyId }: { propertyId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    tone: "success" | "warning" | "danger" | "info";
    title: string;
    body: string;
  } | null>(null);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="large"
        className="min-w-[16rem]"
        disabled={pending}
        aria-busy={pending}
        onClick={() => {
          setResult(null);
          startTransition(async () => {
            const response = await refreshPropertyDataAction(propertyId);
            if (response.error) {
              setResult({
                tone: "danger",
                title: "Refresh did not finish",
                body: response.error,
              });
              return;
            }
            const when = response.refreshedAt
              ? formatDate(response.refreshedAt)
              : "just now";
            const fields =
              response.fieldsUpdated && response.fieldsUpdated.length
                ? response.fieldsUpdated.join(", ")
                : "No newer fields";
            setResult({
              tone: response.status === "FAILED" ? "warning" : "success",
              title:
                response.status === "FAILED"
                  ? "We could not refresh everything"
                  : "Property data refreshed",
              body: `${response.success || ""} Fields: ${fields}. Updated ${when}${
                response.source ? ` · Source: ${response.source}` : ""
              }`,
            });
          });
        }}
      >
        <RefreshCw className={`h-5 w-5 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
        {pending ? "Refreshing property data..." : "Refresh Property Data"}
      </Button>
      {pending ? (
        <p className="text-lg text-[var(--muted-foreground)]" role="status" aria-live="polite">
          Looking up the latest public information. This usually takes a few seconds.
        </p>
      ) : null}
      {result ? (
        <Alert tone={result.tone} title={result.title}>
          {result.body}
        </Alert>
      ) : null}
    </div>
  );
}
