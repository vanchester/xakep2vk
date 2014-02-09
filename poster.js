var vkontakte = require('vkontakte'),
    fs = require('fs'),
    FormData = require('form-data'),
    url = require('url'),
    config = require('./config.js'),

    CRLF = '\r\n',
    vk = vkontakte(config.appAuthKey);

var posterQueue = {
    init: function (mongoClient) {
        this.queue = [];
        this.working = 0;
        this.mongoClient = mongoClient;
    },
    stop: function () {
        var that = this;
        setTimeout(function () {
            if ((!that.queue || that.queue.length == 0) && !that.working && that.mongoClient) {
                that.mongoClient.close();
            }
        }, 30000);
    },
    addRequest: function (req) {
        this.queue.push(req);
        this.processRequest();
    },
    requestDone: function () {
        this.working = 0;
        this.processRequest();
    },
    processRequest: function () {
        if (this.queue.length > 0 && !this.working) {
            this.working = 1;
            var args = this.queue.shift();
            if (args.file) {
                try {
                    wallPostWithPhoto(args.gid, args.file, args.message, args.url, args.delFlag);
                } catch (e) {
                    console.log(e);
                    this.requestDone();
                    wallPost(args.gid, args.message, null, args.url);
                }
            } else {
                wallPost(args.gid, args.message, null, args.url);
            }
        } else {
            this.stop();
        }
    }
};

function wallPost(gid, message, attachments, url)
{
    if (url) {
        if (attachments) {
            attachments += ',' + url;
        } else {
            message += '\n' + url;
        }
    }
    var options = {
        owner_id: -gid,
        from_group: 1,
        signed: 0,
        message: message,
        attachments: attachments
    };
    vk('wall.post', options, function (err) {
        console.log(err);
        posterQueue.requestDone();
    });
}

function wallPostWithPhoto(gid, file, message, postUrl, deleteFileAfterPost)
{
    vk('photos.getWallUploadServer', {gid: gid}, function (err, data) {
        if (err) {
            throw err;
        }

        if (!data.upload_url) {
            throw 'empty upload url';
        }

        var form = new FormData();
        var options = {
            header: '--' + form.getBoundary() +
                CRLF + 'Content-Disposition: form-data; name="photo";'+
                'filename="pong.jpg"'+
                CRLF + 'Content-Type: application/octet-stream' +
                CRLF + CRLF
        };

        var urlData = url.parse(data.upload_url);

        form.append('file1', fs.readFileSync(file),options);

        form.submit({host: urlData.host, path: urlData.path}, function(err, res) {
            if (err) {
                throw err;
            }

            var data = '';
            res
                .on('data', function(chunk) {
                    data += chunk.toString();
                })
                .on('end', function() {
                    data = JSON.parse(data);
                    if (!data.hash) {
                        throw 'empty file cache';
                    }

                    vk('photos.saveWallPhoto', {server: data.server, photo: data.photo, hash: data.hash, gid: gid}, function (err, data) {
                        if (err) {
                            throw err;
                        }
                        wallPost(gid, message, data[0].id, postUrl);
                    });

                    if (deleteFileAfterPost) {
                        fs.unlink(file);
                    }
                })
                .resume();
        });
    });
}

module.exports = posterQueue;
