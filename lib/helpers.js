// Helpers for tasks

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const path = require('path');
const fs = require('fs');

// Helpers Container
const helpers = {};

// Create a SHA256 hash
helpers.hash = function(str) {
  if (typeof(str) == 'string' && str.length >= 6) {
    let hash = crypto.createHmac(
      'sha256',
      config.hashingSecret
    ).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Parse JSON string to object for all cases, without throwing
helpers.parseJsonToObject = function(str) {
  try {
    let obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// Create string of random alphanumeric characters, of given length
helpers.createRandomString = function(strLength) {
  strLength = typeof(strLength) == 'number'
  && strLength > 0
  ? strLength : false;

  if(strLength) {
    // Define all possible character that could go into a string
    let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start final string
    let str = '';
    for (let i = 1; i <= strLength; i++) {
      // Get random character from possibleCharacters string
      let randcomCharacter = possibleCharacters.charAt(
          Math.floor(Math.random() * possibleCharacters.length)
      );
      // Append this character to the final string
      str += randcomCharacter;
    }

    // Return final string
    return str;
  } else {
    return false
  }
};

// Create and make Stripe payment
helpers.stripePayment = function(email, amount, callback) {

  if (email) {
    // Configure request payload
    const payload = {
      amount,
      currency: config.stripe.currency,
      source: config.stripe.source,
      description: config.stripe.description
    };

    // Strigify the payload
    let stringPayload = querystring.stringify(payload);

    // Configure request details
    let requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.stripe.com',
      'method': 'POST',
      'path': '/v1/charges',
      'headers': {
        'Authorization': `Bearer ${config.stripe.secret}`,
        'Content-type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate request object
    let req = https.request(requestDetails, function(res) {
      // Grab status of sent request
      let status = res.statusCode;
      // Callback successfully if request went through
      if (status == 200 || status == 201) {
        callback(false);
      } else {
        callback('Status code returned was ' + status);
      }
    });

    // Bind to error event so it doesn't get thrown
    req.on('error', function(e) {
      callback(e);
    });

    // Add payload
    req.write(stringPayload);

    // End request
    req.end();
  } else {
    callback('Given parameters were missing or invalid');
  }
};

// Send Mailgun email
helpers.sendMailGun = function(email, subject, msg, callback) {

  if (email) {
    // Configure request payload
    const payload = {
      from: config.mailgun.from,
      to: email,
      subject,
      text: msg
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    // Build Basic Auth in base64
    const userPassword = `api:${config.mailgun.key}`;
    const buffer = Buffer.from(userPassword);
    const base64 = buffer.toString('base64');

    // Configure the request details
    const requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.mailgun.net',
      'method': 'POST',
      'path': `v3/${config.mailgun.from}/messages`,
      'headers': {
        'Authorization': `Basic ${base64}`,
        'Content-type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate request object
    let req = https.request(requestDetails, function(res) {
      // Grab status of sent request
      let status = res.statusCode;
      // Callback successfully if request went through
      if (status == 200 || status == 201) {
        callback(false);
      } else {
        callback('Status code returned was ' + status);
      }
    });

    // Bind to error event so it doesn't get thrown
    req.on('error', function(e) {
      callback(e);
    });

    // Add payload
    req.write(stringPayload);

    // End request
    req.end();
  } else {
    callback('Given parameters were missing or invalid');
  }
};

// Get the string content of a template, and use provided data for string interpolation
helpers.getTemplate = function(templateName, data, callback) {
  templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
  data = typeof(data) == 'object' && data !== null ? data : {};
  if (templateName) {
    var templatesDir = path.join(__dirname, '/../templates/');
    fs.readFile(templatesDir + templateName + '.html', 'utf8', function(err, str) {
      if(!err && str && str.length > 0) {
        // Do interpolation on the string
        var finalString = helpers.interpolate(str, data);
        callback(false, finalString);
      } else {
        callback('No template could be found');
      }
    });
  } else {
    callback('A valid template name was not specified');
  }
};

// Add the universal header and footer to a string, and pass provided data object to header and footer for interpolation
helpers.addUniversalTemplates = function(str, data, callback) {
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  data = typeof(data) == 'object' && data !== null ? data : {};
  // Get the header
  helpers.getTemplate('_header', data, function(err, headerString) {
    if(!err && headerString) {
      // Get the footer
      helpers.getTemplate('_footer',data,function(err,footerString) {
        if(!err && headerString) {
          // Add them all together
          var fullString = headerString + str + footerString;
          callback(false, fullString);
        } else {
          callback('Could not find the footer template');
        }
      });
    } else {
      callback('Could not find the header template');
    }
  });
};

// Take a given string and data object, and find/replace all the keys within it
helpers.interpolate = function(str,data) {
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  data = typeof(data) == 'object' && data !== null ? data : {};

  // Add the templateGlobals to the data object, prepending their key name with "global."
  for(var keyName in config.templateGlobals) {
     if(config.templateGlobals.hasOwnProperty(keyName)) {
       data['global.' + keyName] = config.templateGlobals[keyName]
     }
  }
  // For each key in the data object, insert its value into the string at the corresponding placeholder
  for(var key in data){
     if(data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
        var replace = data[key];
        var find = '{' + key + '}';
        str = str.replace(find, replace);
     }
  }
  return str;
};

// Get the contents of a static (public) asset
helpers.getStaticAsset = function(fileName, callback) {
  fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
  if (fileName) {
    var publicDir = path.join(__dirname, '/../public/');
    fs.readFile(publicDir + fileName, function(err, data) {
      if (!err && data) {
        callback(false, data);
      } else {
        callback('No file could be found');
      }
    });
  } else {
    callback('A valid file name was not specified');
  }
};

// Export helpers
module.exports = helpers;
