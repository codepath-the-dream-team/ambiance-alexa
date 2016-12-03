/**
 * HTTP GET example
 * 
 * Additional Notes
 * https://developer.amazon.com/appsandservices/solutions/alexa/alexa-skills-kit/getting-started-guide
 */

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.[unique-value-here]") {
             context.fail("Invalid Application ID");
         }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
                + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
                + ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
                + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("HelpIntent" === intentName) {
    } else {
        throw "Invalid intent";
    }
}


/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
                + ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.

    var sessionAttributes = {};
    var repromptText = null;

    var cardTitle = "AmbiantAlarm Push Notification";

    //test http post
    testPost(function (response) {

        var speechOutput = "Response status is " + response;
        var shouldEndSession = true;

        callback(sessionAttributes,
                 buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));

    });

}

function testPost(response) {

    var http = require('http');
    var postData = JSON.stringify({
          "where": {
            "deviceToken" : {
              "$in" : [
               "39fc6c2a3583b080f5708c0482b1e5ae925c5c44dedbf480117869cff9401fb8"
              ]
            },
            "deviceType": {
              "$in": [
                "ios"
              ]
            }
          },
          "data": {
            "title": "Ambient Alarm",
            "alert": "start"
          }
    });
    var options = {
        host: 'codepath-ambiance.herokuapp.com',
        method: 'POST',
        path: '/parse/push',
        headers: {
          'Content-Type' : 'application/json',
          'X-Parse-Master-Key' : 'PvZSZ25V4sgYMmEOpWIfaCQCwLSWNWIvgbYmq6ZD',
          'X-Parse-Application-Id' : 'SXQu86CkKMYI3iuKhJHCQqCGtws3vT3c9eWE9WO2'
        }
    };
    /**
    var http = require('http');
    var options = {
        host: 'www.bing.com',
        port: 80,
        path: '/',
        agent: false,
        method: 'POST',
        headers: {
            'Content-Type' : 'application/json',
            'X-Parse-Master-Key' : 'PvZSZ25V4sgYMmEOpWIfaCQCwLSWNWIvgbYmq6ZD',
            'X-Parse-Application-Id' : 'SXQu86CkKMYI3iuKhJHCQqCGtws3vT3c9eWE9WO2'
        }
    };
     **/

    var req = http.request(options, function (res) {
        console.log("Response: " + res.statusCode);
        //response(res.statusCode);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            response(chunk);
        });
        res.on('end', () => {
            console.log('No more data in response.');
        });
    });
   // write data to request body
    req.write(postData);
    req.end();
    //response("Done writing data.");
}

/**

function testGet(response) {

    var http = require('http');
    var options = {
        host: 'www.bing.com',
        port: 80,
        path: '/',
        agent: false
    };

    http.get(options, function (res) {
        console.log("Response: " + res.statusCode);
        response(res.statusCode);
    }).on('error', function (e) {
        console.log("Error message: " + e.message);
    });

}

**/

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            // title: "SessionSpeechlet - " + title,
            // content: "SessionSpeechlet - " + output
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}
