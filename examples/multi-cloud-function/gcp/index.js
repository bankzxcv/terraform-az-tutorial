/**
 * Google Cloud Functions Adapter
 * 
 * This adapter transforms Cloud Functions events to our standard format
 * and calls the shared business logic.
 */

const functions = require('@google-cloud/functions-framework');
const { processGreeting } = require('../shared/function');

functions.http('helloWorld', (req, res) => {
    console.log('GCP Cloud Functions adapter invoked');

    // Extract parameters from Cloud Functions request
    const name = req.query.name || (req.body && req.body.name);

    // Gather GCP-specific environment info
    const environment = {
        cloud: 'GCP',
        service: 'Google Cloud Functions',
        functionName: process.env.FUNCTION_NAME || 'local',
        region: process.env.FUNCTION_REGION || 'local',
        memory: process.env.FUNCTION_MEMORY_MB
    };

    // Call shared business logic
    const result = processGreeting({ name, environment });

    // Transform to Cloud Functions response
    res.status(result.statusCode)
       .set('Content-Type', 'application/json')
       .json(result.success ? result.data : { error: result.error, code: result.code });
});
