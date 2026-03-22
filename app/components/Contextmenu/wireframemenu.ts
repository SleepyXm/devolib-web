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

export type WireframeMenuItem =
  | WireframeMenuActionAddPage
  | WireframeMenuActionAddEndpoint;

export const pagesMenuItems: WireframeMenuItem[] = [
  { label: "Add Page", action: "add-page", section: "pages" },
];

export const endpointsMenuItems: WireframeMenuItem[] = [
  { label: "Add Endpoint", action: "add-endpoint", section: "endpoints" },
];