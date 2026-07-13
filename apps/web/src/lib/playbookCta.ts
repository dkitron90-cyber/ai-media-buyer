import type { PlaybookItem } from './apiClient';

export function playbookCtaLabel(item: PlaybookItem): string {
  if (item.type === 'execute_action' && item.isExecutable) return 'Execute';
  if (item.type === 'upload_report') return 'Upload now';
  if (item.type === 'fix_setting') return 'Fix now';
  return 'Review';
}
