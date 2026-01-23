export const colourOptions = [
  { value: "red", label: "Red", defaultShade: 500, textContrast: "white" },
  {
    value: "orange",
    label: "Orange",
    defaultShade: 500,
    textContrast: "white",
  },
  { value: "amber", label: "Amber", defaultShade: 500, textContrast: "black" },
  {
    value: "yellow",
    label: "Yellow",
    defaultShade: 500,
    textContrast: "black",
  },
  { value: "lime", label: "Lime", defaultShade: 500, textContrast: "black" },
  { value: "green", label: "Green", defaultShade: 500, textContrast: "white" },
  {
    value: "emerald",
    label: "Emerald",
    defaultShade: 500,
    textContrast: "white",
  },
  { value: "teal", label: "Teal", defaultShade: 500, textContrast: "white" },
  { value: "cyan", label: "Cyan", defaultShade: 500, textContrast: "black" },
  { value: "sky", label: "Sky", defaultShade: 500, textContrast: "black" },
  { value: "blue", label: "Blue", defaultShade: 500, textContrast: "white" },
  {
    value: "indigo",
    label: "Indigo",
    defaultShade: 500,
    textContrast: "white",
  },
  {
    value: "violet",
    label: "Violet",
    defaultShade: 500,
    textContrast: "white",
  },
  {
    value: "purple",
    label: "Purple",
    defaultShade: 500,
    textContrast: "white",
  },
  {
    value: "fuchsia",
    label: "Fuchsia",
    defaultShade: 500,
    textContrast: "white",
  },
  { value: "pink", label: "Pink", defaultShade: 500, textContrast: "white" },
  { value: "rose", label: "Rose", defaultShade: 500, textContrast: "white" },
  { value: "slate", label: "Slate", defaultShade: 500, textContrast: "white" },
  { value: "gray", label: "Gray", defaultShade: 500, textContrast: "white" },
  { value: "zinc", label: "Zinc", defaultShade: 500, textContrast: "white" },
  {
    value: "neutral",
    label: "Neutral",
    defaultShade: 500,
    textContrast: "white",
  },
  { value: "stone", label: "Stone", defaultShade: 500, textContrast: "white" },
];

export const hardValues = ["bg", "text", "border"];

hardValues.forEach((prefix) => {
  colourOptions.forEach((color) => {
    const className = `${prefix}-${color.value}-${color.defaultShade}`;
    console.log(prefix, color.label, className);
  });
});

export const incrementalValues = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 24, 28,
  32, 36, 40, 48, 56, 64, 72, 80,
];

export const positionalValues = [
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "gap",
  "gap-x",
  "gap-y",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "inset-x",
  "inset-y",
];

positionalValues.forEach(prefix => {
    incrementalValues.forEach(value => {
        const className = `${prefix}-${value}`;
        console.log(className);
    })
})

export const baseElements =
[
  { value: "div", label: "Div", defaultClass: "block" },
  { value: "span", label: "Span", defaultClass: "inline" },
  { value: "button", label: "Button", defaultClass: "px-4 py-2 bg-blue-500 text-white rounded" },
  { value: "input", label: "Input", defaultClass: "border px-2 py-1 rounded" },
  { value: "textarea", label: "Textarea", defaultClass: "border p-2 rounded" },
  { value: "img", label: "Image", defaultClass: "w-auto h-auto" },
  { value: "ul", label: "Unordered List", defaultClass: "list-disc pl-4" },
  { value: "ol", label: "Ordered List", defaultClass: "list-decimal pl-4" },
  { value: "li", label: "List Item", defaultClass: "mb-1" },
]


export type TailwindState = { [prefix: string]: string };

export type ElementNode = {
    id: string;
    type: string;
    classState: TailwindState;
    content?: string;
}