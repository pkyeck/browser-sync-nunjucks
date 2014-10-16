'use strict';

var url = require('url');
var path = require('path');
var fs = require('fs');
var nunjucks = require('nunjucks');


function MyLoader(opts) {
  this.modulesPath = opts.modules;
  this.ext = opts.ext;
}

MyLoader.prototype.getSource = function(name) {
  console.log('MyLoader getSource()', name);

  var splits = name.split('/');

  if (splits[0] === '@') {
    splits.shift();
    name = this.modulesPath + '/' + splits.join('/') + this.ext;
  }

  if (name.lastIndexOf('.') < 0) {
    name += this.ext;
  }

  return {
    src: fs.readFileSync(name).toString(),
    path: name,
    noCache: true
  };
}


module.exports = function(opt) {
  opt = opt || {};

  var ext = opt.ext || '.html';
  var context = opt.context || {};
  var baseDir = opt.baseDir || __dirname;
  var bsURL = '';
  var modules = opt.modulesDir || '';

  var filters = {
    filter: function(input, condition) {
      return input.filter(function(item) {
        return eval(condition);
      });
    },
    min: function(input, other) {
      return Math.min(input, other);
    },
    range: function(input, start, end) {
      return input.slice(start, end);
    },
    parseIntOr: function(input, or) {
      return parseInt(input, 10) || or;
    }
  };
  
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
      context.query = url.parse(req.url, true).query;
      context.filename = pathname;

      var env = new nunjucks.Environment(new MyLoader({
        modules: modules,
        ext: ext
      }), {
        watch: false,
        tags: {
          blockStart: '<%',
          blockEnd: '%>',
          commentStart: '<#',
          commentEnd: '#>'
        }
      });

      for (var filterName in filters) {
        console.log(filterName);
        env.addFilter(filterName, filters[filterName]);
      }

      console.log('nunjucks render:', pathname);
      env.render(pathname, context, function(err, result) {
        if (err) {
          console.log(err);
          console.log(err.stack);
          res.writeHead(500);
          res.end();
          return;
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