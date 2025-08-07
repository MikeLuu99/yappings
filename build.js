#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Template processor
class TemplateProcessor {
    constructor() {
        this.templatesDir = './templates';
        this.headTemplate = this.loadTemplate('head.html');
        this.blogHeaderTemplate = this.loadTemplate('blog-header.html');
    }
    
    loadTemplate(filename) {
        return fs.readFileSync(path.join(this.templatesDir, filename), 'utf8');
    }
    
    processTemplate(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            result = result.replace(new RegExp(placeholder, 'g'), value);
        }
        return result;
    }
    
    generateBlogPage(config) {
        const head = this.processTemplate(this.headTemplate, {
            TITLE: config.title,
            FAVICON_PATH: '../favicon.ico',
            STYLES_PATH: '../styles.css'
        });
        
        const header = this.processTemplate(this.blogHeaderTemplate, {
            BLOG_TITLE: config.title,
            PUBLISH_DATE: config.publishDate
        });
        
        return `<!doctype html>
<html lang="en">
${head}
    <body>
        <article>
${header}
            <main>
${config.content}
            </main>
        </article>
    </body>
</html>`;
    }
    
    generateMainPage(config) {
        const head = this.processTemplate(this.headTemplate, {
            TITLE: config.title,
            FAVICON_PATH: 'favicon.ico',
            STYLES_PATH: 'styles.css'
        });
        
        return `<!doctype html>
<html lang="en">
${head}
    <body>
${config.content}
    </body>
</html>`;
    }
}

// Usage example (you can call this programmatically)
if (require.main === module) {
    const processor = new TemplateProcessor();
    console.log('Template processor ready. Use processor.generateBlogPage(config) or processor.generateMainPage(config)');
}

module.exports = TemplateProcessor;