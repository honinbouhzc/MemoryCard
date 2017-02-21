$(document).on('ready', function() {
    var registerPlayer = function(el, module) {
        var data = el.dataset,
            id = el.id,
            playerid = 'player-' + id;
            type = data.type;
            videoId = data.id;
            width = data.width;
            height = data.height;
            autoplay = data.autoplay;
            preload = data.preload;

        var options = {};
        var video = $(el).find('video');
        var player;

        if(isMobile)
            options.width  = "100%";
        else
            options.width  = width;

        options.height = height;
        options.preload = preload;
        options.controls = true;
        options.autoplay = autoplay == "1" ? true : false;

        $.get('assets/vendors/videos/' + type + '.php?id=' + videoId,
            function(response) {
                var sources = [];
                $.each(response.videos, function(quality, videos) {
                    $.each(videos, function(index, video) {
                        sources.push({
                            type: 'video/' + (video.type == 'flv' ? 'x-' : '') + video.type,
                            src: video.url
                        });
                    });
                });

                player = videojs(playerid, options);
                player.src(sources);

                var activityType = 'video';
                var target = data.type, identifier = data.id;
                player.on('play', function(event) {
                    module.app.dispatchActivity(activityType, 'play', target, identifier);
                    module.emit('play', {currentTime: event.currentTarget.currentTime});
                });

                player.on('ended', function(event) {
                    module.app.dispatchActivity(activityType, 'finished', target, identifier);
                    module.emit('finish');
                });

                player.on('seeking', function(event) {
                    module.emit('seek', {currentTime: event.currentTarget.currentTime});
                });

                player.on('seeked', function() {});

                player.on('pause', function(event) {
                    module.app.dispatchActivity(activityType, 'paused', target, identifier);
                    module.emit('pause', {currentTime: event.currentTarget.currentTime});
                });
            },
            "json"
        );
    };

    defineModule({
        name: 'video',

        domLink: {
            class: 'video'
        },

        initialize: function() {
            var el = this.querySelector('.player');

            registerPlayer(el, this);
        },
    });
});
