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
            builder.Prompts.text(session, "Who did you want to seach for?");
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
                    session.endDialog("Sorry, no results found");
                } else if (totalCount > 10) {
                    session.endDialog("More than 10 resut were found. Please prodiver...");
                } else {
                    session.dialogData.property = null;
                    var usernames = profiles.items.map(item => item.login);
                    builder.Prompts.choice(session, "Please choose a user", usernames, {
                        listStyle:builder.ListStyle.button
                    });
                }
            })
        }
    },
    (session, results, next) => {
        // When you're using choose, the value is inside of results
        session.endConversation(`You choose ${results.response.entity}`);
    }
]).triggerAction({
    matches: /^search/i
})

const server = restify.createServer();
server.post("api/messages", connector.listen());
server.listen(3978, () => {
    console.log("Server up on port: 3978 !!!");
})