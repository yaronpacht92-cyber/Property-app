import "dotenv/config";
import { runWeeklyPropertyDataRefresh } from "../src/jobs/weekly-property-refresh";

runWeeklyPropertyDataRefresh()
  .then((summary) => {
    console.log(
      `Weekly refresh complete. Processed ${summary.processed}, succeeded ${summary.succeeded}, failed ${summary.failed}.`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("weekly_refresh_script_failed", error instanceof Error ? error.name : "unknown");
    process.exit(1);
  });
