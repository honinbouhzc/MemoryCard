<?php

namespace SCRMHub\ActivationSDK;

class EventResponse {
    private $calls;
    private $eventKey;
    private $module;

    public function __construct($eventKey, $module) {
        $this->calls = array();
        $this->setEventKey($eventKey);
        $this->setModule($module);
    }

    public function setEventKey($eventKey) {
        $this->eventKey = $eventKey;
    }

    public function getEventKey() {
        return $this->eventKey;
    }

    public function setModule($module) {
        $this->module = $module;
    }

    public function getModule() {
        return $this->module;
    }

    public function __call ($name, $arguments) {
        if (preg_match('/call(.*)/', $name, $matches)) {
            $funcName = lcfirst($matches[1]);

            $this->calls[] = array(
                "function" => $funcName,
                "arguments" => (array) $arguments,
            );
        }
    }

    public function getCalls() {
        return $this->calls;
    }
}