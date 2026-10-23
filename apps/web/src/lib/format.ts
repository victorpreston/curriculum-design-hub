import type { DocumentType } from '@hub/shared';

const dateTimeFormat = new Intl.DateTimeFormat('en-KE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  learning_outcomes: 'learning outcomes',
  scheme_of_work: 'scheme of work',
  assessment: 'assessment',
  teacher_guide: 'teacher guide',
};

export function formatDateTime(isoDate: string): string {
  return dateTimeFormat.format(new Date(isoDate));
}

export function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABEL[type];
}
