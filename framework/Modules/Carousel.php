<?php

namespace SCRMHub\ActivationSDK\Modules;
use SCRMHub;

class Carousel extends SCRMHub\ActivationSDK\BaseModule {
    public function getRequiredAssets() {
        return [
            'styles' => [],
            'scripts' => [
                'assets/vendors/slider-master/jssor.slider.mini.js',
            ],
        ];
    }
}