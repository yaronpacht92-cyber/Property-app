import { refreshAllPropertiesWeekly } from "@/server/services/property-data-refresh";

/**
 * Idempotent weekly property public-data refresh.
 * Safe to retry. Failures for one property do not stop others.
 */
export async function runWeeklyPropertyDataRefresh() {
  console.info("weekly_property_refresh_started");
  const summary = await refreshAllPropertiesWeekly();
  console.info("weekly_property_refresh_finished", {
    processed: summary.processed,
    succeeded: summary.succeeded,
    failed: summary.failed,
  });
  return summary;
}
