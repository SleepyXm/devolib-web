"use client";

import { useState } from "react";
import { ElementNode } from "./tailwindstuff";

export const [elements, setElements] = useState<ElementNode[]>([
    { id: "node-1", type: "div", classState: { p: "p-4}", bg: "bg-white" }, content: "Sup bitch ass motherfucker" },
]);

export const serializeElements = (nodes: ElementNode[]) => {
    return nodes
    .map(node => {
        const classes = Object.values(node.classState).join(" ");
        return `<${node.type} class="${classes}">${node.content || ""}</${node.type}>`;
    })
    .join("\n");
};