// @ts-check
import SockJS from 'sockjs-client';

import FeersumParser from './parsers';

/** A network transport client that handles network connections and message transformations */
class RWCFeersumClient {
    constructor({ url, config }) {
        this.url = url;
        this.config = config;
        this.parser = new FeersumParser({
            version: config.schemaVersion
        });
    }

    init(handlers) {
        this.handlers = handlers;
        return this.open();
    }

    /**
     * Open the socket connection and bind all handlers.
     * @return {promise} A promise which gets resolved when a connection is opened.
     */
    open() {
        return new Promise((resolve, reject) => {
            this.sock = new SockJS(this.url);
            this.sock.onopen = () => {
                this.bindReceiveHandler();
                this.handlers.connection.open();
                resolve();
            };
            this.sock.onclose = err => {
                this.handlers.connection.close(err);
                reject(err);
            };
        });
    }

    send(message) {
        this.sock.send({
            message,
            ...this.config.meta
        });
    }

    bindReceiveHandler(message) {
        this.sock.onmessage = ({ type, data }) =>
            this.handlers[type](this.parser.parse(data));
    }

    connectionRetry(count = 0) {
        let {
            retransmissionTimeout,
            retransmissionAttempts
        } = this.config.network;

        if (count < retransmissionAttempts)
            setTimeout(
                () =>
                    this.open().catch(err => {
                        this.connectionRetry(count + 1);
                    }),
                retransmissionTimeout
            );
    }
}

export default RWCFeersumClient;
