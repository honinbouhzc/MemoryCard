defineModule({
    name: 'identity-wechat',

    domLink: {
        class: 'identity'
    },

    initialize: function() {
        if (typeof wx == 'undefined') {
            return;
        }

        wx.config(wechatShareConfig);

        var module = this;

        wx.ready(function () {
            wx.showOptionMenu();

            var activityType = 'social';
            var identifier = wechatShareData.hash;

            //Share to timeline
            wx.onMenuShareTimeline({
                title: wechatShareData.title,
                link: wechatShareData.link,
                imgUrl: wechatShareData.imgUrl,
                trigger: function (res) {
                    module.app.dispatchActivity(activityType, 'share-start', 'wechat', identifier);
                },
                success: function (res) {
                    module.app.dispatchActivity(activityType, 'share', 'wechat', identifier);
                },
                cancel: function (res) {
                    module.app.dispatchActivity(activityType, 'share-cancelled', 'wechat', identifier);
                },
                fail: function (res) {
                    // alert(JSON.stringify(res));
                }
            });

            //Share an app message
            wx.onMenuShareAppMessage({
                title: wechatShareData.title,
                desc: wechatShareData.desc,
                link: wechatShareData.link,
                imgUrl: wechatShareData.imgUrl,
                trigger: function (res) {
                    module.app.dispatchActivity(activityType, 'share-start', 'wechat', identifier);
                },
                success: function (res) {
                    module.app.dispatchActivity(activityType, 'share', 'wechat', identifier);
                },
                cancel: function (res) {
                    module.app.dispatchActivity(activityType, 'share-cancelled', 'wechat', identifier);
                },
                fail: function (res) {
                    // alert(JSON.stringify(res));
                }
            });

            //Share an app message
            wx.onMenuShareQQ({
                title: wechatShareData.title,
                desc: wechatShareData.desc,
                link: wechatShareData.link,
                imgUrl: wechatShareData.imgUrl,
                trigger: function (res) {
                    module.app.dispatchActivity(activityType, 'share-start', 'qq', identifier);
                },
                success: function (res) {
                    module.app.dispatchActivity(activityType, 'share', 'qq', identifier);
                },
                cancel: function (res) {
                    module.app.dispatchActivity(activityType, 'share-cancelled', 'qq', identifier);
                },
                fail: function (res) {
                    // alert(JSON.stringify(res));
                }
            });

            //Share an app message
            wx.onMenuShareWeibo({
                title: wechatShareData.title,
                desc: wechatShareData.desc,
                link: wechatShareData.link,
                imgUrl: wechatShareData.imgUrl,
                trigger: function (res) {
                    module.app.dispatchActivity(activityType, 'share-start', 'weibo', identifier);
                },
                success: function (res) {
                    module.app.dispatchActivity(activityType, 'share', 'weibo', identifier);
                },
                cancel: function (res) {
                    module.app.dispatchActivity(activityType, 'share-cancelled', 'weibo', identifier);
                },
                fail: function (res) {
                    // alert(JSON.stringify(res));
                }
            });

            //Share an app message
            wx.onMenuShareQZone({
                title: wechatShareData.title,
                desc: wechatShareData.desc,
                link: wechatShareData.link,
                imgUrl: wechatShareData.imgUrl,
                trigger: function (res) {
                    module.app.dispatchActivity(activityType, 'share-start', 'qzone', identifier);
                },
                success: function (res) {
                    module.app.dispatchActivity(activityType, 'share', 'qzone', identifier);
                },
                cancel: function (res) {
                    module.app.dispatchActivity(activityType, 'share-cancelled', 'qzone', identifier);
                },
                fail: function (res) {
                    // alert(JSON.stringify(res));
                }
            });
        });

        wx.error(function (res) {
            console.log(res.errMsg);
        });
    }
});