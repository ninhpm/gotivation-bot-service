// Tương tác với người dùng
const env = require("dotenv");
env.config();

const builder = require('botbuilder');
const restify = require('restify');
const githubClient = require("./github-client");

var connector = new builder.ChatConnector();

var bot = new builder.UniversalBot(
    connector,
    (session) => {
        session.endConversation("Hi there! I'm the GitHub bot. I can help you find Github");
    }
)

const recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
recognizer.onEnabled((context, callback) => {
    if (context.dialogStack().length > 0) {
        callback(null, false);
    } else {
        callback(null, true);
    }
});
bot.recognizer(recognizer);

bot.dialog("search", [
    (session, args, next) => {
        const query = builder.EntityRecognizer.findEntity(args.intent.entities, "query");
        if (!query) {
            // No matching entity 
            builder.Prompts.text(session, "Who did you want to seach for?");
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
                    builder.Prompts.text(session, "Sorry, no results found");
                    session.beginDialog("search");
                } else if (totalCount > 10) {
                    session.endDialog("More than 10 resut were found. Please prodiver...");
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
    matches: 'SearchProfile'
})

const server = restify.createServer();
server.listen(3978, () => {
    console.log("Server up on port: 3978 !!!");
});
server.post("api/messages", connector.listen());