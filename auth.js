var Request = require('request');
var Process = require('process');
var fs = require('fs');

var options = {
    uri: 'https://oauth.vk.com/authorize?client_id=4175469&scope=wall,messages,photos&redirect_uri=http%3A%2F%2Fapi.vk.com%2Fblank.html&display=touch&response_type=token',
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.152 Safari/537.36'
    }
};

var j = Request.jar();
var request = Request.defaults({jar:j, timeout: 5000});
console.log('GET request to ' + options.uri);
request.get(options, function(error, response, body) {
        if (error) {
                return;
        }
        var ip_h = body.match(/name[\s\t]*=[\s\t]*["']ip_h["'][\s\t]+value[\s\t]*=[\s\t]*["']([^"']+)/i)[1];
        var to = body.match(/name[\s\t]*=[\s\t]*["']to["'][\s\t]+value[\s\t]*=[\s\t]*["']([^"']+)/i)[1];
        var action = body.match(/action[\s\t]*=[\s\t]*["']([^"']+)/i)[1];

        console.log('POST request to ' + action);
        request.post(action, {form: {ip_h: ip_h, to: to, email: 'YOUR_VK_EMAIL', pass: 'YOUR_VK_PASS'}}, function (error, response, body) {
                if (response.headers.location != undefined) {
                        console.log('GET reqeust to ' + response.headers.location);
                        request.get(response.headers.location, function (error, response, body) {
                                var accessKey = response.request.uri.hash.match(/access_token=([\w\d]+)/)[1];
                                console.log(accessKey);

                                fs.readFile(__dirname + '/config.js', function (err, data) {
                                        data = data.toString().replace(/appAuthKey[\s\t]*:[\s\t]*['"][^"']*["']/, 'appAuthKey: \'' + accessKey + '\'');

                                        fs.writeFile(__dirname + '/config.js', data, function () {
                                                Process.exit();
                                        });
                                });
                        });
                }
        });
});
