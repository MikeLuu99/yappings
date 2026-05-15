# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static personal blog ("yappings") — no build step, no framework, no package manager. All pages are plain HTML files served directly. The site is deployed via GitHub Pages (see `CNAME`).

## Adding a new blog post

1. **Create the blog HTML file** at `blogs/<slug>.html`. Use an existing post as a template — the structure is:
   ```html
   <!doctype html>
   <html lang="en">
       <head>
           <meta charset="UTF-8" />
           <meta name="viewport" content="width=device-width, initial-scale=1.0" />
           <meta name="description" content="Short description shown on the homepage.">
           <title>Post Title</title>
           <link rel="icon" href="../favicon.svg">
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

2. **Run the build script** to regenerate `index.html`:
   ```bash
   node build.js
   ```

   The script scans `blogs/`, reads each post's `<title>`, `Published:` date, and `<meta name="description">`, sorts by date descending, and rewrites the `<ul class="posts">` block in `index.html`. If `<meta name="description">` is missing, it falls back to the first `<p>` in `<main>`.

## Architecture

- `index.html` — homepage; manually maintained list of all posts (reverse chronological)
- `blogs/*.html` — individual blog post pages; self-contained static HTML
- `styles.css` — single stylesheet shared by all pages; blog pages reference it as `../styles.css`
- `shared.js` — client-side JS that auto-initializes on `DOMContentLoaded`: injects favicon and a back-button (`<`) into blog pages based on `window.location.pathname`
- `templates/` — HTML partials (`head.html`, `blog-header.html`) with `{{PLACEHOLDER}}` syntax, processed by `build.js`
- `build.js` — Node.js build script; scans `blogs/`, extracts metadata from each post, and regenerates the `<ul class="posts">` list in `index.html`. Run with `node build.js` after adding a new post.

`shared.js` is not loaded by any page and can be ignored.

## Writing a post in Markdown

Use the `md-to-html` Rust tool to convert a Markdown file to a blog post HTML file.

**Front matter** (required fields at the top of the `.md` file):
```
---
title: My Post Title
date: 2025-05-15
description: One-sentence teaser shown on the homepage.
slug: my-post-title        # optional — defaults to the filename
---
```

**Build and run:**
```bash
cd md-to-html
cargo build --release

# Write to blogs/
./target/release/md-to-html my-post.md ../blogs

# Or preview on stdout
./target/release/md-to-html my-post.md
```

Then run `node build.js` from the project root to update `index.html`.

Supports: headings, paragraphs, bold/italic, links, images, lists, code blocks (with language), blockquotes, tables, strikethrough, task lists.

## Previewing locally

Open `index.html` directly in a browser, or serve with any static file server:

```bash
npx serve .
# or
python3 -m http.server
```
