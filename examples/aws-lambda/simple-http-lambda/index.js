/**
 * Simple HTTP-triggered AWS Lambda Function
 *
 * PURPOSE:
 * This is a beginner-friendly example of an AWS Lambda function that responds to HTTP requests
 * via Amazon API Gateway. It demonstrates the basic structure, event handling, and response formatting.
 *
 * HOW AWS LAMBDA WORKS:
 * 1. API Gateway receives HTTP request
 * 2. API Gateway transforms HTTP request into Lambda event
 * 3. Lambda runtime invokes your handler function with event and context
 * 4. Your function processes the request and returns a response
 * 5. API Gateway transforms Lambda response back to HTTP response
 * 6. Response is sent back to the client
 *
 * EXECUTION MODEL:
 * - Serverless: No server management required
 * - Event-driven: Runs only when triggered
 * - Auto-scaling: Scales automatically based on concurrent requests
 * - Pay-per-invocation: Charged only for execution time (rounded to 1ms)
 *
 * COST:
 * - First 1 million requests free per month (permanent)
 * - After that: $0.20 per million requests
 * - Compute time: $0.0000166667 per GB-second
 * - This simple function costs < $0.01/month for typical development usage
 */

/**
 * Lambda Handler Function
 *
 * @param {Object} event - Lambda event object (from API Gateway)
 *   Event structure for API Gateway HTTP API:
 *   - event.requestContext: Request metadata (requestId, apiId, etc.)
 *   - event.headers: HTTP headers (lowercase)
 *   - event.queryStringParameters: Query string parameters
 *   - event.pathParameters: Path parameters from route
 *   - event.body: Request body (stringified JSON)
 *   - event.isBase64Encoded: Whether body is base64 encoded
 *
 * @param {Object} context - Lambda context object
 *   - context.requestId: Unique request ID
 *   - context.functionName: Function name
 *   - context.functionVersion: Function version ($LATEST or version number)
 *   - context.memoryLimitInMB: Allocated memory
 *   - context.getRemainingTimeInMillis(): Time remaining before timeout
 *   - context.logGroupName: CloudWatch log group
 *   - context.logStreamName: CloudWatch log stream
 *
 * @returns {Object} Response object for API Gateway
 *   Must include:
 *   - statusCode: HTTP status code (200, 400, 500, etc.)
 *   - headers: Response headers object
 *   - body: Response body (must be string for REST API)
 *
 * IMPORTANT: Lambda functions can be async or sync
 * - Use 'async' if you need to await promises (recommended)
 * - Return the response object directly (or use callback in older patterns)
 */
exports.handler = async (event, context) => {
    // LOG: All console.log statements go to CloudWatch Logs
    // These are crucial for debugging and monitoring production issues
    console.log('Lambda function invoked');

    // LOG: Event details - helps understand what triggered the function
    console.log('Event:', JSON.stringify(event, null, 2));

    // LOG: Context information - useful for tracing and debugging
    console.log('Request ID:', context.requestId);
    console.log('Function Name:', context.functionName);
    console.log('Function Version:', context.functionVersion);
    console.log('Memory Limit:', context.memoryLimitInMB + 'MB');
    console.log('Time Remaining:', context.getRemainingTimeInMillis() + 'ms');

    // ===================================================================
    // PARSE REQUEST DATA
    // ===================================================================

    // Extract the 'name' parameter from query string or request body
    // Query string: /api/hello?name=John
    // Request body: { "name": "John" }

    let name = null;

    // Check query string parameters
    if (event.queryStringParameters && event.queryStringParameters.name) {
        name = event.queryStringParameters.name;
    }

    // Check request body (if POST request)
    // API Gateway passes body as stringified JSON
    if (!name && event.body) {
        try {
            const body = JSON.parse(event.body);
            name = body.name;
        } catch (error) {
            console.error('Error parsing request body:', error);
            // Return error response for invalid JSON
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY'
                },
                body: JSON.stringify({
                    error: 'Invalid JSON in request body',
                    message: error.message,
                    code: 'INVALID_JSON'
                })
            };
        }
    }

    // ===================================================================
    // SECURITY: Input Validation
    // Always validate and sanitize input to prevent security issues
    // ===================================================================

    // Validate the name parameter
    // SECURITY: Limit input length to prevent abuse
    if (name && name.length > 100) {
        console.log('Name parameter too long:', name.length);
        return {
            statusCode: 400, // Bad Request
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            },
            body: JSON.stringify({
                error: 'Name parameter too long (max 100 characters)',
                code: 'INVALID_INPUT',
                maxLength: 100,
                providedLength: name.length
            })
        };
    }

    // SECURITY: Basic input sanitization (remove potentially dangerous characters)
    // In production, use a proper validation library like 'joi' or 'validator'
    const sanitizedName = name ? name.replace(/[<>]/g, '') : null;

    // ===================================================================
    // Business Logic
    // ===================================================================

    // Gather environment information
    // These environment variables are automatically available in Lambda
    const environmentInfo = {
        // AWS_REGION: AWS region where function is running
        region: process.env.AWS_REGION || 'unknown',

        // AWS_LAMBDA_FUNCTION_NAME: Function name
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME || context.functionName,

        // AWS_LAMBDA_FUNCTION_VERSION: Function version
        functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION || context.functionVersion,

        // AWS_LAMBDA_FUNCTION_MEMORY_SIZE: Allocated memory in MB
        memorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || context.memoryLimitInMB,

        // Node.js runtime version
        nodeVersion: process.version,

        // AWS_EXECUTION_ENV: Runtime environment (e.g., AWS_Lambda_nodejs18.x)
        runtime: process.env.AWS_EXECUTION_ENV || 'unknown',

        // Request ID for tracing
        requestId: context.requestId,

        // Timestamp of this execution
        timestamp: new Date().toISOString(),

        // Time remaining before timeout
        timeRemaining: context.getRemainingTimeInMillis() + 'ms'
    };

    // ===================================================================
    // Response Formatting
    // ===================================================================

    if (sanitizedName) {
        // SUCCESS RESPONSE: Name provided
        console.log('Responding with greeting for:', sanitizedName);

        // IMPORTANT: API Gateway expects specific response format
        // For REST API: body must be a string
        // For HTTP API: body can be string or will be stringified
        return {
            statusCode: 200, // OK

            // HEADERS: Set appropriate headers
            // SECURITY: Prevent the response from being embedded in frames (clickjacking protection)
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'Access-Control-Allow-Origin': '*', // CORS (adjust for production)
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },

            // BODY: Response data
            // Must be stringified JSON for API Gateway REST API
            body: JSON.stringify({
                message: `Hello, ${sanitizedName}! Welcome to AWS Lambda.`,
                greeting: `Hello, ${sanitizedName}!`,
                environment: environmentInfo,
                tips: [
                    'AWS Lambda scales automatically based on requests',
                    'You only pay for execution time (billed per 1ms)',
                    'Lambda can be triggered by 20+ AWS services',
                    'Use CloudWatch Logs and X-Ray for monitoring',
                    'First 1 million requests per month are free (forever)'
                ],
                metadata: {
                    service: 'AWS Lambda',
                    apiGateway: 'HTTP API',
                    coldStart: !process.env.LAMBDA_WARM // Simple cold start detection
                }
            })
        };
    } else {
        // ERROR RESPONSE: Name not provided
        console.log('Name parameter missing, returning error response');

        return {
            statusCode: 400, // Bad Request
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            body: JSON.stringify({
                error: 'Please provide a name parameter',
                message: 'Please pass a name on the query string or in the request body',
                examples: {
                    queryString: '/hello?name=John',
                    requestBody: '{ "name": "John" }',
                    curl: 'curl "https://api-id.execute-api.region.amazonaws.com/hello?name=John"'
                },
                environment: environmentInfo
            })
        };
    }

    // Mark the environment as warm for subsequent invocations
    // Container reuse means this will be set for warm starts
    process.env.LAMBDA_WARM = 'true';
};

/**
 * PERFORMANCE NOTES:
 *
 * Cold Start:
 * - First request or after idle period takes ~100ms-1s (Node.js)
 * - Subsequent requests are fast (~1-10ms) while container is warm
 * - Containers stay warm for ~15-60 minutes of inactivity
 * - Provisioned Concurrency keeps containers always warm ($$$)
 *
 * Memory Usage:
 * - This simple function uses ~50-100MB of memory
 * - Memory allocation affects CPU allocation (1,769 MB = 1 vCPU)
 * - More memory = more CPU = faster execution (to a point)
 * - Optimal memory often between 512MB-1024MB for cost/performance
 *
 * Execution Time:
 * - This function executes in < 10ms (after cold start)
 * - Timeout: 3 seconds (default), configurable up to 15 minutes
 * - Billed in 1ms increments (previously 100ms)
 *
 * Container Reuse:
 * - Lambda reuses containers for subsequent invocations
 * - Global variables persist between invocations
 * - Use this for connection pooling, caching, etc.
 * - Don't rely on it - containers can be recycled anytime
 *
 * SECURITY BEST PRACTICES:
 *
 * 1. IAM Roles and Policies:
 *    - Lambda execution role with least privilege
 *    - Use IAM policies to control what Lambda can access
 *    - Never hardcode AWS credentials in code
 *
 * 2. Input Validation:
 *    - Always validate and sanitize input
 *    - Limit input size
 *    - Use parameterized queries for databases
 *    - Validate types and formats
 *
 * 3. Secrets Management:
 *    - Store secrets in AWS Secrets Manager or SSM Parameter Store
 *    - Access secrets via AWS SDK (don't pass in environment variables)
 *    - Rotate secrets regularly
 *    - Use encryption for sensitive data
 *
 * 4. Network Security:
 *    - Use VPC for accessing private resources
 *    - Security groups for network-level access control
 *    - Private subnets for Lambda in VPC
 *    - VPC endpoints for accessing AWS services
 *
 * 5. API Gateway Security:
 *    - Enable API Gateway authentication (API keys, IAM, Cognito, Lambda authorizers)
 *    - Implement rate limiting and throttling
 *    - Use AWS WAF for additional protection
 *    - Enable CloudWatch logging for audit trail
 *
 * 6. CORS:
 *    - Configure CORS properly (don't use wildcard in production)
 *    - Validate Origin header
 *    - Use specific allowed origins
 *
 * 7. Error Handling:
 *    - Don't expose internal errors to clients
 *    - Log detailed errors to CloudWatch
 *    - Return generic error messages to users
 *
 * MONITORING:
 *
 * 1. CloudWatch Logs:
 *    - All console.log goes to CloudWatch Logs
 *    - Logs retained for 30 days by default (configurable)
 *    - Use CloudWatch Insights for log analysis
 *
 * 2. CloudWatch Metrics:
 *    - Invocations: Number of function invocations
 *    - Duration: Execution time
 *    - Errors: Number of errors
 *    - Throttles: Number of throttled invocations
 *    - ConcurrentExecutions: Number of concurrent executions
 *    - DeadLetterErrors: DLQ errors
 *
 * 3. AWS X-Ray:
 *    - Distributed tracing
 *    - Service map visualization
 *    - Performance analysis
 *    - Error and fault analysis
 *
 * 4. Custom Metrics:
 *    - Use CloudWatch SDK to publish custom metrics
 *    - Track business metrics
 *    - Create custom dashboards
 *
 * 5. Alerts:
 *    - Set up CloudWatch Alarms for:
 *      - Error rate (> 1%)
 *      - Duration (> 1000ms)
 *      - Throttles (> 0)
 *    - Use SNS for notifications
 *
 * COST OPTIMIZATION:
 *
 * 1. Optimize execution time (faster = cheaper)
 * 2. Right-size memory allocation
 * 3. Use ARM64 (Graviton2) for 20% cost savings
 * 4. Batch processing where possible
 * 5. Avoid unnecessary external calls
 * 6. Use Lambda Powertools for best practices
 * 7. Monitor and remove unused functions
 * 8. Use reserved concurrency to prevent runaway costs
 *
 * BEST PRACTICES:
 *
 * 1. Keep functions small and focused (single responsibility)
 * 2. Use environment variables for configuration
 * 3. Handle errors gracefully
 * 4. Implement retry logic with exponential backoff
 * 5. Use DLQ (Dead Letter Queue) for failed async invocations
 * 6. Version your Lambda functions
 * 7. Use aliases for deployment stages (dev, staging, prod)
 * 8. Implement proper logging and monitoring
 * 9. Use Lambda Layers for shared dependencies
 * 10. Test locally before deploying
 *
 * NEXT STEPS:
 *
 * 1. Add more complex logic (database queries, API calls)
 * 2. Implement additional triggers (S3, DynamoDB, SQS, EventBridge)
 * 3. Add authentication (Cognito, Lambda authorizers)
 * 4. Implement error handling and retries
 * 5. Set up CI/CD pipeline for automated deployments
 * 6. Add unit and integration tests
 * 7. Implement request/response validation
 * 8. Add distributed tracing with X-Ray
 * 9. Optimize for performance and cost
 * 10. Implement canary deployments with CodeDeploy
 */
