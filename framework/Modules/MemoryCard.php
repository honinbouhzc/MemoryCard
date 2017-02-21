<?php

namespace SCRMHub\ActivationSDK\Modules;
use SCRMHub;

class MemoryCard extends SCRMHub\ActivationSDK\BaseModule {
    private function setMatched(array $values) {
        $matchedCards = $this->get('matchedCards', []);
        $this->set('matchedCards', array_merge($matchedCards, $values));
    }

    public function renderDefault($templateData = []) {
        $configCards = $this->moduleConfig['cards'];
        $countCards = count($configCards);
        $cards = [];

        for ($i=0; $i < ($countCards * $this->moduleConfig['match_count']); $i++) {
            $id = ($i % $countCards) + 1;
            $cards[] = ['id' => $id, 'img' => $configCards[$id - 1]];
        }

        shuffle($cards);

        $templateData['cards'] = $cards;

        $this->set('cards', $cards);
        $this->set('matchedCards', []);

        return $this->renderTemplate('default', $templateData);
    }

    public function handleCardSelected($eventResponse, $data) {
        if (($cards = $this->get('cards')) && isset($cards[$data['value']])) {
            $eventResponse->callModule($this->getId(), 'displayCallback', $data['value'], $cards[$data['value']]['img']);
        }
    }

    public function handleMatched($eventResponse, $data) {
        $this->handleCheckCards($eventResponse, $data, false);
    }

    public function handleCheckCards($eventResponse, $data, $setCallbacks = true) {
        $values = $data['values'];
        if (($cards = $this->get('cards'))
            && !empty($values)
            && is_array($values)
            && count($values) == $this->moduleConfig['match_count']
        ) {
            $lastValue = null;
            foreach ($values as $value) {
                if (isset($lastValue)) {
                    if($cards[$lastValue]['id'] != $cards[$value]['id']) {
                        $eventResponse->callModule($this->getId(), 'turnCards', $data['values']);
                        return;
                    }
                }

                $lastValue = $value;
            }

            $this->setMatched($values);

            $setCallbacks AND $eventResponse->callModule($this->getId(), 'matchCards', $data['values']);

            if($setCallbacks && $this->isFinished()) {
                $eventResponse->callModule($this->getId(), 'finish');
            }

            return;
        }

        $setCallbacks AND $eventResponse->callModule($this->getId(), 'turnCards', $data['values']);
    }

    public function isFinished() {
        $cards = $this->get('cards');
        $matchedCards = $this->get('matchedCards');
        sort($matchedCards);

        return count($matchedCards) == count($cards) && array_keys($cards) == array_values($matchedCards);
    }
}