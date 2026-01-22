"use client";

import { useState, useRef } from "react";

export const useContextMenu = () => {
    const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0});
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu({
            show: true,
            x: event.pageX,
            y: event.pageY
        });
    };

    const handleClick = () => {
        if (contextMenu.show) {
            setContextMenu({ ...contextMenu, show: false });
        }
    };

    return {
        contextMenu,
        handleContextMenu,
        handleClick,
        textAreaRef
    };
}