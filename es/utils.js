export var randId = function randId() {
    return Array.apply(null, new Array(22)).map(function () {
        return function (charset) {
            return charset.charAt(Math.floor(Math.random() * charset.length));
        }("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
    }).join("");
};