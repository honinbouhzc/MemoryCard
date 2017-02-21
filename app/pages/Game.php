<?php

class Game extends SCRMHub\ActivationSDK\BasePage {
    protected $modules = [
        'memory',
        'memory-hard',
        'timer',
        'timer-long',
    ];

    public function render() {
        $app = $this->app;

        $timer = $this->getModule('timer');
        $timer->clear(null);
        $timerLong = $this->getModule('timer-long');
        $timerLong->clear(null);

        $images = [];
        $lang = $app['locale'];
        $memoryConfig = $this->appConfig['modules']['memory']['config'];
        $images = array_merge($memoryConfig['cards'], ['assets/img/cards/backside.png']);
        $images = array_unique($images);

        $template = '@Pages/' . $this->getPageId() . '.html.twig';
        $modules = $this->getModules();
        $templateData = array(
            'modules' => $modules,
            'images' => !empty($images) ? implode(',', $images) : '',
        );

        foreach ($modules as $module) {
            $module->preload();
        }

        return $app['twig']->render($template, $templateData);
    }

    private function processWin($eventResponse) {
        $timer = $this->getModule('timer');
        $timer->finish($eventResponse);

        $eventResponse->callForward('win');
    }

    public function handleEvent($eventResponse, $data) {
        $eventKey = $eventResponse->getEventKey();
        $module = $eventResponse->getModule();
        $moduleId = $module ? $module->getId() : null;
        $memory = $this->getModule('memory');
        $timer = $this->getModule('timer');
        $timerLong = $this->getModule('timer-long');

        switch ([$moduleId, $eventKey]) {
            case ([null, "startGame"]):
                switch ($data["difficulty"]) {
                    case "2":
                        $timerLong->start($eventResponse);
                        $eventResponse->callShow('.timer-long-ctrl');
                        $eventResponse->callShow('.memory-hard-ctrl');
                        break;
                    case "3":
                        $timer->start($eventResponse);
                        $eventResponse->callShow('.timer-ctrl');
                        $eventResponse->callShow('.memory-hard-ctrl');
                        break;
                    case "1":
                    default:
                        $timer->start($eventResponse);
                        $eventResponse->callShow('.timer-ctrl');
                        $eventResponse->callShow('.memory-ctrl');
                }
                break;

            case ["memory", "finish"]:
            case ["memory-hard", "finish"]:
                $this->processWin($eventResponse);
                break;

            case ["timer", "finish"]:
            case ["timer-long", "finish"]:
                if ($memory->isFinished()) {
                    $this->processWin($eventResponse);
                } else {
                    $eventResponse->callForward('timeout');
                }
                break;
        }
    }
}