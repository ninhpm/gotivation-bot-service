// Tương tác với người dùng
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

bot.dialog("search", [
    (session, args, next) => {
        if (session.message.text.toLocaleLowerCase() == "search") {
            builder.Prompts.text(session, "Who did you want to seach for?"); // geektrainer ryanvolum
        } else {
            // the user types in : search <<name>>
            const query = session.message.text.substring(7);
            next({
                response: query
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
            session.send(message);
        })
    }
]).triggerAction({
    matches: /^search/i
})

const server = restify.createServer();
server.post("api/messages", connector.listen());
server.listen(3978, () => {
    console.log("Server up on port: 3978 !!!");
});