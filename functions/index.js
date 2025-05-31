const functions = require('firebase-functions');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Serve static assets from the client build directory
app.use(express.static(path.join(__dirname, '../dist/client')));

// Handle all routes with server-side rendering
app.get('*', (req, res) => {
  try {
    // Path to the server entry point
    const serverEntryPath = path.join(__dirname, '../dist/server/index.js');
    
    // Check if the server entry file exists
    if (fs.existsSync(serverEntryPath)) {
      // Import the server entry dynamically
      import(serverEntryPath).then(({ default: handler }) => {
        // Call the server handler with the request and response
        handler(req, res);
      }).catch(error => {
        console.error('Error importing server entry:', error);
        res.status(500).send('Internal Server Error');
      });
    } else {
      // If server entry doesn't exist, serve the client-side app as fallback
      const indexHtml = path.join(__dirname, '../dist/client/index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Not Found');
      }
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Export the Express app as a Firebase Function
exports.ssr = functions.https.onRequest(app);
