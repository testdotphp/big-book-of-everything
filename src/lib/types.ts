export interface NavItem {
  slug: string;
  label: string;
  icon: string;
  url: string;
}

export interface NavGroup {
  slug: string;
  label: string;
  icon: string;
  children: NavItem[];
}

export type SidebarItem = NavItem | NavGroup;

export interface PortalConfig {
  name: string;
  icon: string;
  theme: string;
  homepage?: string;
  items: SidebarItem[];
}

export function isNavGroup(item: SidebarItem): item is NavGroup {
  return 'children' in item;
}
