function getExternContent(filename, placeholder) {
if (location.protocol === 'file:') {
    alert('This page must be loaded via a web server (http:// or https://).');
    document.body.innerHTML = ''; // Clear the content
  } else {
    fetch(filename)
      .then(res => res.text())
      .then(html => {
        // Parse the HTML string into a document
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Get the body content from file2.html
        const bodyContent = doc.body.innerHTML;

        // Inject into placeholder
        placeholder.innerHTML = bodyContent;
      })
      .catch(err => {
        console.error('Error loading ' + filename + ':', err);
        placeholder.textContent = 'Failed to load content.';
      });
    }
}