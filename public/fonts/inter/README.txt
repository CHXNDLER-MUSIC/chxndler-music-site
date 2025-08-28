Add Inter .woff2 files here to enable local Inter without network fetches.

Expected filenames:
- Inter-Regular.woff2 (weight 400)
- Inter-Bold.woff2 (weight 700)
- Inter-ExtraBold.woff2 (weight 800)

These map to @font-face rules in app/globals.css under the family name "InterLocal".
If these files are absent, the site falls back to system fonts.
