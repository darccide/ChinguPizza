// Server tasks

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

// Instantiate the server module object
const server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer(function(req, res) {
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res) {
  server.unifiedServer(req, res);
});

// All the server logic for both the http and https server
server.unifiedServer = function(req, res) {
  // Get and parse URL
  let parsedUrl = url.parse(req.url, true);

  // Get path
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g,'');

  // Get query string as object
  let queryStringObject = parsedUrl.query;

  // Get HTTP method
  let method = req.method.toLowerCase();

  // Get the headers as object
  let headers = req.headers;

  // Get payload, if any
  let decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', function(data) {
    buffer += decoder.write(data);
  });
  req.on('end', function() {
    buffer += decoder.end();

    // Choose the handler the request should go to,
    // If one is not found use notFound handler
    let chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined'
    ? server.router[trimmedPath] : handlers.notFound;

    // If the request is within the public directory use to the public handler instead
    chosenHandler = trimmedPath.indexOf('public/') > -1
    ? handlers.public : chosenHandler;

    // Construct the data object to send to the handler
    let data = {
      'trimmedPath': trimmedPath,
      'queryStringObject': queryStringObject,
      'method': method,
      'headers': headers,
      'payload': helpers.parseJsonToObject(buffer)
    };

    // Route request to the handler specified in the router
    chosenHandler(data, function(statusCode, payload, contentType) {

      // Determine the type of response (fallback to JSON)
      contentType = typeof(contentType) == 'string' ? contentType : 'json';

      // Use the status code called back by the handler, or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      // Return the response parts that are content-type specific
         var payloadString = '';
         if(contentType == 'json') {
           res.setHeader('Content-Type', 'application/json');
           payload = typeof(payload) == 'object' ? payload : {};
           payloadString = JSON.stringify(payload);
         }

         if(contentType == 'html') {
           res.setHeader('Content-Type', 'text/html');
           payloadString = typeof(payload) == 'string'? payload : '';
         }

         if(contentType == 'favicon') {
           res.setHeader('Content-Type', 'image/x-icon');
           payloadString = typeof(payload) !== 'undefined' ? payload : '';
         }

         if(contentType == 'plain') {
           res.setHeader('Content-Type', 'text/plain');
           payloadString = typeof(payload) !== 'undefined' ? payload : '';
         }

         if(contentType == 'css') {
           res.setHeader('Content-Type', 'text/css');
           payloadString = typeof(payload) !== 'undefined' ? payload : '';
         }

         if(contentType == 'png') {
           res.setHeader('Content-Type', 'image/png');
           payloadString = typeof(payload) !== 'undefined' ? payload : '';
         }

         if(contentType == 'jpg') {
           res.setHeader('Content-Type', 'image/jpeg');
           payloadString = typeof(payload) !== 'undefined' ? payload : '';
         }

         // Return the response-parts common to all content-types
         res.writeHead(statusCode);
         res.end(payloadString);

         // If the response is 200, print green, otherwise print red
         if(statusCode == 200) {
           debug('\x1b[32m%s\x1b[0m',method.toUpperCase()
            + ' /' + trimmedPath + ' ' + statusCode);
         } else {
           debug('\x1b[31m%s\x1b[0m',method.toUpperCase()
            + ' /' + trimmedPath + ' ' + statusCode);
         }
       });
   });
 };

// Define request router
server.router = {
  '' : handlers.index,
  'account/create' : handlers.accountCreate,
  'account/edit' : handlers.accountEdit,
  'account/deleted' : handlers.accountDeleted,
  'session/create' : handlers.sessionCreate,
  'session/deleted' : handlers.sessionDeleted,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/items': handlers.items,
  'favicon.ico' : handlers.favicon,
  'public' : handlers.public
};

// Init script
server.init = function() {
  // Start HTTP server
  server.httpServer.listen(config.httpPort, function() {
    console.log('\x1b[36m%s\x1b[0m', 'The server is listening on port ' + config.httpPort);
  });

  // Start HTTPS server
  server.httpsServer.listen(config.httpsPort, function() {
    console.log('\x1b[35m%s\x1b[0m', 'The server is listening on port ' + config.httpsPort);
  });
};


// Export the module
module.exports = server;
