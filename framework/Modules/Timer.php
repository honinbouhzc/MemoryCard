<?php

namespace SCRMHub\ActivationSDK\Modules;
use SCRMHub;

class Timer extends SCRMHub\ActivationSDK\BaseModule {
    public function renderDefault($templateData = []) {
        $templateData['current_counter'] = $this->getTime();

        return $this->renderTemplate('default', $templateData);
    }

    public function start($eventResponse) {
        $this->handleStart($eventResponse);
    }

    public function handleStart($eventResponse) {
        !$this->has('startTime') AND $this->set('startTime', time());

        $currentCounter = time() - $this->get('startTime');
        $eventResponse->callTimerStart($this->getId(), $currentCounter);
    }

    public function handleSync($eventResponse) {
        $eventResponse->callTimerSync($this->getId(), time() - $this->get('startTime'), $this->moduleConfig['duration']);
    }

    public function finish($eventResponse) {
        $this->handleFinish($eventResponse);
    }

    protected function handleFinish($eventResponse) {
        !$this->has('endTime') AND $this->set('endTime', time());

        $eventResponse->callTimerFinish($this->getId());
    }

    public function getTime() {
        $endTime = $this->has('endTime') ? $this->get('endTime') : time();
        return $this->has('startTime') ? $endTime - $this->get('startTime') : false;
    }

    public function clear($eventResponse) {
        $this->set('startTime', null);
        $this->set('endTime', null);
    }
}