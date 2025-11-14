/**
 * Simple HTTP-triggered Google Cloud Function
 *
 * PURPOSE:
 * This is a beginner-friendly example of a Cloud Function that responds to HTTP requests.
 * It demonstrates the basic structure, request handling, and response formatting.
 *
 * HOW GOOGLE CLOUD FUNCTIONS WORK:
 * 1. Client sends HTTP request to function URL
 * 2. Cloud Functions runtime receives the request
 * 3. Runtime invokes your function with Express.js request and response objects
 * 4. Your function processes the request and sends response
 * 5. Runtime returns the response to the client
 * 6. Logs are sent to Cloud Logging
 *
 * EXECUTION MODEL:
 * - Serverless: No server management required
 * - Event-driven: Runs only when triggered
 * - Auto-scaling: Scales from 0 to 1000+ instances automatically
 * - Pay-per-invocation: Charged only for execution time (rounded to 100ms)
 *
 * COST (1st Generation):
 * - First 2 million invocations free per month
 * - After that: $0.40 per million invocations
 * - Compute time: $0.0000025 per GB-second
 * - This simple function costs < $0.01/month for typical development usage
 */

const functions = require('@google-cloud/functions-framework');

/**
 * HTTP Cloud Function handler
 *
 * This function follows the Express.js-style signature for HTTP functions.
 * 
 * @param {Object} req - Express.js request object
 *   - req.method: HTTP method (GET, POST, etc.)
 *   - req.url: Request URL
 *   - req.headers: Request headers
 *   - req.query: Query parameters object
 *   - req.body: Parsed request body (if Content-Type is application/json)
 *   - req.path: Request path
 *
 * @param {Object} res - Express.js response object
 *   - res.status(code): Set status code
 *   - res.send(data): Send response (auto-stringified if object)
 *   - res.json(data): Send JSON response
 *   - res.set(header, value): Set response header
 *
 * IMPORTANT: Always call a res method to complete the request
 * - res.send(), res.json(), res.end(), etc.
 * - Not sending a response causes timeout
 */
functions.http('helloWorld', (req, res) => {
    // LOG: All console.log statements go to Cloud Logging
    // These are crucial for debugging and monitoring production issues
    console.log('Cloud Function invoked');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));

    // ===================================================================
    // PARSE REQUEST DATA
    // ===================================================================

    // Extract the 'name' parameter from query string or request body
    // Query string: /hello?name=John
    // Request body: { "name": "John" }

    const name = req.query.name || (req.body && req.body.name);

    // ===================================================================
    // SECURITY: Input Validation
    // Always validate and sanitize input to prevent security issues
    // ===================================================================

    // Validate the name parameter
    // SECURITY: Limit input length to prevent abuse
    if (name && name.length > 100) {
        console.log('Name parameter too long:', name.length);
        return res.status(400).json({
            error: 'Name parameter too long (max 100 characters)',
            code: 'INVALID_INPUT',
            maxLength: 100,
            providedLength: name.length
        });
    }

    // SECURITY: Basic input sanitization (remove potentially dangerous characters)
    // In production, use a proper validation library
    const sanitizedName = name ? name.replace(/[<>]/g, '') : null;

    // ===================================================================
    // Business Logic
    // ===================================================================

    // Gather environment information
    // These environment variables are automatically available in Cloud Functions
    const environmentInfo = {
        // FUNCTION_NAME: Name of the Cloud Function
        functionName: process.env.FUNCTION_NAME || process.env.K_SERVICE || 'local',

        // FUNCTION_REGION: GCP region where function is deployed
        region: process.env.FUNCTION_REGION || process.env.FUNCTION_TARGET || 'local',

        // K_REVISION: Cloud Run revision (for 2nd gen functions)
        revision: process.env.K_REVISION || 'N/A',

        // Node.js runtime version
        nodeVersion: process.version,

        // FUNCTION_SIGNATURE_TYPE: Type of function (http, event, cloudevent)
        signatureType: process.env.FUNCTION_SIGNATURE_TYPE || 'http',

        // Timestamp of this execution
        timestamp: new Date().toISOString(),

        // Memory allocated (from environment or metadata)
        memory: process.env.FUNCTION_MEMORY_MB || 'unknown',

        // Timeout
        timeout: process.env.FUNCTION_TIMEOUT_SEC || 'unknown'
    };

    // ===================================================================
    // Response Formatting
    // ===================================================================

    // SECURITY: Set security headers
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Content-Type', 'application/json');

    // CORS: Allow cross-origin requests
    // SECURITY: In production, specify exact origins instead of *
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (sanitizedName) {
        // SUCCESS RESPONSE: Name provided
        console.log('Responding with greeting for:', sanitizedName);

        res.status(200).json({
            message: `Hello, ${sanitizedName}! Welcome to Google Cloud Functions.`,
            greeting: `Hello, ${sanitizedName}!`,
            environment: environmentInfo,
            tips: [
                'Cloud Functions scale automatically from 0 to 1000+ instances',
                'You only pay for execution time (billed per 100ms)',
                'First 2 million invocations per month are free',
                'Use Cloud Logging for monitoring and debugging',
                'Cloud Functions integrate seamlessly with all GCP services'
            ],
            metadata: {
                service: 'Google Cloud Functions',
                generation: '1st gen',
                platform: 'Google Cloud Platform'
            }
        });
    } else {
        // ERROR RESPONSE: Name not provided
        console.log('Name parameter missing, returning error response');

        res.status(400).json({
            error: 'Please provide a name parameter',
            message: 'Please pass a name on the query string or in the request body',
            examples: {
                queryString: '/hello?name=John',
                requestBody: '{ "name": "John" }',
                curl: 'curl "https://REGION-PROJECT_ID.cloudfunctions.net/hello?name=John"'
            },
            environment: environmentInfo
        });
    }
});

/**
 * PERFORMANCE NOTES:
 *
 * Cold Start (1st Generation):
 * - First request after idle period takes ~1-2 seconds (Node.js)
 * - Subsequent requests are fast (~10-50ms) while instance is warm
 * - Instances stay warm for ~15 minutes of inactivity
 * - 2nd generation functions have faster cold starts
 * - Minimum instances can keep functions always warm ($$$)
 *
 * Memory Usage:
 * - This simple function uses ~50-100MB of memory
 * - Memory allocation: 128MB to 8GB (1st gen), up to 32GB (2nd gen)
 * - More memory = more CPU power
 * - Default: 256MB
 *
 * Execution Time:
 * - This function executes in < 50ms (after cold start)
 * - Timeout: 60 seconds (default), up to 540 seconds (1st gen), 3600 seconds (2nd gen)
 * - Billed in 100ms increments
 *
 * SECURITY BEST PRACTICES:
 *
 * 1. Authentication:
 *    - Use IAM for function invocation (require authentication)
 *    - Implement custom authentication in function code
 *    - Use Identity Platform for user authentication
 *    - API Gateway for API key management
 *
 * 2. Input Validation:
 *    - Always validate and sanitize input
 *    - Limit input size
 *    - Use parameterized queries for databases
 *    - Validate types and formats
 *
 * 3. Secrets Management:
 *    - Store secrets in Secret Manager
 *    - Access secrets via Secret Manager API
 *    - Don't pass secrets in environment variables
 *    - Rotate secrets regularly
 *
 * 4. Network Security:
 *    - Use VPC Connector for accessing private resources
 *    - Ingress settings to control who can call function
 *    - Egress settings for outbound traffic
 *    - Cloud Armor for DDoS protection
 *
 * 5. CORS:
 *    - Configure CORS properly (don't use wildcard in production)
 *    - Validate Origin header
 *    - Use specific allowed origins
 *
 * MONITORING:
 *
 * 1. Cloud Logging:
 *    - All console.log goes to Cloud Logging
 *    - Structured logging recommended
 *    - Logs retained for 30 days by default
 *    - Export logs to Cloud Storage for longer retention
 *
 * 2. Cloud Monitoring Metrics:
 *    - Execution count
 *    - Execution times
 *    - Memory usage
 *    - Active instances
 *    - Network egress
 *
 * 3. Cloud Trace:
 *    - Distributed tracing
 *    - Latency analysis
 *    - Integration with other GCP services
 *
 * 4. Error Reporting:
 *    - Automatic error detection
 *    - Error grouping and analysis
 *    - Stack trace capture
 *
 * COST OPTIMIZATION:
 *
 * 1. Optimize execution time (faster = cheaper)
 * 2. Right-size memory allocation
 * 3. Use minimum instances only when necessary
 * 4. Minimize cold starts with 2nd gen functions
 * 5. Batch processing where possible
 * 6. Monitor and remove unused functions
 *
 * BEST PRACTICES:
 *
 * 1. Keep functions small and focused
 * 2. Use environment variables for configuration
 * 3. Handle errors gracefully
 * 4. Implement proper logging
 * 5. Use 2nd generation for new projects (based on Cloud Run)
 * 6. Version your functions
 * 7. Test locally with Functions Framework
 * 8. Implement health checks
 * 9. Use deployment automation (CI/CD)
 * 10. Monitor performance and costs
 *
 * NEXT STEPS:
 *
 * 1. Add more triggers (Pub/Sub, Cloud Storage, Firestore)
 * 2. Integrate with GCP services (Firestore, Cloud Storage, BigQuery)
 * 3. Implement authentication and authorization
 * 4. Add error handling and retry logic
 * 5. Set up CI/CD pipeline
 * 6. Add unit and integration tests
 * 7. Implement structured logging
 * 8. Add distributed tracing
 * 9. Optimize for performance and cost
 * 10. Migrate to 2nd generation functions
 */
