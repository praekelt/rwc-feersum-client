// @ts-check
import SockJS from 'sockjs-client';

const feersumClient = {
    init(url) {
        this.messageHandlers = this.messageHandlers || [];
        this.closeHandlers = this.closeHandlers || [];
        this.passThroughHandlers = this.messageHandlers || [];

        this.handlers = {};

        return new Promise((resolve, reject) => {
            this.sock = new SockJS(url);
            this.sock.onopen = () => {
                this.bindReceiveHandler();
                this.bindCloseHandlers();
                resolve();
            };
            this.sock.onclose = ({ reason }) => reject(reason);
        });
    },

    send(message) {
        this.sock.send(message);
    },

    bindReceiveHandler(message) {
        this.sock.onmessage = ({ type, data }) => this.processResponse(this.handlers[type], data);
    },

    processResponse(handlers, data) {
        handlers.map(handler =>
            handler({
                ...JSON.parse(data),
                origin: 'remote'
            })
        );
    },

    bindMessageHandlers() {
        this.messageHandlers.map(fn => {
            this.sock.onmessage = ({ data }) =>
                fn({
                    ...JSON.parse(data),
                    origin: 'remote'
                });
        });
    },

    bindCloseHandlers() {
        this.closeHandlers.map(fn => (this.sock.onclose = fn));
    },

    onmessage(fn) {
        this.messageHandlers.push(fn);
        this.sock.onmessage = ({ data }) => {
            fn({
                ...JSON.parse(data),
                origin: 'remote'
            });
        };
    },

    onpassthrough(fn, data) {
        return data => fn(data);
    },

    onclose(fn) {
        this.closeHandlers.push(fn);
        this.sock.onclose = fn;
    }
};

export const feersumClientLegacy = {
    init(url) {
        this.messageHandlers = this.messageHandlers || [];
        this.closeHandlers = this.closeHandlers || [];
        return new Promise((resolve, reject) => {
            this.sock = new SockJS(url);
            this.sock.onopen = () => {
                this.bindMessageHandlers();
                this.bindCloseHandlers();
                resolve();
            };
            this.sock.onclose = ({ reason }) => reject(reason);
        });
    },

    send(message) {
        this.sock.send(message);
    },

    bindMessageHandlers() {
        this.messageHandlers.map(fn => {
            this.sock.onmessage = ({ data }) =>
                fn({
                    ...JSON.parse(data),
                    origin: 'remote'
                });
        });
    },

    bindCloseHandlers() {
        this.closeHandlers.map(fn => (this.sock.onclose = fn));
    },

    onmessage(fn) {
        this.messageHandlers.push(fn);
        this.sock.onmessage = ({ data }) =>
            fn({
                ...parseLegacy(JSON.parse(data)),
                origin: 'remote'
            });
    },

    onclose(fn) {
        this.closeHandlers.push(fn);
        this.sock.onclose = fn;
    }
};

var parseLegacy = data => {
    var newData = Object.assign({}, data);
    newData.pages = [];
    var pages = data.pages;

    pages.map(page => {
        var tempPage = Object.assign({}, page);
        tempPage.image = {};
        Object.keys(page).map(key => {
            if (key.includes('image_')) {
                tempPage.image[key.replace('image_', '')] = page[key];
                delete newData.property;
            }
        });
        if (Object.keys(tempPage.image).length) {
            newData.pages.push(tempPage);
        } else {
            newData.pages.push(page);
        }
    });

    return newData;
};

export default feersumClient;
