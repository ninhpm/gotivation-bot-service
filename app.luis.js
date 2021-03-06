// Tương tác với người dùng
const env = require("dotenv");
env.config();

const builder = require('botbuilder');
const restify = require('restify');
const githubClient = require("./github-client");

const server = restify.createServer();
server.listen(process.env.PORT || 3978, () => {
    console.log("Server up on port: 3978 !!!");
});

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASS
});

server.post("api/messages", connector.listen());

var bot = new builder.UniversalBot(connector, (session) => {
    session.endConversation('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
})

const recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL).onEnabled((context, callback) => {
    var enabled = context.dialogStack().length === 0;
    callback(null, enabled);
});
bot.recognizer(recognizer);

bot.use({
    botbuilder: (session, next) => {
        const start = /^GET_STARTED|get started|start over|start$/i.test(session.message.text);
        if (!session.userData.firstRun) {
            session.userData.firstRun = true;
            session.send("Wellcome, This is the user search system in http://api.github.com!!!");
            session.send("Who did you want to seach for?");
        } else {
            next();
        }
    }
})

bot.dialog("search", [
    (session, args, next) => {
        const query = builder.EntityRecognizer.findEntity(args.intent.entities, "person");
        if (!query) {
            // No matching entity 
            builder.Prompts.text(session, "Who did you want to seach for?"); // geektrainer ryanvolum
        } else {
            // the user types in : search <<name>>
            next({
                response: query.entity
            });
        }
    },
    (session, results, next) => {
        var query = results.response;
        if (!query) {
            session.endDialog("Request cancelled");
        } else {
            githubClient.executeSearch(query, (profiles) => {
                const totalCount = profiles.total_count;
                if (totalCount == 0) {
                    session.endConversation("Sorry, no results found");
                    session.beginDialog("search");
                } else if (totalCount > 10) {
                    session.endConversation("More than 10 resut were found. Please prodiver...");
                } else {
                    session.dialogData.property = null;
                    var usernames = profiles.items.map(item => item.login);
                    builder.Prompts.choice(session, "Please choose a user", usernames, {
                        listStyle: builder.ListStyle.button
                    });
                }
            })
        }
    },
    (session, results, next) => {
        // When you're using choose, the value is inside of results
        // session.endConversation(`You choose ${results.response.entity}`);
        session.sendTyping();
        githubClient.loadProfile(results.response.entity, (profile) => {
            var card = new builder.HeroCard(session);
            console.log(card);
            card.title(profile.login);
            card.images([builder.CardImage.create(session, profile.avatar_url)]);
            card.buttons([builder.CardAction.imBack(session, profile.name)])
            if (profile.name)
                card.subtitle(profile.name);
            var text = "";
            if (profile.company)
                text += profile.company + '\n\n';
            if (profile.email)
                text += profile.email + '\n\n';
            if (profile.bio)
                text += profile.bio + '\n\n';
            card.text(text);
            card.tap(new builder.CardAction.openUrl(session, profile.html_url));
            var message = new builder.Message(session).attachments([card]);
            session.endConversation(message);
        })
    }
]).triggerAction({
    matches: 'search'
})

bot.dialog('Help', function (session) {
    session.endDialog('Hi! Can me help you??');
}).triggerAction({
    matches: 'Help'
});