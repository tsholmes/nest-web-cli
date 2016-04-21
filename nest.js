
var request = require('request');
var productId = process.env.PRODUCT_ID;
var productSecret = process.env.PRODUCT_SECRET;

var OAUTH_LOGIN_URL = 'https://home.nest.com/login/oauth2';
var OAUTH_ACCESS_TOKEN_URL = 'https://api.home.nest.com/oauth2/access_token';
var DEVICE_LIST_URL = 'https://developer-api.nest.com/devices'

function authUrl() {
  return OAUTH_LOGIN_URL + '?client_id=' + productId + '&state=' + generateState();
}

function generateState() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var state = '';
  for (var i = 0; i < 32; i++) {
    state += chars[(Math.random() * chars.length) | 0];
  }
  return state;
}

function exchangeForAccessToken(code) {
  return new Promise(function(accept, reject) {
    request.post(OAUTH_ACCESS_TOKEN_URL, {
      form: {
        code: code,
        client_id: productId,
        client_secret: productSecret,
        grant_type: 'authorization_code'
      }
    }, function(err, response, body) {
      if (err) {
        reject(err);
      } else {
        var res = JSON.parse(body);
        if (res.error) {
          reject(res.error);
        } else {
          accept(res.access_token);
        }
      }
    });
  });
}

function listDevices(accessToken) {
  return new Promise(function(accept, reject) {
    request.get(DEVICE_LIST_URL, {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    }, function(err, response, body) {
      if (err) {
        reject(err);
      } else {
        var result = JSON.parse(body);
        if (result.error) {
          reject(result.error);
        } else {
          accept(result);
        }
      }
    });
  });
}

module.exports = {
  authUrl: authUrl,
  exchangeForAccessToken: exchangeForAccessToken,
  listDevices: listDevices,
}
