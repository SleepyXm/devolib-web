import { EditorMenuItem } from "./menuactions";
import { baseElements, colourOptions, hardValues } from "@/app/types/tailwindstuff";

const elementMenuItems: EditorMenuItem[] = baseElements.map((el) => ({
  label: `Insert ${el.label}`,
  action: "insert-element",
  payload: el,
}));

const colorMenuItems: EditorMenuItem[] = hardValues.flatMap((prefix) =>
  colourOptions.map((color) => ({
    label: `${prefix}-${color.value}`,
    action: "set-class",
    payload: { prefix, color: color.value, shade: color.defaultShade },
  }))
);

export const editorMenuItems: EditorMenuItem[] = [
  ...elementMenuItems,
  ...colorMenuItems,
];