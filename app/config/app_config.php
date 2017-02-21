<?php

$config =array (
    'min_correct_answers' => 10,
    'smsCopy' => [
        'en' => 'Congratulations! Follow the official Jameson尊美醇 WeChat account for updates, events, and all things Jameson Irish Whiskey.',
        'cn' => '为你的成功闯关干杯！关注Jameson尊美醇官方微信，更多惊喜和威士忌在等你！',
    ],
    'core' =>
        array (
            'uuid' => '42c76d43-a8d9-4b84-411c-29678de7a21d',
            'secret' => 'UcDImReE5XsX9u2M4NtuYIKztaLFObbW',
            'name' => 'Memory game',
            'description' => 'Memory game',
            'use_wildcard_domain' => true,
            'locations' => array (
                0 =>
                    array (
                        'url' => 'weixin://MzAxOTI2NDM1Ng==',
                        'type' => 'wechat',
                        'page_external_id' => 'wx2e26937f6b7e4ed3',
                        'api_token' => '964211a9-4abd-a784-2de1-e703f621fff1',
                        'wildcard_domain' => 'wx2e26937f6b7e4ed3',
                    ),
                ),
        ),
    'global_modules' => [
        'identity-manager'
    ],
    'modules' => [
        "info-form" => [
            "module_class" => "SCRMHub\ActivationSDK\Modules\Form",
            "config" => include "form.php",
        ],
        "timer" => [
            "module_class" => "SCRMHub\ActivationSDK\Modules\Timer",
            "config" => array(
                "duration" => 60,
                "direction" => "down",
                "interval" => 5,
//                'autostart' => true,
            )
        ],
        "timer-long" => [
            "module_class" => "SCRMHub\ActivationSDK\Modules\Timer",
            "config" => array(
                "duration" => 120,
                "direction" => "down",
                "interval" => 5,
//                'autostart' => true,
            )
        ],
        "memory" => array(
            "module_class" => "SCRMHub\ActivationSDK\Modules\MemoryCard",
            "config" => array(
                "match_count" => 2,
                "rotate_on_match" => false,
                "rotate_chance" => 0.25,
                "validation_type" => "client",
                "cards" => array(
                    "assets/img/cards/1.png",
                    "assets/img/cards/2.png",
                    "assets/img/cards/3.png",
                    "assets/img/cards/4.png",
                    "assets/img/cards/5.png",
                    "assets/img/cards/6.png",
                    "assets/img/cards/7.png",
                    "assets/img/cards/8.png",
                ),
            ),
        ),
        "memory-hard" => array(
            "module_class" => "SCRMHub\ActivationSDK\Modules\MemoryCard",
            "config" => array(
                "match_count" => 2,
                "rotate_on_match" => true,
                "rotate_chance" => 0.5,
                "validation_type" => "client",
                "cards" => array(
                    "assets/img/cards/1.png",
                    "assets/img/cards/2.png",
                    "assets/img/cards/3.png",
                    "assets/img/cards/4.png",
                    "assets/img/cards/5.png",
                    "assets/img/cards/6.png",
                    "assets/img/cards/7.png",
                    "assets/img/cards/8.png",
                ),
            ),
        ),
        "identity-manager" => array(
            "module_class" => "SCRMHub\ActivationSDK\Modules\Identity",
            "config" => include "identity.php",
        ),
    ],
);

return $config;