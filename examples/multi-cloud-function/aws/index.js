/**
 * AWS Lambda Adapter
 * 
 * This adapter transforms AWS Lambda events to our standard format
 * and calls the shared business logic.
 */

const { processGreeting } = require('../shared/function');

exports.handler = async (event, context) => {
    console.log('AWS Lambda adapter invoked');

    // Extract parameters from Lambda event (API Gateway format)
    const name = (event.queryStringParameters && event.queryStringParameters.name) ||
                 (event.body && JSON.parse(event.body).name);

    // Gather AWS-specific environment info
    const environment = {
        cloud: 'AWS',
        service: 'AWS Lambda',
        region: process.env.AWS_REGION,
        functionName: context.functionName,
        requestId: context.requestId,
        memoryLimit: context.memoryLimitInMB
    };

    // Call shared business logic
    const result = processGreeting({ name, environment });

    // Transform to API Gateway response
    return {
        statusCode: result.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.success ? result.data : { error: result.error, code: result.code })
    };
};
