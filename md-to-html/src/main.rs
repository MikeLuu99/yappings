use pulldown_cmark::{html, Options, Parser};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

/// Parse YAML-style front matter between `---` delimiters.
/// Returns (fields, remaining markdown body).
fn parse_front_matter(content: &str) -> (HashMap<String, String>, &str) {
    let Some(rest) = content.strip_prefix("---\n") else {
        return (HashMap::new(), content);
    };
    let Some(end) = rest.find("\n---") else {
        return (HashMap::new(), content);
    };

    let mut fields = HashMap::new();
    for line in rest[..end].lines() {
        if let Some((key, value)) = line.split_once(':') {
            fields.insert(key.trim().to_owned(), value.trim().to_owned());
        }
    }

    let body = rest[end + 4..].trim_start_matches('\n');
    (fields, body)
}

/// Convert a string into a URL-friendly slug.
fn slugify(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|p| !p.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// Escape a string for use inside an HTML attribute value (double-quoted).
fn attr_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Escape a string for use in HTML text content.
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn convert_markdown(markdown: &str) -> String {
    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_FOOTNOTES);
    opts.insert(Options::ENABLE_TASKLISTS);

    let parser = Parser::new_ext(markdown, opts);
    let mut output = String::new();
    html::push_html(&mut output, parser);
    output
}

fn render_blog(title: &str, date: &str, description: &str, body_html: &str) -> String {
    format!(
        r#"<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="{description}">
        <title>{title}</title>
        <link rel="icon" href="../favicon.svg">
        <link rel="stylesheet" href="../styles.css" />
    </head>
    <body>
        <article>
            <header>
                <a href="../index.html" class="back-button">&lt;</a>
                <h1>{title}</h1>
                <div class="meta">Published: {date}</div>
            </header>
            <main>
{body_html}
            </main>
        </article>
    </body>
</html>
"#,
        title = html_escape(title),
        date = date,
        description = attr_escape(description),
        body_html = body_html.trim_end(),
    )
}

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: md-to-html <input.md> [output-dir]");
        eprintln!();
        eprintln!("Converts a Markdown file to a blog post HTML file.");
        eprintln!("Front matter fields: title, date (YYYY-MM-DD), description, slug");
        eprintln!();
        eprintln!("If output-dir is given, writes to <output-dir>/<slug>.html.");
        eprintln!("Otherwise prints to stdout.");
        std::process::exit(1);
    }

    let input_path = Path::new(&args[1]);
    let raw = fs::read_to_string(input_path)
        .unwrap_or_else(|e| { eprintln!("Error reading {}: {e}", input_path.display()); std::process::exit(1); });

    let (fields, body) = parse_front_matter(&raw);

    let title = fields.get("title").map(String::as_str).unwrap_or("Untitled");
    let date  = fields.get("date").map(String::as_str).unwrap_or("1970-01-01");
    let description = fields.get("description").map(String::as_str).unwrap_or("");
    let slug  = fields.get("slug").cloned().unwrap_or_else(|| {
        input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .map(slugify)
            .unwrap_or_else(|| "post".to_owned())
    });

    let body_html = convert_markdown(body);
    let html = render_blog(title, date, description, &body_html);

    if args.len() >= 3 {
        let out_path: PathBuf = [&args[2], &format!("{slug}.html")].iter().collect();
        fs::write(&out_path, &html)
            .unwrap_or_else(|e| { eprintln!("Error writing {}: {e}", out_path.display()); std::process::exit(1); });
        println!("Written: {}", out_path.display());
    } else {
        print!("{html}");
    }
}
