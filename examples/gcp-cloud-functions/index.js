/**
 * Simple HTTP Cloud Function Example
 *
 * This function demonstrates:
 * - HTTP request handling
 * - Environment variable usage
 * - JSON response formatting
 * - Error handling
 * - Logging best practices
 *
 * Educational Purpose: Learn Cloud Functions basics
 */

/**
 * HTTP Cloud Function Entry Point
 *
 * This function is triggered by HTTP requests and can handle
 * GET and POST methods. It demonstrates basic request/response
 * patterns and logging.
 *
 * @param {Object} req - Express request object
 *   @param {Object} req.query - URL query parameters
 *   @param {Object} req.body - Request body (for POST requests)
 *   @param {string} req.method - HTTP method (GET, POST, etc.)
 * @param {Object} res - Express response object
 *   @param {Function} res.status - Set HTTP status code
 *   @param {Function} res.json - Send JSON response
 *   @param {Function} res.send - Send text response
 */
exports.helloWorld = (req, res) => {
  // Log incoming request (visible in Cloud Logging)
  console.log('Function invoked with method:', req.method);
  console.log('Request headers:', req.headers);

  try {
    // Get environment variables (configured in Terraform)
    const environment = process.env.ENVIRONMENT || 'unknown';
    const version = process.env.VERSION || '1.0.0';

    // Parse request parameters
    // Support both query parameters and request body
    const name = req.query.name || req.body?.name || 'World';
    const greeting = req.query.greeting || req.body?.greeting || 'Hello';

    // Log processed parameters
    console.log(`Greeting ${name} in ${environment} environment`);

    // Build response object
    const response = {
      // Main message
      message: `${greeting}, ${name}!`,

      // Metadata
      metadata: {
        environment: environment,
        version: version,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-cloud-trace-context'] || 'unknown'
      },

      // Request information (for demonstration)
      request: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    };

    // Log successful response
    console.log('Sending successful response:', response.message);

    // Send JSON response with 200 status
    res.status(200).json(response);

  } catch (error) {
    // Log error details
    console.error('Error processing request:', error);

    // Send error response
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Advanced Example: Data Processing Function
 *
 * This function demonstrates more advanced features:
 * - Request validation
 * - Data transformation
 * - Asynchronous operations
 *
 * To use this function instead, change entry_point in Terraform to "processData"
 */
exports.processData = async (req, res) => {
  console.log('Processing data request');

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method Not Allowed',
        message: 'This endpoint only accepts POST requests',
        allowedMethods: ['POST']
      });
    }

    // Validate request body
    if (!req.body || !req.body.data) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request body must contain "data" field',
        example: {
          data: [1, 2, 3, 4, 5]
        }
      });
    }

    const { data } = req.body;

    // Validate data is an array
    if (!Array.isArray(data)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Data field must be an array'
      });
    }

    // Process data (example: calculate statistics)
    const statistics = {
      count: data.length,
      sum: data.reduce((acc, val) => acc + val, 0),
      average: data.length > 0
        ? data.reduce((acc, val) => acc + val, 0) / data.length
        : 0,
      min: Math.min(...data),
      max: Math.max(...data)
    };

    console.log('Calculated statistics:', statistics);

    // Simulate async operation (e.g., database write, API call)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send successful response
    res.status(200).json({
      success: true,
      input: {
        dataCount: data.length
      },
      results: statistics,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing data:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Example: Health Check Endpoint
 *
 * Useful for monitoring and load balancer health checks
 */
exports.healthCheck = (req, res) => {
  console.log('Health check requested');

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.ENVIRONMENT || 'unknown',
    version: process.env.VERSION || '1.0.0',
    memory: {
      used: process.memoryUsage().heapUsed / 1024 / 1024,
      total: process.memoryUsage().heapTotal / 1024 / 1024
    }
  };

  res.status(200).json(health);
};

/**
 * Example: Error Demonstration
 *
 * Shows how errors are handled and logged
 */
exports.errorExample = (req, res) => {
  console.log('Demonstrating error handling');

  // Intentional error for demonstration
  throw new Error('This is a demonstration error');
};

/*
 * USAGE EXAMPLES:
 *
 * 1. Simple GET request:
 *    curl https://FUNCTION_URL
 *    Response: {"message": "Hello, World!", ...}
 *
 * 2. GET with parameters:
 *    curl "https://FUNCTION_URL?name=Alice&greeting=Hi"
 *    Response: {"message": "Hi, Alice!", ...}
 *
 * 3. POST with JSON body:
 *    curl -X POST https://FUNCTION_URL \
 *      -H "Content-Type: application/json" \
 *      -d '{"name": "Bob", "greeting": "Welcome"}'
 *    Response: {"message": "Welcome, Bob!", ...}
 *
 * 4. Health check:
 *    Change entry_point to "healthCheck" and deploy
 *    curl https://FUNCTION_URL
 *    Response: {"status": "healthy", ...}
 *
 * 5. Data processing:
 *    Change entry_point to "processData" and deploy
 *    curl -X POST https://FUNCTION_URL \
 *      -H "Content-Type: application/json" \
 *      -d '{"data": [1, 2, 3, 4, 5]}'
 *    Response: {"success": true, "results": {...}}
 */

/*
 * BEST PRACTICES DEMONSTRATED:
 *
 * 1. Comprehensive logging
 *    - Log all important events
 *    - Use console.log for info, console.error for errors
 *    - Logs appear in Cloud Logging
 *
 * 2. Error handling
 *    - Try-catch blocks
 *    - Meaningful error messages
 *    - Appropriate HTTP status codes
 *
 * 3. Environment variables
 *    - Use process.env for configuration
 *    - Provide defaults for optional values
 *
 * 4. Input validation
 *    - Validate request methods
 *    - Check required fields
 *    - Validate data types
 *
 * 5. Response formatting
 *    - Consistent JSON structure
 *    - Include metadata (timestamp, version)
 *    - Clear success/error indicators
 *
 * 6. Security
 *    - Don't expose sensitive data
 *    - Validate all inputs
 *    - Use appropriate CORS settings (configured in Terraform)
 */
