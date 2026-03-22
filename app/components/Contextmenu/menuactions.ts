type MenuActionCopyFormat = {
  label: string;
  action: "copy" | "format";
};

type MenuActionElement = {
  label: string;
  action: "insert-element";
  payload: { value: string; label: string; defaultClass: string };
};

type MenuActionColor = {
  label: string;
  action: "set-class";
  payload: { prefix: string; color: string; shade: number };
};

export type EditorMenuItem =
  | MenuActionCopyFormat
  | MenuActionElement
  | MenuActionColor;