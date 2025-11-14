/**
 * Simple HTTP-triggered Azure Function
 *
 * PURPOSE:
 * This is a beginner-friendly example of an Azure Function that responds to HTTP requests.
 * It demonstrates the basic structure, request handling, and response formatting.
 *
 * HOW AZURE FUNCTIONS WORK:
 * 1. Azure Functions Runtime hosts your code
 * 2. When a trigger event occurs (HTTP request in this case), the runtime invokes your function
 * 3. Your function receives a context object and trigger data
 * 4. You process the request and set the response on the context object
 * 5. The runtime returns the response to the caller
 *
 * EXECUTION MODEL:
 * - Serverless: No server management required
 * - Event-driven: Runs only when triggered
 * - Auto-scaling: Scales automatically based on load
 * - Pay-per-execution: Charged only for execution time
 *
 * COST:
 * - First 1 million executions free per month
 * - After that: $0.20 per million executions
 * - Execution time: $0.000016 per GB-second
 * - This simple function costs < $0.01/month for typical development usage
 */

/**
 * Main function handler
 *
 * @param {Object} context - Azure Functions context object
 *   - context.log: Logging function (appears in Application Insights)
 *   - context.res: Response object (set this to return HTTP response)
 *   - context.bindings: Input/output bindings data
 *   - context.executionContext: Execution metadata (invocation ID, function name, etc.)
 *
 * @param {Object} req - HTTP request object
 *   - req.method: HTTP method (GET, POST, etc.)
 *   - req.url: Request URL
 *   - req.headers: Request headers object
 *   - req.query: Query parameters object
 *   - req.params: Route parameters object
 *   - req.body: Request body (parsed JSON if Content-Type is application/json)
 *
 * IMPORTANT: Azure Functions can be async or sync
 * - Use 'async' if you need to await promises
 * - This example is simple and doesn't need async
 */
module.exports = async function (context, req) {
    // LOG: Everything logged here appears in Application Insights and can be queried
    // This is crucial for debugging and monitoring production issues
    context.log('JavaScript HTTP trigger function processing a request.');

    // LOG: Execution metadata - useful for tracing and debugging
    context.log('Invocation ID:', context.executionContext.invocationId);
    context.log('Function Name:', context.executionContext.functionName);

    // ===================================================================
    // SECURITY: Input Validation
    // Always validate and sanitize input to prevent security issues
    // ===================================================================

    // Extract the 'name' parameter from query string or request body
    // Query string: /api/hello?name=John
    // Request body: { "name": "John" }
    const name = req.query.name || (req.body && req.body.name);

    // Validate the name parameter
    // SECURITY: Limit input length to prevent abuse
    if (name && name.length > 100) {
        context.res = {
            status: 400, // Bad Request
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'Name parameter too long (max 100 characters)',
                code: 'INVALID_INPUT'
            }
        };
        return; // Exit early
    }

    // SECURITY: Basic input sanitization (remove potentially dangerous characters)
    // In production, use a proper validation library like 'validator' or 'joi'
    const sanitizedName = name ? name.replace(/[<>]/g, '') : null;

    // ===================================================================
    // Business Logic
    // ===================================================================

    // Gather environment information
    // These environment variables are automatically available in Azure Functions
    const environmentInfo = {
        // WEBSITE_INSTANCE_ID: Unique identifier for the compute instance running this function
        // Useful for understanding which instance served a request in a scaled environment
        instanceId: process.env.WEBSITE_INSTANCE_ID || 'local',

        // REGION_NAME: Azure region where the function is deployed
        region: process.env.REGION_NAME || 'local',

        // Node.js runtime version
        nodeVersion: process.version,

        // FUNCTIONS_WORKER_RUNTIME: The runtime (node, python, dotnet, etc.)
        runtime: process.env.FUNCTIONS_WORKER_RUNTIME || 'node',

        // Timestamp of this execution
        timestamp: new Date().toISOString()
    };

    // ===================================================================
    // Response Formatting
    // ===================================================================

    if (sanitizedName) {
        // SUCCESS RESPONSE: Name provided
        context.log('Responding with greeting for:', sanitizedName);

        // Set the response on the context object
        // The Azure Functions runtime will return this to the caller
        context.res = {
            status: 200, // OK

            // HEADERS: Set appropriate headers
            // SECURITY: Prevent the response from being embedded in frames (clickjacking protection)
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            },

            // BODY: Response data
            // Azure Functions automatically serializes objects to JSON
            body: {
                message: `Hello, ${sanitizedName}! Welcome to Azure Functions.`,
                greeting: `Hello, ${sanitizedName}!`,
                environment: environmentInfo,
                tips: [
                    'Azure Functions auto-scales based on demand',
                    'You only pay for execution time',
                    'Functions can be triggered by HTTP, timers, queues, and more',
                    'Use Application Insights for monitoring and debugging'
                ]
            }
        };
    } else {
        // ERROR RESPONSE: Name not provided
        context.log('Name parameter missing, returning error response');

        context.res = {
            status: 400, // Bad Request
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            },
            body: {
                error: 'Please provide a name parameter',
                message: 'Please pass a name on the query string or in the request body',
                example: {
                    queryString: '/api/hello?name=John',
                    requestBody: '{ "name": "John" }'
                },
                environment: environmentInfo
            }
        };
    }

    // IMPORTANT: When you set context.res, the function is done
    // The runtime will return the response to the caller
    // You can also use context.done() explicitly, but it's not required with async functions
};

/**
 * PERFORMANCE NOTES:
 *
 * Cold Start:
 * - First request after idle period takes ~1-3 seconds (cold start)
 * - Subsequent requests are fast (~10-50ms) while instance is warm
 * - Consumption plan: Instances stay warm for ~20 minutes of inactivity
 * - Premium plan: Can configure "always ready" instances to eliminate cold starts
 *
 * Memory Usage:
 * - This simple function uses ~50MB of memory
 * - Memory allocation affects CPU allocation (more memory = more CPU)
 * - Default: 1.5 GB on Consumption plan
 *
 * Execution Time:
 * - This function executes in < 100ms (after cold start)
 * - Timeout: 5 minutes (Consumption), 30 minutes (Premium), unlimited (Dedicated)
 *
 * SECURITY BEST PRACTICES:
 *
 * 1. Authentication:
 *    - Use function keys (authLevel in function.json)
 *    - Integrate with Azure AD for user authentication
 *    - Use managed identity to access other Azure resources
 *
 * 2. Input Validation:
 *    - Always validate and sanitize input
 *    - Limit input size
 *    - Use parameterized queries for databases
 *
 * 3. Secrets Management:
 *    - Store secrets in Azure Key Vault
 *    - Reference secrets via app settings
 *    - Never hardcode secrets in code
 *
 * 4. HTTPS Only:
 *    - Azure Functions enforces HTTPS by default in production
 *    - All traffic is encrypted in transit
 *
 * 5. CORS:
 *    - Configure CORS in host.json or Azure Portal
 *    - Don't use wildcard (*) in production
 *
 * MONITORING:
 *
 * 1. Application Insights:
 *    - Automatically enabled for Function Apps
 *    - Tracks requests, dependencies, exceptions
 *    - Query logs with Kusto Query Language (KQL)
 *
 * 2. Metrics to Monitor:
 *    - Execution count (invocations)
 *    - Execution duration (performance)
 *    - Error rate (reliability)
 *    - Memory usage (resource consumption)
 *
 * 3. Alerts:
 *    - Set up alerts for error rate, execution duration
 *    - Use Action Groups for notifications
 *
 * COST OPTIMIZATION:
 *
 * 1. Optimize execution time (faster = cheaper)
 * 2. Use appropriate memory allocation
 * 3. Avoid unnecessary external calls
 * 4. Use Premium plan only if needed
 * 5. Consider dedicated App Service plan for consistent high load
 *
 * NEXT STEPS:
 *
 * 1. Add more complex logic (database queries, API calls)
 * 2. Implement additional triggers (Timer, Queue, Blob)
 * 3. Add output bindings (Queue, Blob, CosmosDB)
 * 4. Implement Durable Functions for stateful workflows
 * 5. Set up CI/CD pipeline for automated deployments
 */
