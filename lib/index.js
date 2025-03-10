'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

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
    var _this = this;

    var url = _ref.url,
        config = _ref.config,
        _ref$sockjsOptions = _ref.sockjsOptions,
        sockjsOptions = _ref$sockjsOptions === undefined ? {} : _ref$sockjsOptions;

    _classCallCheck(this, RWCFeersumClient);

    this.baseUrl = url; // Store base URL
    this.config = {
      channel_id: config.channel_id,
      address: config.address || (0, _utils.randId)(),
      startNew: config.startNew || true,
      retransmissionTimeout: config.retransmissionTimeout || 1000,
      retransmissionMaxTimeout: config.retransmissionMaxTimeout || 20000,
      retransmissionAttempts: config.retransmissionAttempts || 100
    };
    this.currentServer = Math.floor(Math.random() * 999) + 1;

    // Initialize with default sockjsOptions that includes our server number generator
    this.sockjsOptions = _extends({}, sockjsOptions, {
      server: sockjsOptions.server || function () {
        // Default server number generator if none provided
        _this.currentServer = _this.currentServer % 999 + 1;
        return _this.currentServer.toString().padStart(3, '0');
      }
    });
    this.retryAllowed = true;
    this.sockReady = false;
    this.queue = [];
    this.parser = new _parsers2.default({
      version: config.schemaVersion || '0.9'
    }).parser();
  }

  /**
   * Open the socket connection and bind all handlers.
   * @return {Promise<void>} A promise which gets resolved when a connection is opened.
   */


  RWCFeersumClient.prototype.open = function open() {
    var _this2 = this;

    return new Promise(function (resolve, reject) {
      var fullUrl = '' + _this2.baseUrl; // SockJS will append server number

      _this2.sock = new _sockjsClient2.default(fullUrl, null, _extends({
        sessionId: function sessionId() {
          return _this2.config.address;
        }
      }, _this2.sockjsOptions));

      _this2.sock.onopen = function () {
        _this2.sock.send(JSON.stringify({
          type: 'connect',
          channel_id: _this2.config.channel_id,
          start: _this2.config.startNew
        }));
        _this2.config.startNew = false;
        _this2.retryAllowed = true;
        _this2.queue.map(function (message) {
          _this2.send(message);
        });
        _this2.queue = [];
        _this2.sockReady = true;
        _this2.bindReceiveHandler();
        _this2.handlers.connection.open();
        resolve();
      };

      _this2.sock.onclose = function (err) {
        _this2.sockReady = false;
        _this2.handlers.connection.close(err);
        reject(err);
        if (_this2.retryAllowed) {
          _this2.retryAllowed = false;
          _this2.connectionRetry();
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
    var _this3 = this;

    this.sock.onmessage = function (_ref2) {
      var type = _ref2.type,
          data = _ref2.data;

      data = _this3.parser.parse(JSON.parse(data));
      data.origin = 'remote';
      _this3.handlers[type](data);
    };
  };

  RWCFeersumClient.prototype.connectionRetry = function connectionRetry() {
    var _this4 = this;

    var count = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var _config = this.config,
        retransmissionAttempts = _config.retransmissionAttempts,
        retransmissionMaxTimeout = _config.retransmissionMaxTimeout;


    var retransmissionTimeout = this.config.retransmissionTimeout * (count + 1);

    retransmissionTimeout = retransmissionTimeout > retransmissionMaxTimeout ? retransmissionMaxTimeout : retransmissionTimeout;

    if (count < retransmissionAttempts) setTimeout(function () {
      return _this4.open().catch(function (err) {
        _this4.connectionRetry(count + 1);
      });
    }, retransmissionTimeout);
  };

  return RWCFeersumClient;
}();

exports.default = RWCFeersumClient;
module.exports = exports['default'];