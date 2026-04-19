

export const getEditorScript = () => `
  <script>
    let isResizing = false;

    function addResizeHandle(element) {
      const existing = document.getElementById('dv-resize-handle');
      if (existing) existing.remove();
      const existingH = document.getElementById('dv-height-handle');
      if (existingH) existingH.remove();

      let startX, startY, startWidth, startHeight;

      const handle = document.createElement('div');
      handle.id = 'dv-resize-handle';
      handle.style.cssText = \`
        position: absolute;
        width: 10px;
        height: 10px;
        background: #3b82f6;
        bottom: -5px;
        right: -5px;
        cursor: se-resize;
        border-radius: 2px;
        z-index: 9999;
      \`;

      handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.offsetWidth;
        startHeight = element.offsetHeight;
        e.stopPropagation();
        e.preventDefault();
      });

      const heightHandle = document.createElement('div');
      heightHandle.id = 'dv-height-handle';
      heightHandle.style.cssText = \`
        position: absolute;
        width: 10px;
        height: 10px;
        background: #10b981;
        bottom: -5px;
        left: 50%;
        cursor: s-resize;
        border-radius: 2px;
        z-index: 9999;
      \`;

      heightHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = element.offsetHeight;
        e.stopPropagation();
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        if (startX !== undefined) {
          const diffX = e.clientX - startX;
          const diffY = e.clientY - startY;
          element.style.width = (startWidth + diffX) + 'px';
          element.style.height = (startHeight + diffY) + 'px';
        } else {
          const diffY = e.clientY - startY;
          element.style.height = (startHeight + diffY) + 'px';
        }
      });

      document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        window.parent.postMessage({
          type: 'element-resized',
          id: element.id,
          tagName: element.tagName.toLowerCase(),
          classes: element.className,
          width: element.offsetWidth,
          height: element.offsetHeight
        }, '*');
        startX = undefined;
        startY = undefined;
      });

      element.style.position = 'relative';
      element.appendChild(handle);
      element.appendChild(heightHandle);
    }

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      window.parent.postMessage({ type: 'contextmenu', x: e.pageX, y: e.pageY }, '*');
    });

    document.addEventListener('DOMContentLoaded', () => {
      document.body.addEventListener('mouseover', (e) => {
        if (e.target === document.body) return;
        e.target.style.outline = '2px solid #3b82f6';
      });

      document.body.addEventListener('mouseout', (e) => {
        if (e.target === document.body) return;
        if (e.target.id !== 'dv-resize-handle' && e.target.id !== 'dv-height-handle') {
          e.target.style.outline = '';
        }
      });

      document.body.addEventListener('click', (e) => {
        if (e.target === document.body) return;
        if (e.target.id === 'dv-resize-handle') return;
        if (e.target.id === 'dv-height-handle') return;
        e.stopPropagation();
        addResizeHandle(e.target);
        window.parent.postMessage({
          type: 'element-selected',
          tagName: e.target.tagName.toLowerCase(),
          classes: e.target.className,
          id: e.target.id
        }, '*');
      });
    });
  <\/script>
`;

export const generatePreviewDocument = (code: string): string => `
  <html>
    <head>
      <script src="https://cdn.tailwindcss.com"><\/script>
      ${getEditorScript()}
    </head>
    <body>
      ${code}
    </body>
  </html>
`;