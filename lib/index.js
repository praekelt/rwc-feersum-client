'use strict';

exports.__esModule = true;

var _sockjsClient = require('sockjs-client');

var _sockjsClient2 = _interopRequireDefault(_sockjsClient);

var _parsers = require('./parsers');

var _parsers2 = _interopRequireDefault(_parsers);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } // @ts-check


/** A network transport client that handles network connections and message transformations */
var RWCFeersumClient = function () {
  function RWCFeersumClient(_ref) {
    var url = _ref.url,
        config = _ref.config;

    _classCallCheck(this, RWCFeersumClient);

    this.url = url;
    this.config = {
      channel_id: config.channel_id,
      address: config.address || (0, _utils.randId)(),
      startNew: config.startNew || true,
      retransmissionTimeout: config.retransmissionTimeout || 1000,
      retransmissionMaxTimeout: config.retransmissionMaxTimeout || 20000,
      retransmissionAttempts: config.retransmissionAttempts || 100
    };
    this.retryAllowed = true;
    this.sockReady = false;
    this.queue = [];
    this.parser = new _parsers2.default({
      version: config.schemaVersion || '0.9'
    }).parser();
  }

  RWCFeersumClient.prototype.init = function init(handlers) {
    this.handlers = handlers;
    return this.open();
  };

  /**
   * Open the socket connection and bind all handlers.
   * @return {promise} A promise which gets resolved when a connection is opened.
   */


  RWCFeersumClient.prototype.open = function open() {
    var _this = this;

    return new Promise(function (resolve, reject) {
      _this.sock = new _sockjsClient2.default(_this.url, null, {
        sessionId: function sessionId() {
          return _this.config.address;
        }
      });
      _this.sock.onopen = function () {
        _this.sock.send(JSON.stringify({
          type: 'connect',
          channel_id: _this.config.channel_id,
          start: _this.config.startNew
        }));
        _this.config.startNew = false;
        _this.retryAllowed = true;
        _this.queue.map(function (message) {
          _this.send(message);
        });
        _this.queue = [];
        _this.sockReady = true;
        _this.bindReceiveHandler();
        _this.handlers.connection.open();
        resolve();
      };
      _this.sock.onclose = function (err) {
        _this.sockReady = false;
        _this.handlers.connection.close(err);
        reject(err);
        if (_this.retryAllowed) {
          _this.retryAllowed = false;
          _this.connectionRetry();
        }
      };
    });
  };

  RWCFeersumClient.prototype.send = function send(message) {
    !this.sockReady ? this.queue.push(message) : this.sock.send(JSON.stringify({
      type: 'message',
      message: this.parser.format(message)
    }));
  };

  RWCFeersumClient.prototype.bindReceiveHandler = function bindReceiveHandler(message) {
    var _this2 = this;

    this.sock.onmessage = function (_ref2) {
      var type = _ref2.type,
          data = _ref2.data;

      data = _this2.parser.parse(JSON.parse(data));
      data.origin = 'remote';
      _this2.handlers[type](data);
    };
  };

  RWCFeersumClient.prototype.connectionRetry = function connectionRetry() {
    var _this3 = this;

    var count = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var _config = this.config,
        retransmissionAttempts = _config.retransmissionAttempts,
        retransmissionMaxTimeout = _config.retransmissionMaxTimeout;


    var retransmissionTimeout = this.config.retransmissionTimeout * (count + 1);

    retransmissionTimeout = retransmissionTimeout > retransmissionMaxTimeout ? retransmissionMaxTimeout : retransmissionTimeout;

    if (count < retransmissionAttempts) setTimeout(function () {
      return _this3.open().catch(function (err) {
        _this3.connectionRetry(count + 1);
      });
    }, retransmissionTimeout);
  };

  return RWCFeersumClient;
}();

exports.default = RWCFeersumClient;
module.exports = exports['default'];