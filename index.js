
var express = require('express');

var app = express();
var nest = require('./nest');

app.use(express.static(__dirname + '/static'));

app.listen(process.env.PORT || 3000, function() {
  console.log('Listening');
});

app.get('/oauth_url', function(req, res) {
  res.send(JSON.stringify({
    url: nest.authUrl(),
  }));
});

app.get('/oauth_receiver', function(req, res) {
  if (!req.query.code) {
    res.send(JSON.stringify({
      error: 'Did not specify access code.'
    }));
    return;
  }
  nest.exchangeForAccessToken(req.query.code).then(function(accessToken) {
    return nest.listDevices(accessToken);
  }).then(function(devices) {
    res.send(JSON.stringify(devices));
  }).catch(function(err) {
    console.error(err);
    res.send(JSON.stringify({
      error: err
    }));
  });
});
