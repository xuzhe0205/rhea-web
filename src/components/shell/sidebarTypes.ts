export type Conversation = {
  id: string;
  title: string;
  updatedAt: string; // ISO
  isFavorite?: boolean;
};

export type ProjectFolder = {
  id: string;
  name: string;
  conversations: Conversation[];
  isExpanded?: boolean;
};

export type SidebarModel = {
  inbox: Conversation[]; // conversations not in a folder
  projects: ProjectFolder[]; // folder -> conversations
  favorites: Conversation[]; // quick access (usually subset of above)
};
