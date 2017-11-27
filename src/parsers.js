/** A parser utility that transforms messages targeting various versions of the Feersum schema */
export default class FeersumParser {
    constructor({ version }) {
        this.version = version;
    }

    parse(data) {
        return parserVersionMap[this.version](data);
    }
}

const parserVersionMap = {
    '0.9': parser09,
    '0.10': parser10
};

/**
 * Parser function for Feersum Schema v0.9
 * @link http://dev.feersum.io/static/help/transports/feersum09.html#message-send-data-format
 * @param {*} data
 */
const parser09 = data => {
    var _data = Object.assign({}, data);
    _data.pages = [];
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
            _data.pages.push(tempPage);
        } else {
            _data.pages.push(page);
        }
    });

    return {
        ...JSON.parse(_data),
        origin: 'remote'
    };
};

/**
 * Parser function for Feersum Schema v0.10
 * @param {*} data
 */
const parser10 = data => ({
    ...JSON.parse(data),
    origin: 'remote'
});
