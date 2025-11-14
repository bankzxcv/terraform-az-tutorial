/**
 * Azure Functions Adapter
 * 
 * This adapter transforms Azure Functions events to our standard format
 * and calls the shared business logic.
 */

const { processGreeting } = require('../shared/function');

module.exports = async function (context, req) {
    context.log('Azure Functions adapter invoked');

    // Extract parameters from Azure request
    const name = req.query.name || (req.body && req.body.name);

    // Gather Azure-specific environment info
    const environment = {
        cloud: 'Azure',
        service: 'Azure Functions',
        instanceId: process.env.WEBSITE_INSTANCE_ID || 'local',
        region: process.env.REGION_NAME || 'local',
        functionName: context.executionContext.functionName,
        invocationId: context.executionContext.invocationId
    };

    // Call shared business logic
    const result = processGreeting({ name, environment });

    // Transform to Azure Functions response
    context.res = {
        status: result.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: result.success ? result.data : { error: result.error, code: result.code }
    };
};
