'use strict';

var url = require('url');
var path = require('path');
var fs = require('fs');
var nunjucks = require('nunjucks');


module.exports = function(opt) {
  opt = opt || {};

  var ext = opt.ext || '.html';
  var config = opt.ejs || {};
  var baseDir = opt.baseDir || __dirname;
  var bsURL = '';
  
  if (opt.browserSync) {
    if (opt.browserSync === true) {
      opt.browserSync = '1.4.0';
    }

    bsURL = opt.browserSync >= '1.4.0' ? '/browser-sync/browser-sync-client.' : '/browser-sync-client.';
    bsURL += opt.browserSync + '.js';
  }

  return function(req, res, next) {
    var file = req.url === '/' ? ('/index' + ext) : req.url;
    var pathname = path.join(baseDir, url.parse(file).pathname);

    if (path.extname(pathname) === ext && fs.existsSync(pathname)) {
      var contents = fs.readFileSync(pathname).toString();

      config.query = url.parse(req.url, true).query;
      config.filename = pathname;

      nunjucks.render(contents, config, function(err, result) {
        if (err) {
          console.log(err, err.stack);
        }

        if (opt.browserSync) {
          result = result.replace(/<\/head>/, '<script async src="//' + req.headers.host + bsURL + ' "></script></head>');
        }

        res.write(result);
        res.end();
      });
    } else {
      next();
    }
  };
};