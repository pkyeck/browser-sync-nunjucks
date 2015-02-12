'use strict';

var url = require('url');
var path = require('path');
var fs = require('fs');
var nunjucks = require('nunjucks');
var _ = require('lodash');


function CustomFileLoader(opts) {
  this.baseDir = opts.baseDir || '';
  this.modulesPath = opts.modules;
  this.ext = opts.ext;
  this.currentPath = opts.currentPath;
  if (path.extname(this.currentPath) !== '') {
    var pos = this.currentPath.lastIndexOf('/');
    this.currentPath = this.currentPath.substring(0, pos);
  }
}

CustomFileLoader.prototype.getSource = function(name) {
  var splits = name.split('/');

  if (splits[0] === '@') {
    splits.shift();
    name = path.join(this.baseDir, this.modulesPath, splits.join('/') + this.ext);
  }

  if (splits[0] === '.') {
    splits.shift();
    name = path.join(this.baseDir, this.currentPath, splits.join('/') + this.ext);
  }

  var bd = this.baseDir.split('./').join('');
  if (name.indexOf(bd) !== 0) {
    name = path.resolve(this.baseDir + '/' + name);
  }

  if (name.lastIndexOf('.') < 0) {
    name += this.ext;
  }

  return {
    src: fs.readFileSync(name).toString(),
    path: name,
    noCache: true
  };
};


module.exports = function(opt) {
  opt = opt || {};

  var ext = opt.ext || '.html';
  var context = opt.context || {};
  var baseDir = opt.baseDir || __dirname;
  var currentPath = opt.currentPath || baseDir;
  var bsURL = '';
  var modules = opt.modulesDir || '';

  // allow custom nunjucks filter
  var filters = opt.filters ||  {};

  return function(req, res, next) {
    var file = req.url === '/' ? ('/index' + ext) : req.url;
    var pathname = path.join(baseDir, url.parse(file).pathname);
    var ua = req.headers['user-agent'];

    if (path.extname(pathname) === ext && fs.existsSync(pathname)) {
      context.query = url.parse(req.url, true).query;
      context.filename = pathname;
      context.ajax = req.headers['x-requested-with'] === 'XMLHttpRequest';

      var env = new nunjucks.Environment(new CustomFileLoader({
        baseDir: baseDir,
        modules: modules,
        ext: ext,
        currentPath: req.url
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
        env.addFilter(filterName, filters[filterName]);
      }

      env.render(pathname, context, function(err, result) {
        if (err) {
          console.log(err);
          console.log(err.stack);
          res.writeHead(500);
          res.end();
          return;
        }

        res.setHeader('Content-Type', 'text/html');
        res.write(result);
        res.end();
      });
    } else {
      next();
    }
  };
};
