export interface CreateReportFromSnapshotCommand {
  sourceSnapshotId: string;
  contentMarkdown: string;
  promptVersion: string;
  sourceRunId?: string;
}
