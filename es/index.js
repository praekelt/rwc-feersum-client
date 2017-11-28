var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// @ts-check
import SockJS from 'sockjs-client';

import FeersumParser from './parsers';

/** A network transport client that handles network connections and message transformations */

var RWCFeersumClient = function () {
    function RWCFeersumClient(_ref) {
        var url = _ref.url,
            config = _ref.config;

        _classCallCheck(this, RWCFeersumClient);

        this.url = url;
        this.config = config;
        this.parser = new FeersumParser({
            version: config.schemaVersion
        });
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
            _this.sock = new SockJS(_this.url);
            _this.sock.onopen = function () {
                _this.bindReceiveHandler();
                _this.handlers.connection.open();
                resolve();
            };
            _this.sock.onclose = function (err) {
                _this.handlers.connection.close(err);
                reject(err);
            };
        });
    };

    RWCFeersumClient.prototype.send = function send(message) {
        this.sock.send(_extends({
            message: message
        }, this.config.meta));
    };

    RWCFeersumClient.prototype.bindReceiveHandler = function bindReceiveHandler(message) {
        var _this2 = this;

        this.sock.onmessage = function (_ref2) {
            var type = _ref2.type,
                data = _ref2.data;
            return _this2.handlers[type](_this2.parser.parse(data));
        };
    };

    RWCFeersumClient.prototype.connectionRetry = function connectionRetry() {
        var _this3 = this;

        var count = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        var _config$network = this.config.network,
            retransmissionTimeout = _config$network.retransmissionTimeout,
            retransmissionAttempts = _config$network.retransmissionAttempts;


        if (count < retransmissionAttempts) setTimeout(function () {
            return _this3.open().catch(function (err) {
                _this3.connectionRetry(count + 1);
            });
        }, retransmissionTimeout);
    };

    return RWCFeersumClient;
}();

export default RWCFeersumClient;