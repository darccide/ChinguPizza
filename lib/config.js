// Create and export config variables

// Container for all the environments
const environments = {};

// Stating (default) environment
environments.staging = {
  'httpPort': 3030,
  'httpsPort': 3031,
  'envName': 'staging',
  'hashingSecret': 'YOUR_SECRET_HERE',
  stripe: {
    secret: 'sk_test_Y0UrTeS+SeCrE+',
    currency: 'usd',
    source: 'tok_visa',
    description: 'Chingu Pizza Test Charge'
  },
  mailgun: {
    key: 'sOmErAnD0MsTrInGoFnUm6eRsANDleTTer5',
    from: 'sandboxaa8LAH8LAH8LAH.mailgun.org'
  }
};

// Production environment
environments.production = {
  'httpPort': 5050,
  'httpsPort': 5051,
  'envName': 'production',
  'hashingSecret': 'YOUR_OTHER_SECRET_HERE',
  stripe: {
    secret: 'sk_test_Y0UrTeS+SeCrE+',
    currency: 'usd',
    source: 'tok_visa',
    description: 'Chingu Pizza Test Charge'
  },
  mailgun: {
    key: 'sOmErAnD0MsTrInGoFnUm6eRsANDleTTer5',
    from: 'sandboxaa8LAH8LAH8LAH.mailgun.org'
  }
};





// Determine environment based on command-line argument
let currentEnvironment = typeof(process.env.NODE_ENV) == 'string'
    ? process.env.NODE_ENV.toLowerCase() : '';

// Check current environment is one from above, if not, default to staging
let environmentToExport = typeof(environments[currentEnvironment]) == 'object'
    ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
