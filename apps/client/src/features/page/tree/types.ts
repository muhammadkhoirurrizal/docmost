export type SpaceTreeNode = {
  id: string;
  slugId: string;
  name: string;
  icon?: string;
  position: string;
  spaceId: string;
  parentPageId: string;
  archivedAt?: Date;
  hasChildren: boolean;
  children: SpaceTreeNode[];
};
