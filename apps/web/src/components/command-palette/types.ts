export type CommandCategory =
  | 'navigation'
  | 'action'
  | 'contract'
  | 'template'
  | 'client'
  | 'settings';

export interface CommandItem {
  id: string;

  title: string;

  subtitle?: string;

  icon?: React.ReactNode;

  group: string;

  category: CommandCategory;

  keywords?: string[];

  shortcut?: string[];

  action: () => void;
}
