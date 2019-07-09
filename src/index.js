// @ts-check
import io from 'socket.io-client';

import FeersumParser from './parsers';

/** A network transport client that handles network connections and message transformations */
class RWCFeersumClient {
  constructor({ url, config }) {
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
    this.parser = new FeersumParser({
      version: config.schemaVersion || '0.9'
    }).parser();
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
      this.sock = io(
        `${this.transportServerUrl}/socket?channel_id=${
          this.channelId
        }&engine=${this.url}`
      );
      const _this = this;

      this.sock.on('connect', () => {
        this.config.startNew = false;
        this.retryAllowed = true;
        this.queue.map(message => {
          this.send(message);
        });
        this.queue = [];
        this.sockReady = true;
        this.bindReceiveHandler();
        this.handlers.connection.open();
        resolve();
      });

      this.sock.on('disconnect', err => {
        this.sockReady = false;
        this.handlers.connection.close(err);
        reject(err);
        if (this.retryAllowed) {
          this.retryAllowed = false;
          this.connectionRetry();
        }
      });
    });
  }

  send(message) {
    !this.sockReady
      ? this.queue.push(message)
      : this.sock.emit(
          'message',
          JSON.stringify({
            type: 'message',
            message: this.parser.format(message)
          })
        );
  }

  bindReceiveHandler(message) {
    this.sock.on('message', ({ channel_data }) => {
      let data = this.parser.parse(channel_data);
      data.origin = 'remote';
      this.handlers[channel_data.type](data);
    });
  }

  connectionRetry(count = 0) {
    let { retransmissionAttempts, retransmissionMaxTimeout } = this.config;

    let retransmissionTimeout = this.config.retransmissionTimeout * (count + 1);

    retransmissionTimeout =
      retransmissionTimeout > retransmissionMaxTimeout
        ? retransmissionMaxTimeout
        : retransmissionTimeout;

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
