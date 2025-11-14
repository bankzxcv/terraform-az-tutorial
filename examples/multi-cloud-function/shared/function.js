/**
 * Shared Business Logic - Cloud Agnostic
 * 
 * This file contains the core business logic that works across all cloud providers.
 * It's designed to be platform-independent and imported by cloud-specific adapters.
 */

/**
 * Process a greeting request
 * 
 * @param {Object} params - Request parameters
 * @param {string} params.name - Name to greet
 * @param {Object} params.environment - Environment information
 * @returns {Object} Response object
 */
function processGreeting(params) {
    const { name, environment } = params;

    // Input validation
    if (name && name.length > 100) {
        return {
            success: false,
            statusCode: 400,
            error: 'Name parameter too long (max 100 characters)',
            code: 'INVALID_INPUT'
        };
    }

    // Sanitize input
    const sanitizedName = name ? name.replace(/[<>]/g, '') : null;

    if (!sanitizedName) {
        return {
            success: false,
            statusCode: 400,
            error: 'Please provide a name parameter',
            message: 'Please pass a name on the query string or in the request body'
        };
    }

    // Business logic - Generate greeting
    return {
        success: true,
        statusCode: 200,
        data: {
            message: `Hello, ${sanitizedName}! Welcome to Multi-Cloud Serverless.`,
            greeting: `Hello, ${sanitizedName}!`,
            cloud: environment.cloud || 'unknown',
            environment: environment,
            tips: [
                'This same function can run on Azure, AWS, or GCP',
                'Cloud-agnostic code promotes portability',
                'Use adapters to handle cloud-specific differences',
                'Compare costs and performance across providers'
            ]
        }
    };
}

// Export for use in adapters
module.exports = { processGreeting };
