/**
 * Simple AWS Lambda Function for Learning
 *
 * This Lambda function demonstrates:
 * - HTTP API responses
 * - Environment variables
 * - Error handling
 * - JSON responses
 * - Logging
 *
 * Can be triggered by:
 * - API Gateway
 * - Direct invocation
 * - EventBridge
 */

/**
 * Main Lambda handler function
 *
 * @param {Object} event - Event data passed to the function
 *   For API Gateway, contains: httpMethod, path, body, headers, queryStringParameters
 * @param {Object} context - Runtime information about the Lambda function
 *   Contains: requestId, functionName, memoryLimitInMB, logGroupName, etc.
 * @returns {Promise<Object>} Response object with statusCode, headers, and body
 */
exports.handler = async (event, context) => {
  // Log the incoming event for debugging
  // In production, be careful not to log sensitive data
  console.log('Received event:', JSON.stringify(event, null, 2));
  console.log('Function context:', JSON.stringify({
    requestId: context.requestId,
    functionName: context.functionName,
    memoryLimit: context.memoryLimitInMB,
    timeRemaining: context.getRemainingTimeInMillis()
  }, null, 2));

  try {
    // Get environment variables (set in Terraform)
    const environment = process.env.ENVIRONMENT || 'development';
    const region = process.env.AWS_REGION || 'unknown';
    const version = process.env.FUNCTION_VERSION || '1.0.0';

    // Determine the HTTP method (if triggered by API Gateway)
    const httpMethod = event.httpMethod || 'UNKNOWN';
    const path = event.path || '/';

    // Parse query parameters if present
    const queryParams = event.queryStringParameters || {};

    // Handle different HTTP methods
    let responseData;

    switch (httpMethod.toUpperCase()) {
      case 'GET':
        responseData = handleGet(event, queryParams);
        break;

      case 'POST':
        responseData = await handlePost(event);
        break;

      case 'PUT':
        responseData = await handlePut(event);
        break;

      case 'DELETE':
        responseData = handleDelete(event, queryParams);
        break;

      default:
        // For direct Lambda invocation or unknown methods
        responseData = {
          message: 'Hello from AWS Lambda!',
          info: 'This Lambda function can respond to HTTP events'
        };
    }

    // Build successful response
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // CORS - adjust for production
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Powered-By': 'AWS Lambda'
      },
      body: JSON.stringify({
        success: true,
        data: responseData,
        metadata: {
          requestId: context.requestId,
          environment: environment,
          region: region,
          version: version,
          timestamp: new Date().toISOString(),
          method: httpMethod,
          path: path
        }
      }, null, 2)
    };

    console.log('Response:', JSON.stringify(response, null, 2));
    return response;

  } catch (error) {
    // Error handling
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: {
          message: error.message,
          type: error.name
        },
        metadata: {
          requestId: context.requestId,
          timestamp: new Date().toISOString()
        }
      }, null, 2)
    };
  }
};

/**
 * Handle GET requests
 * @param {Object} event - Lambda event
 * @param {Object} queryParams - Query string parameters
 * @returns {Object} Response data
 */
function handleGet(event, queryParams) {
  console.log('Handling GET request');

  // Example: Return user data based on query parameter
  if (queryParams.name) {
    return {
      message: `Hello, ${queryParams.name}!`,
      method: 'GET',
      params: queryParams
    };
  }

  // Default GET response
  return {
    message: 'GET request received',
    tip: 'Try adding ?name=YourName to the URL',
    availableEndpoints: {
      'GET /': 'This endpoint - returns info',
      'GET /?name=John': 'Personalized greeting',
      'POST /': 'Create a new item (send JSON body)',
      'PUT /': 'Update an item (send JSON body)',
      'DELETE /?id=123': 'Delete an item by ID'
    },
    exampleCommands: {
      curl: 'curl https://your-api-url/',
      awsCli: 'aws lambda invoke --function-name your-function response.json'
    }
  };
}

/**
 * Handle POST requests
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Response data
 */
async function handlePost(event) {
  console.log('Handling POST request');

  try {
    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};

    console.log('Parsed body:', body);

    // Example: Create a new item
    const newItem = {
      id: generateId(),
      ...body,
      createdAt: new Date().toISOString(),
      status: 'created'
    };

    // In a real application, you would:
    // 1. Validate the input
    // 2. Save to DynamoDB/RDS
    // 3. Return the created resource

    return {
      message: 'Item created successfully',
      method: 'POST',
      item: newItem,
      note: 'In production, this would save to a database'
    };

  } catch (error) {
    console.error('Error parsing POST body:', error);
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Handle PUT requests
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Response data
 */
async function handlePut(event) {
  console.log('Handling PUT request');

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const queryParams = event.queryStringParameters || {};

    // Example: Update an item
    const updatedItem = {
      id: queryParams.id || generateId(),
      ...body,
      updatedAt: new Date().toISOString(),
      status: 'updated'
    };

    return {
      message: 'Item updated successfully',
      method: 'PUT',
      item: updatedItem,
      note: 'In production, this would update a database record'
    };

  } catch (error) {
    console.error('Error parsing PUT body:', error);
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Handle DELETE requests
 * @param {Object} event - Lambda event
 * @param {Object} queryParams - Query string parameters
 * @returns {Object} Response data
 */
function handleDelete(event, queryParams) {
  console.log('Handling DELETE request');

  const itemId = queryParams.id;

  if (!itemId) {
    throw new Error('Missing required parameter: id');
  }

  // In a real application, you would delete from database
  return {
    message: 'Item deleted successfully',
    method: 'DELETE',
    deletedId: itemId,
    timestamp: new Date().toISOString(),
    note: 'In production, this would delete from a database'
  };
}

/**
 * Generate a simple random ID
 * @returns {string} Random ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Example of how to use this function:
 *
 * 1. Direct Lambda invocation:
 *    aws lambda invoke \
 *      --function-name my-lambda-function \
 *      --payload '{"name": "Terraform"}' \
 *      response.json
 *
 * 2. Via API Gateway GET:
 *    curl https://your-api-url/?name=Terraform
 *
 * 3. Via API Gateway POST:
 *    curl -X POST https://your-api-url/ \
 *      -H "Content-Type: application/json" \
 *      -d '{"title": "Learn Lambda", "priority": "high"}'
 *
 * 4. Via API Gateway PUT:
 *    curl -X PUT https://your-api-url/?id=123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"title": "Updated Title", "status": "complete"}'
 *
 * 5. Via API Gateway DELETE:
 *    curl -X DELETE https://your-api-url/?id=123
 */
