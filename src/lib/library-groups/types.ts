export type GroupList = { id: string; url: string };
export type LibraryGroup = {
  id: string;
  name: string;
  cover?: string;
  lists: GroupList[];
};

export const MAX_GROUPS = 24;
export const MAX_LISTS_PER_GROUP = 12;
