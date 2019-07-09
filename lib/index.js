'use strict';

exports.__esModule = true;

var _socket = require('socket.io-client');

var _socket2 = _interopRequireDefault(_socket);

var _parsers = require('./parsers');

var _parsers2 = _interopRequireDefault(_parsers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } // @ts-check


/** A network transport client that handles network connections and message transformations */
var RWCFeersumClient = function () {
  function RWCFeersumClient(_ref) {
    var url = _ref.url,
        config = _ref.config;

    _classCallCheck(this, RWCFeersumClient);

    this.url = url;
    this.transportServerUrl = config.transportServerUrl;
    this.channelId = config.channel_id;
    this.config = {
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
    var _this2 = this;

    return new Promise(function (resolve, reject) {
      _this2.sock = (0, _socket2.default)(_this2.transportServerUrl + '/socket?channel_id=' + _this2.channelId + '&engine=' + _this2.url);
      var _this = _this2;

      _this2.sock.on('connect', function () {
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
      });

      _this2.sock.on('disconnect', function (err) {
        _this2.sockReady = false;
        _this2.handlers.connection.close(err);
        reject(err);
        if (_this2.retryAllowed) {
          _this2.retryAllowed = false;
          _this2.connectionRetry();
        }
      });
    });
  };

  RWCFeersumClient.prototype.send = function send(message) {
    !this.sockReady ? this.queue.push(message) : this.sock.emit('message', JSON.stringify({
      type: 'message',
      message: this.parser.format(message)
    }));
  };

  RWCFeersumClient.prototype.bindReceiveHandler = function bindReceiveHandler(message) {
    var _this3 = this;

    this.sock.on('message', function (_ref2) {
      var channel_data = _ref2.channel_data;

      console.log(channel_data);
      var data = _this3.parser.parse(channel_data);
      data.origin = 'remote';
      _this3.handlers[channel_data.type](data);
    });
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