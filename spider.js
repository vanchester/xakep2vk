var config = require('./config.js'),
    Server = require('mongodb').Server,
    mongo = require('mongodb'),
    mongoClient = new mongo.MongoClient(new Server(config.dbServer || 'localhost', config.dbPort || 27017)),
    Fiber = require('fibers'),
    Iconv = require('iconv').Iconv,
    request = require('request'),
    http = require('http'),
    Entities = require('html-entities').XmlEntities,
    fs = require('fs'),
    cheerio = require('cheerio'),
    poster = require('./poster.js'),
    siteSections = [
        'http://www.xakep.ru/articles/common/news.asp',
        'http://www.xakep.ru/articles/common/articles.asp'
    ];

var db = null;

mongoClient.open(function (err) {
    if (err) {
        throw err;
    }

    poster.init(mongoClient);
    db =  mongoClient.db(config.dbName || 'xakep');

    createIndexIfNotExists(db);

    var callback = function (err, res, body) {
        body = new Buffer(body, 'binary');
        var iconv = new Iconv('windows-1251', 'utf8//IGNORE');
        body = iconv.convert(body).toString();


        try {
            var $ = cheerio.load(body);

            var messages = $('.large-8.columns.with_ul .row');
            var entities = new Entities();

            messages.each(function () {
                var $h = this.find('h5').eq(0),
                    type = this.find('h5').eq(1).text(),
                    postUrl = $h.find('a').attr('href'),
                    postId = parseInt(postUrl.replace(/[^\d]+/, '')),
                    header = entities.decode($h.text()),
                    $news = this.find('.news_body'),
                    imageUrl = this.find('img').eq(0).attr('src');

                $news.find('.news_date').remove();

                db.collection('post').findOne({'id': postId}, function (err, item) {
                    if (err || item) {
                        return;
                    }

                    db.collection('post').insert({'id': postId}, function () {});

                    var text = '[' + type + '] ' + header + '\n\n' + entities.decode($news.text()).replace(/(^[\s\t\r\n]+|[\s\t\r\n]+$)/, '');

                    if (imageUrl) {
                        var file = fs.createWriteStream(postId + '.jpg');
                        http.get(imageUrl, function (response) {
                            response.pipe(file);
                            response.on('end', function () {
                                poster.addRequest({
                                    gid: config.gid,
                                    file: './' + postId + '.jpg',
                                    message: text,
                                    url: postUrl,
                                    delFlag: true
                                });
                            });
                        });
                    } else {
                        poster.addRequest({
                            gid: config.gid,
                            message: text,
                            url: postUrl
                        });
                    }
                });
            });

        } catch (e) {
            console.log(options);
            console.log(e);
        }
    };

    for (var i in siteSections) {
        var options = {
            uri: siteSections[i],
            encoding: 'binary'
        };

        console.log('Parse url ' + siteSections[i]);
        request(options, callback);
    }

    poster.stop();
});

function createIndexIfNotExists(db)
{
    db.collection('post').indexInformation(function (err, indexes) {
        if (!indexes.id_1) {
            console.log('creating index for collection post');
            db.createCollection('post', function (err, collection) {
                if (!err) {
                    collection.createIndex({'id': 1}, {'unique': true}, function () {});
                }
            });
        }
    });
}
