# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static personal blog ("yappings") — no build step, no framework, no package manager. All pages are plain HTML files served directly. The site is deployed via GitHub Pages (see `CNAME`).

## Adding a new blog post

Two manual steps are required:

1. **Create the blog HTML file** at `blogs/<slug>.html`. Use an existing post as a template — the structure is:
   ```html
   <!doctype html>
   <html lang="en">
       <head>
           <meta charset="UTF-8" />
           <meta name="viewport" content="width=device-width, initial-scale=1.0" />
           <title>Post Title</title>
           <link rel="icon" type="image/x-icon" href="../favicon.ico" />
           <link rel="stylesheet" href="../styles.css" />
       </head>
       <body>
           <article>
               <header>
                   <a href="../index.html" class="back-button">&lt;</a>
                   <h1>Post Title</h1>
                   <div class="meta">Published: YYYY-MM-DD</div>
               </header>
               <main>
                   <!-- content here -->
               </main>
           </article>
       </body>
   </html>
   ```

2. **Add a list entry to `index.html`** inside the `<ul class="posts">` list (newest first):
   ```html
   <li>
       <h2><a href="blogs/<slug>.html">Post Title</a></h2>
       <time>Month DD, YYYY</time>
       <p>Short description</p>
   </li>
   ```

## Architecture

- `index.html` — homepage; manually maintained list of all posts (reverse chronological)
- `blogs/*.html` — individual blog post pages; self-contained static HTML
- `styles.css` — single stylesheet shared by all pages; blog pages reference it as `../styles.css`
- `shared.js` — client-side JS that auto-initializes on `DOMContentLoaded`: injects favicon and a back-button (`<`) into blog pages based on `window.location.pathname`
- `templates/` — HTML partials (`head.html`, `blog-header.html`) with `{{PLACEHOLDER}}` syntax, processed by `build.js`
- `build.js` — Node.js `TemplateProcessor` class (not part of the deploy pipeline; used programmatically if needed to generate pages from templates)

The templates in `templates/` and `build.js` exist as a utility but are **not used by the current static pages** — all existing blog posts are fully self-contained HTML. `shared.js` is also not currently loaded by any page (no `<script>` tag in existing HTML); the back-button and favicon are inlined directly in each blog file.

## Previewing locally

Open `index.html` directly in a browser, or serve with any static file server:

```bash
npx serve .
# or
python3 -m http.server
```
