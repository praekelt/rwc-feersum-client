var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** A parser utility that transforms messages targeting various versions of the Feersum schema */
var FeersumParser = function () {
    function FeersumParser(_ref) {
        var version = _ref.version;

        _classCallCheck(this, FeersumParser);

        this.version = version;
    }

    FeersumParser.prototype.parse = function parse(data) {
        return parserVersionMap[this.version](data);
    };

    return FeersumParser;
}();

export { FeersumParser as default };


var parserVersionMap = {
    '0.9': parser09,
    '0.10': parser10
};

/**
 * Parser function for Feersum Schema v0.9
 * @link http://dev.feersum.io/static/help/transports/feersum09.html#message-send-data-format
 * @param {*} data
 */
var parser09 = function parser09(data) {
    var _data = Object.assign({}, data);
    _data.pages = [];
    var pages = data.pages;

    pages.map(function (page) {
        var tempPage = Object.assign({}, page);
        tempPage.image = {};
        Object.keys(page).map(function (key) {
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

    return _extends({}, JSON.parse(_data), {
        origin: 'remote'
    });
};

/**
 * Parser function for Feersum Schema v0.10
 * @param {*} data
 */
var parser10 = function parser10(data) {
    return _extends({}, JSON.parse(data), {
        origin: 'remote'
    });
};