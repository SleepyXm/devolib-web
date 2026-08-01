# Devolib UI

The shared, editable interface layer.

- `content.ts` owns brand copy, navigation, product text, and demo readouts.
- `styles.ts` owns reusable Tailwind compositions.
- `tokens.ts` owns the small semantic colour API.
- `components/Primitives.tsx` owns callable buttons, panels, labels, and headers.
- `components/ProductPreview.tsx` owns the reusable LIDE workspace preview.

Routes compose these exports. They should not grow their own design systems.
