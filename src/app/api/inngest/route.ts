import { serve } from "inngest/next"

import { inngest } from "@/lib/inngest/client"
import {
  scoringBatch,
  enrichmentRunColumn,
  exportCrmSync,
} from "@/inngest/functions"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scoringBatch, enrichmentRunColumn, exportCrmSync],
})
