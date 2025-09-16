Device-Independent Sizing (No hard-coded px)

Rule
- Do not use hard-coded pixel units (px) anywhere in the codebase.
- Prefer device-independent units: rem, em, %, vw, vh, or Tailwind scale utilities.

Linting
- Run `npm run lint:no-px` to scan for violations. It flags:
  - Any `12px`-style literals in CSS/JSX.
  - Tailwind arbitrary values with px (e.g., `w-[400px]`).
  - Inline React styles that use numeric values (numbers default to px in React inline styles).

Recommended Practices
- Typography and spacing: use rem (base 1rem = 16px). Example: `text-[1.125rem]`, `p-4` (Tailwind scale), or `p-[1rem]` when arbitrary is needed.
- Layout sizing: use %, vw, vh, min/max/clamp. Example: `w-[min(90%,600px)]` → prefer `w-[min(90%,37.5rem)]`.
- Tailwind scale: favor built-in sizes (e.g., `w-64` ≈ `16rem`) to keep consistency and avoid arbitrary units.
- Inline styles: avoid numeric values like `style={{ width: 320 }}`. Use strings with unit: `style={{ width: '20rem' }}`.

Notes
- Hairlines/1px borders: prefer semantic classes or rem-based equivalents. If a true hairline is essential, consider using CSS transforms or device pixel ratio techniques. Avoid committing raw `1px` borders.
- Exceptions should be rare; if necessary, document them with a code comment explaining why a px value is unavoidable.

