<?php

require_once dirname(__FILE__) . '/BasePage.php';
class Info extends BasePage {
    protected $modules = [
        'info-form',
        'memory',
        'timer',
    ];

    public function handleEvent($eventResponse, $data) {
        $eventKey = $eventResponse->getEventKey();
        $module = $eventResponse->getModule();
        $moduleId = $module ? $module->getId() : null;

        switch ([$moduleId, $eventKey]) {
            case ["info-form", "submit"]:
                require_once $this->app['path']['app'] . 'Acxiom.php';

                $nameKey = "d6c36218-63f9-40fd-824a-631283781247";
                $phoneKey = "b7f6356e-df0d-47c6-b511-348fe1bf1923";
                $name = $module->getFieldValue($data, $nameKey);
                $phone = $module->getFieldValue($data, $phoneKey);

                $identity = $this->getModule('identity-manager');
                $profile = $identity->getProfile(true);
                $wechatOpenId = $profile['networks']['wechat']['uuid'];
                if ($wechatOpenId) {
                    $acxiom = new Acxiom();
                    // $acxiom->update($wechatOpenId, [
                    //     'name' => $name,
                    //     'phone' => $phone,
                    //     ]);

                    $appConfig = $this->appConfig;
                    $lang = $this->app['locale'];
                    $message = $appConfig['smsCopy'][$lang];
                    // $acxiom->sendSms($phone, $message);
                }

                break;
        }
    }
}