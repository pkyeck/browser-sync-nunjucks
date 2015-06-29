'use strict';

//
//
module.exports = function(opt) {
  return function(req, res, next) {
    res.writeHead(500);
    res.write('browser-sync-nunjucks is deprecated - please use connect-nunjucks instead');
    res.end();
  };
};
