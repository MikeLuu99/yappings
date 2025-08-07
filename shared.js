// Shared components and utilities for the blog
const BlogComponents = {
    // Inject favicon and common head elements
    injectHeadElements: function(isSubdirectory = false) {
        const head = document.head;
        const faviconPath = isSubdirectory ? '../favicon.ico' : 'favicon.ico';
        const stylesPath = isSubdirectory ? '../styles.css' : 'styles.css';
        
        // Add favicon if not already present
        if (!document.querySelector('link[rel="icon"]')) {
            const faviconLink = document.createElement('link');
            faviconLink.rel = 'icon';
            faviconLink.type = 'image/x-icon';
            faviconLink.href = faviconPath;
            head.appendChild(faviconLink);
        }
    },
    
    // Inject back button for blog pages
    injectBackButton: function() {
        const header = document.querySelector('article header');
        if (header && !header.querySelector('.back-button')) {
            const backButton = document.createElement('a');
            backButton.href = '../index.html';
            backButton.className = 'back-button';
            backButton.innerHTML = '&lt;';
            header.insertBefore(backButton, header.firstChild);
        }
    },
    
    // Initialize all shared components for blog pages
    initBlogPage: function() {
        this.injectHeadElements(true);
        this.injectBackButton();
    },
    
    // Initialize shared components for main page
    initMainPage: function() {
        this.injectHeadElements(false);
    }
};

// Auto-initialize based on page location
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're in a subdirectory (blog page)
    if (window.location.pathname.includes('/blogs/')) {
        BlogComponents.initBlogPage();
    } else {
        BlogComponents.initMainPage();
    }
});