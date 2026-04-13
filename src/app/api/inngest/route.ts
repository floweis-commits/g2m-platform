import { serve } from "inngest/next"

import { inngest } from "@/lib/inngest/client"
import { scoringBatch, enrichmentRunColumn, exportCrmSync } from "@/inngest/functions"
import {
  workflowTrigger,
  workflowExecute,
  outreachSendEmail,
  outreachLinkedInMessage,
  outreachLinkedInConnect,
  crmSyncActivity,
  engagementTrack,
} from "@/inngest/workflow-functions"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Phase 2
    scoringBatch,
    enrichmentRunColumn,
    exportCrmSync,
    // Phase 3
    workflowTrigger,
    workflowExecute,
    outreachSendEmail,
    outreachLinkedInMessage,
    outreachLinkedInConnect,
    crmSyncActivity,
    engagementTrack,
  ],
})
