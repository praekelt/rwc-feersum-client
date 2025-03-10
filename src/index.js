// @ts-check
import SockJS from 'sockjs-client';

import FeersumParser from './parsers';
import { randId } from './utils';

/** A network transport client that handles network connections and message transformations */
class RWCFeersumClient {
  constructor({ url, config, sockjsOptions = {} }) {
    this.baseUrl = url;  // Store base URL
    this.config = {
      channel_id: config.channel_id,
      address: config.address || randId(),
      startNew: config.startNew || true,
      retransmissionTimeout: config.retransmissionTimeout || 1000,
      retransmissionMaxTimeout: config.retransmissionMaxTimeout || 20000,
      retransmissionAttempts: config.retransmissionAttempts || 100
    };
    this.currentServer = Math.floor(Math.random() * 999) + 1;
    
    // Initialize with default sockjsOptions that includes our server number generator
    this.sockjsOptions = {
      ...sockjsOptions,
      server: sockjsOptions.server || (() => {
        // Default server number generator if none provided
        this.currentServer = (this.currentServer % 999) + 1;
        return this.currentServer.toString().padStart(3, '0');
      })
    };
    this.retryAllowed = true;
    this.sockReady = false;
    this.queue = [];
    this.parser = new FeersumParser({
      version: config.schemaVersion || '0.9'
    }).parser();
  }

  /**
   * Open the socket connection and bind all handlers.
   * @return {Promise<void>} A promise which gets resolved when a connection is opened.
   */
  open() {
    return new Promise((resolve, reject) => {
      const fullUrl = `${this.baseUrl}`;  // SockJS will append server number

      this.sock = new SockJS(fullUrl, null, {
        sessionId: () => this.config.address,
        ...this.sockjsOptions
      });
      
      this.sock.onopen = () => {
        this.sock.send(
          JSON.stringify({
            type: 'connect',
            channel_id: this.config.channel_id,
            start: this.config.startNew
          })
        );
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
      };
      
      this.sock.onclose = err => {
        this.sockReady = false;
        this.handlers.connection.close(err);
        reject(err);
        if (this.retryAllowed) {
          this.retryAllowed = false;
          this.connectionRetry();
        }
      };
    });
  }

  send(message) {
    !this.sockReady
      ? this.queue.push(message)
      : this.sock.send(
          JSON.stringify({
            type: 'message',
            message: this.parser.format(message)
          })
        );
  }

  bindReceiveHandler(message) {
    this.sock.onmessage = ({ type, data }) => {
      data = this.parser.parse(JSON.parse(data));
      data.origin = 'remote';
      this.handlers[type](data);
    };
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
