function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** A parser utility that transforms messages targeting various versions of the Feersum schema */
var FeersumParser = function () {
    function FeersumParser(_ref) {
        var version = _ref.version;

        _classCallCheck(this, FeersumParser);

        this.version = version;
    }

    FeersumParser.prototype.parser = function parser() {
        return parserVersionMap[this.version];
    };

    return FeersumParser;
}();

/**
 * Parser function for Feersum Schema v0.9
 * @link http://dev.feersum.io/static/help/transports/feersum09.html#message-send-data-format
 * @param {*} data
 */


export { FeersumParser as default };
var parser09 = {
    parse: function parse(data) {
        var _data = Object.assign({}, data);
        _data.pages = [];
        var pages = data.pages;

        pages.map(function (page) {
            var tempPage = Object.assign({}, page);
            tempPage.image = {};
            Object.keys(page).map(function (key) {
                if (key.includes("image_")) {
                    tempPage.image[key.replace("image_", "")] = page[key];
                    delete _data.property;
                }
            });
            if (Object.keys(tempPage.image).length) {
                _data.pages.push(tempPage);
            } else {
                _data.pages.push(page);
            }
        });

        return _data;
    },
    format: function format(data) {
        return data.type === "text" ? {
            content: data.text
        } : data.type === "button" ? { postback: data.postback } : { content: "" };
    }
};

/**
 * Parser function for Feersum Schema v0.10
 * @param {*} data
 */
var parser10 = {
    parse: function parse(data) {
        return data;
    },
    format: function format(data) {
        return data;
    }
};

var parserVersionMap = {
    "0.9": parser09,
    "0.10": parser10
};