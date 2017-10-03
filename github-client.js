var querystring = require("querystring");
var https = require("https");
module.exports = {
    executeSearch: (query, callback) => {
        this.loadData("/search/users?q=" + querystring.escape(query), callback);
    },

    loadProfile: (username, callback) => {
        this.loadData("/users/" + querystring.escape(username), callback);
    },

    loadData: (path, callback) => {
        const option = {
            host: "api.github.com",
            port: 443,
            path: path,
            method: "GET"
        };
        const request = https.request(option, (response) => {
            const data = '';
            response.on("data", (chunk) => {
                data += chunk;
            });
            response.on("end", () => {
                callback(JSON.parse(data));
            })
        })
        request.end();
    }
}