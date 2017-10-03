const builder = require('botbuilder');
const restify = require('restify');
const githubClient = require("./github-client");

var connector = new builder.ChatConnector();
var bot = new builder.UniversalBot(
    connector, [
        (session) => {
            session.beginDialog("ensureProfire", session.userData.profile);
        },
        (session, results) => {
            const profile = session.userData.profile = results.response;
            session.endConversation(`Hello, ${profile.name}, I also want to work at ${profile.company} :)`)
        }
    ]
);

bot.dialog("ensureProfire", [
    (session, args, next) => {
        session.dialogData.profile = args || {};
        if (!session.dialogData.profile.name) {
            builder.Prompts.text(session, "What is yours name?", {
                retryPrompt: 'Please enter your name....'
            });
        } else {
            next();
        }
    },
    (session, results, next) => {
        if (results.response) {
            session.dialogData.profile.name = results.response;
        }
        if (!session.dialogData.profile.company) {
            builder.Prompts.text(session, "What company do you work for?");
        } else {
            next();
        }
    },
    (session, results) => {
        if (results.response) {
            session.dialogData.profile.company = results.response;
        }
        session.endDialogWithResult({
            response: session.dialogData.profile
        })
    }
]);

/**
 * Global Dialog
 */
bot.dialog("help", [
    (session) => {
        session.endDialog("I'm a simple bot ....");
    }
]).triggerAction({
    matches: /^help$/,
    onSelectAction:(session, args)=>{
        session.beginDialog(args.action, args);
    }
})

const server = restify.createServer();
server.post("api/messages", connector.listen());
server.listen(3978, () => {
    console.log("Server up on port: 3978 !!!");
})