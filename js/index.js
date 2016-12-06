/**
 * HTTP GET example
 * 
 * Additional Notes
 * https://developer.amazon.com/appsandservices/solutions/alexa/alexa-skills-kit/getting-started-guide
 */

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.

// iOS token to send push notification to.
//var deviceToken = "9c92c7f6236732b1e95a800c070b32754666c74f952ab367985d108d47d78f4d";

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
                + ", sessionId=" + session.sessionId
                + ", accessToken=" + session.user.accessToken);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("AmbientAlarmStart" === intentName) {
        getIntentResponse('start', callback, session.user.accessToken);
    } else if ("AmbientAlarmStop" === intentName) {
        getIntentResponse('stop', callback, session.user.accessToken);
    } else if ("AmbientAlarmSnooze" === intentName) {
        getIntentResponse('snooze', callback, session.user.accessToken);
    } else if ("HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    }else{
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
    var cardTitle = "Ambient Alarm Push Notification";
    var speechOutput = "Welcome to Ambient Alarm.  You can say start, to begin, or stop, to end.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

var parseUserData = undefined;

function getIntentResponse(command, callback, accessToken) {

    var sessionAttributes = {};
    var repromptText = null;
    var cardTitle = "Ambient Alarm Push Notification";
    var respondWithSpeech = function (speechOutput) {
        var shouldEndSession = true;
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    };

    startGettingFacebookId(accessToken, respondWithSpeech, command);
}

function startGettingFacebookId(accessToken, respondWithSpeech, pushCommand) {
    getFacebookId(accessToken, function (response, responseObj) {
        if (response != 200) {
            respondWithSpeech("Facebook id retrieval failed");
        } else {
            var facebookId = responseObj.id;
            console.log("facebook id is " + facebookId);
            startGettingParseUserId(facebookId, respondWithSpeech, pushCommand)
        }
    });
}

function startGettingParseUserId(facebookId, respondWithSpeech, pushCommand) {
    getParseUserId(facebookId, function (response, responseObj) {
        if (response != 200) {
            respondWithSpeech("Parse id retrieval failed");
        } else {
            var results = responseObj.results;
            if (results && results[0] && results[0].objectId) {
                var parseUserId = results[0].objectId;
                parseUserData = results[0];
                console.log("Parse user id is " + parseUserId);
                console.log("FirstName is: " + parseUserData.firstName);
                startGettingDeviceTokens(parseUserId, respondWithSpeech, pushCommand)
            } else {
                respondWithSpeech("Parse id retrieval failed");
            }
        }
    });
}

function startGettingDeviceTokens(parseUserId, respondWithSpeech, pushCommand) {
    getDeviceToken(parseUserId, function (response, responseObj) {
        if (response != 200) {
            respondWithSpeech("Device token retrieval failed");
        } else {
            var results = responseObj.results;
            var deviceToken = null;
            if (results && results.length > 0) {
                var counter = results.length - 1;
                for (; counter > 0; counter--) {
                    var installationInfo = results[counter];
                    if (installationInfo.deviceToken) {
                        deviceToken = installationInfo.deviceToken;
                        break;
                    }
                    counter--;
                }
            }
            if (deviceToken) {
                startPerformingPushNotification(deviceToken, respondWithSpeech, pushCommand);
            } else {
                respondWithSpeech("Could not find deviceToken");
            }
        }
    });
}

function startPerformingPushNotification(deviceToken, respondWithSpeech, pushCommand) {
    postPushNotification(pushCommand, deviceToken, function (response) {
        if (response != 200) {
            respondWithSpeech("Could not send " + command + " command.");
        } else {
            buildSuccessResponseSpeech(respondWithSpeech, pushCommand);
            respondWithSpeech("Success.");
        }
    });
}

function buildSuccessResponseSpeech(respondWithSpeech, pushCommand) {
    if (parseUserData) {
        var firstName = parseUserData.firstName;
        var soundName = parseUserData.sleepConfiguration.soundName;
        if (pushCommand == 'start') {
            respondWithSpeech("Starting " + soundName + ".");
        }
        if (pushCommand == 'stop') {
            respondWithSpeech("Stopped. Have a nice day, " + firstName + ".");
        }
    }
    respondWithSpeech("Success.");
}

function getFacebookId(accessToken, callback) {
    var options = {
        host: 'graph.facebook.com',
        path: '/me?access_token=' + accessToken,
        method: 'GET',
        headers: {
            'Content-Type' : 'application/json'
        }
    };
    callHttp(options, null, callback);
}

function getParseUserId(facebookId, callback) {
    var options = {
        host: 'codepath-ambiance.herokuapp.com',
        path: '/parse/users/?where={"fbId":{"$in":["' + facebookId + '"]}}',
        method: 'GET',
        headers: {
            'Content-Type' : 'application/json',
            'X-Parse-Master-Key' : 'PvZSZ25V4sgYMmEOpWIfaCQCwLSWNWIvgbYmq6ZD',
            'X-Parse-Application-Id' : 'SXQu86CkKMYI3iuKhJHCQqCGtws3vT3c9eWE9WO2'
        }
    };
    callHttp(options, null, callback);
}

function getDeviceToken(parseUserId, callback) {
    var options = {
        host: 'codepath-ambiance.herokuapp.com',
        path: '/parse/installations/?where={"user":{"__type":"Pointer","className":"_User","objectId":"' + parseUserId + '"}}&order=updatedAt',
        method: 'GET',
        headers: {
            'Content-Type' : 'application/json',
            'X-Parse-Master-Key' : 'PvZSZ25V4sgYMmEOpWIfaCQCwLSWNWIvgbYmq6ZD',
            'X-Parse-Application-Id' : 'SXQu86CkKMYI3iuKhJHCQqCGtws3vT3c9eWE9WO2'
        }
    };
    callHttp(options, null, callback);
}

function postPushNotification(command, deviceToken, callback) {
    var postData = JSON.stringify({
          "where": {
            "deviceToken" : {
              "$in" : [
                deviceToken
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
            "alert": command
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
    callHttp(options, postData, callback);
}

function callHttp(options, postData, callback) {
    var http = require('https');
    var httpResponseOutput = '';
    var req = http.request(options, function (res) {
        console.log("Response: " + res.statusCode);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            httpResponseOutput += chunk;
    });
        res.on('end', () => {
            var obj = JSON.parse(httpResponseOutput);
        console.log("http call returned value ", httpResponseOutput);
        console.log("response ", res.statusCode);
        callback(res.statusCode, obj);
    });
    });
    if (postData) {
        req.write(postData)
    }
    req.end();
}


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
