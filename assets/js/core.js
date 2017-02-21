replaceWith = function(selector, html) {
    $(selector).html(html);
};

reload = function() {
    location.reload();
};

forward = function(url) {
    window.location.href=url;
};

rotate = function(selector, deg) {
    $(selector).attr('style', '-webkit-transform: rotate(' + deg + 'deg);');
};

var moduleConfigs = [];
function defineModule(moduleConfig) {
    if ( Array.isArray(moduleConfig) ) {
        for ( var i in moduleConfig ) defineModule(moduleConfig[i]);
        return;
    }
    moduleConfigs.push(moduleConfig);
}
function constructApp() {
    if ( typeof window.appAutoConstruct == 'boolean' && window.appAutoConstruct === false ) return;

    // To make the App object inaccessible, simply remove the window.debugApp = portion of the below call - this is more secure and prevents accessing modules from the dev console
    window.debugApp = new App({
        id: appkey,
        modules: moduleConfigs,
        __DEV__: true,
        publicApi: true
    });
}
if (['complete', 'interactive'].indexOf(document.readyState) !== -1) {
    constructApp();
} else {
    document.addEventListener("DOMContentLoaded", constructApp);
}

var preloadPictures = function(pictureUrls, callback) {
    var i,
        j,
        loaded = 0;

    for (i = 0, j = pictureUrls.length; i < j; i++) {
        (function (img, src) {
            img.onload = function () {
                if (++loaded == pictureUrls.length && callback) {
                    callback();
                }
            };

            img.src = src;
        } (new Image(), pictureUrls[i]));
    }
};

if (typeof gameImages != 'undefined') {
    pictureUrls = gameImages.split(',');
    preloadPictures(pictureUrls, function () {
        $('#play-btn').removeAttr("disabled");
        $('.loading').hide();
        $('.play').show();
    });
}

$("#play-btn").click(function() {
    var difficulty = $('[name=difficulty]:checked').val();
    $('.claw').show();

    setTimeout(function() {
        window.debugApp.dispatch(null, 'startGame', {difficulty: difficulty}).then(function () {
            $('.claw').hide();
            $('.play').hide();
            $('footer').hide();
            $('.rules-title').hide();

            $('.timer-container').show();
            $('.container-fluid').addClass('game-mode');
            $('.gameContainer').show(300);
        });
    }, 600);
});

$(document).on('ready', function() {
    $('[for=form-51a142c5-3027-89f4-6db6-510c54e28a1b_a749f1c3-c616-4fbe-9973-ecb1c9e0b704_placeholder]').parent().remove();
});