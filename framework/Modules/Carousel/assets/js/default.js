$(document).on('ready', function() {
    defineModule({
        domLink: {
            class: 'carousel'
        },

        initialize: function() {
            var _CaptionTransitions = [];
            _CaptionTransitions["FADE"] = { $Duration: 600, $Opacity: 2 };
            _CaptionTransitions["CLIP|LR"] = { $Duration: 900, $Clip: 3, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 };

            var el = this.querySelector('.slider_container'),
                id = el.id,
                data = el.dataset,
                options = {
                    $AutoPlay: data.autoplay || false,
                    $AutoPlayInterval: data.interval * 1000,
                    $PlayOrientation: data.vertical ? 2 : 1,
                    $DragOrientation: data.vertical ? 2 : 1,
                    $FillMode: 1,
                    $SlideDuration: 1000,
                    $CaptionSliderOptions: {
                        $Class: $JssorCaptionSlider$,
                        $CaptionTransitions: _CaptionTransitions,
                        $PlayInMode: 1,
                        $PlayOutMode: 1
                    },
                    $BulletNavigatorOptions: {
                        $Class: $JssorBulletNavigator$,
                        $ChanceToShow: 2,
                        $AutoCenter: data.vertical ? 2 : 1,
                        $Steps: 1,
                        $Lanes: 1,
                        $SpacingX: 10,
                        $SpacingY: 10,
                        $Orientation: data.vertical ? 2 : 1
                    },
                    $ArrowNavigatorOptions: {
                        $Class: $JssorArrowNavigator$,
                        $ChanceToShow: 2,
                        $AutoCenter: data.vertical ? 1 : 2,
                    }
                };

            var slider  = new $JssorSlider$(id, options);
            this.slider = slider;
            this.slider.emit = this.emit.bind(this);
            var sliderWidth = $('#' + id).width();

            function ScaleSlider() {
                var parentWidth = $('#' + id).parent().width();
                if (parentWidth) {
                    if(sliderWidth >= parentWidth)
                        slider.$ScaleWidth(parentWidth);
                }
                else
                    window.setTimeout(ScaleSlider, 30);
            }

            ScaleSlider();

            $(window).bind("load", ScaleSlider);
            $(window).bind("resize", ScaleSlider);
            $(window).bind("orientationchange", ScaleSlider);
        }
    });
});