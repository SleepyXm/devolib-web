type WireframeMenuActionAddPage = {
  label: string;
  action: "add-page";
  section: "pages";
};

type WireframeMenuActionAddEndpoint = {
  label: string;
  action: "add-endpoint";
  section: "endpoints";
};

type WireframeMenuActionAddGroup = {
  label: string;
  action: "add-group";
  section: "groups";
};

export type WireframeMenuItem =
  | WireframeMenuActionAddPage
  | WireframeMenuActionAddEndpoint
  | WireframeMenuActionAddGroup;

export const pagesMenuItems: WireframeMenuItem[] = [
  { label: "Add Page", action: "add-page", section: "pages" },
];

export const endpointsMenuItems: WireframeMenuItem[] = [
  { label: "Add Endpoint", action: "add-endpoint", section: "endpoints" },
];

export const groupsMenuItems: WireframeMenuItem[] = [
  { label: "Add Folder", action: "add-group", section: "groups" },
];