export interface CreateReportFromSnapshotCommand {
  userId: string;
  sourceSnapshotId: string;
  contentMarkdown: string;
  promptVersion: string;
  sourceRunId?: string;
}
