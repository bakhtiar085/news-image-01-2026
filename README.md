# News Image 01 — local draft

The self-contained `index.html` renders the supplied 1024×1024 original editorial graphic, `entry.png`. `main.ts` uses only Node built-ins to validate that PNG, then copies its identical bytes to the requested output directory.

Run with Node 22 or later:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/news-image-output node main.ts
```

Without `MAKEFUN_OUTPUT_DIR`, the output path is `/output/entry.png`.
