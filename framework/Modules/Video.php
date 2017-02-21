<?php

namespace SCRMHub\ActivationSDK\Modules;
use SCRMHub;

class Video extends SCRMHub\ActivationSDK\BaseModule {
    public function getRequiredAssets() {
        return array(
            'styles' => array(
                'assets/vendors/video-js/video-js.css',
            ),
            'scripts' => array(
                'assets/vendors/video-js/video.js',
            ),
        );
    }
}