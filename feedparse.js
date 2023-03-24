
module.exports = function(RED) {
    "use strict";
    var FeedParser = require("feedparser");
    var request = require("request");
    var url = require('url');
    var getFeed = function();
    
    function FeedParseNode(n) {
        RED.nodes.createNode(this,n);
        this.url = n.url;
        var node = this;
        this.seen = {};
        var parsedUrl = url.parse(this.url);
        if (!(parsedUrl.host || (parsedUrl.hostname && parsedUrl.port)) && !parsedUrl.isUnix) {
            this.error(RED._("feedparse-extended.errors.invalidurl"));
        }
        else {
            getFeed = function(msg) {
                var feed_url;
                if(msg.payload != null){
                    feed_url = msg.payload;
                } else {
                    feed_url = node.url;
                }
                var req = request(feed_url, {timeout:10000, pool:false});
                //req.setMaxListeners(50);
                req.setHeader('user-agent', 'Mozilla/5.0 (Node-RED)');
                req.setHeader('accept', 'text/html,application/xhtml+xml');

                var feedparser = new FeedParser();

                req.on('error', function(err) { node.error(err); });

                req.on('response', function(res) {
                    if (res.statusCode != 200) { node.warn(RED._("feedparse-extended.errors.badstatuscode")+" "+res.statusCode); }
                    else { res.pipe(feedparser); }
                });

                feedparser.on('error', function(error) { node.error(error); });

                feedparser.on('readable', function () {
                    var stream = this, article;
                    while (article = stream.read()) {  // jshint ignore:line
                        if (!(article.guid in node.seen) || ( node.seen[article.guid] !== 0 && node.seen[article.guid] != article.date.getTime())) {
                            node.seen[article.guid] = article.date?article.date.getTime():0;
                            
                            msg.topic = article.origlink || article.link
                            msg.payload = article.description
                            msg.article = article
                            
                            node.send(msg);
                        }
                    }
                });

                feedparser.on('meta', function (meta) {});
                feedparser.on('end', function () {});
            };
        }

        this.on("input", function(msg) {
            getFeed(msg);
        });
    }

    RED.nodes.registerType("feedparse-extended",FeedParseNode);
}
