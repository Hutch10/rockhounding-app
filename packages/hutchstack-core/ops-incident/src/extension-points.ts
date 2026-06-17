export interface DomainRunbook {
  domainId: string;
  runbookUrl: string;
  syncPathDescription?: string;
}

export interface IncidentExporter {
  toMarkdown(record: unknown): string;
}
