defineModule({
    twitterListener: false,
    domLink: {
        class: 'identity',
    },
    events: {
        'click [data-doshare]': 'doShare',
        'click [data-doconnect]': 'doConnect',
    },
    doShare: function(event) {
        event.preventDefault();

        var el  = $(event.target),
            url = el.attr('href');

        if (window.isWechat) {
            document.location = url;
        } else {
            this.windowOpen(url);
        }

        if(!this.twitterListener  && $(event.target).hasClass('twitter')) {
            window.addEventListener ? window.addEventListener("message", this.twitterCallback.bind(this), !1) : window.attachEvent("onmessage", this.twitterCallback.bind(this));

            this.twitterListener = true;
        }
    },
    twitterCallback: function (e) {
        if (e && e.data) {
            var data;

            try {
                data = JSON.parse(e.data);
            } catch(err) {
                // Don't care.
            }

            if (data && data.params && data.params.indexOf('tweet') > -1) {
                // hack to track correct identifier
                var identifier = document.querySelector("link[rel='canonical']").getAttribute("href") + window.puuid;
                this.app.dispatchActivity('social', 'share', 'twitter', identifier);
            }
        }
    },
    doConnect: function(event) {
        event.preventDefault();

        var el  = $(event.target),
            url = el.attr('href');

        if (window.isWechat) {
            document.location = url;
        } else {
            this.windowOpen(url);
        }
    },
    windowOpen: function(url) {
        var module = this;
        window.shareCompleted = function(details) { module.emit('share-complete', details); };
        window.connectCompleted = function(details) { module.emit('connect-complete', details); };

        shareWindow = window.open(url, 'scrmloginWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=1024,height=600');
    }
});