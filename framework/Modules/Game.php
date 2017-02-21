<?php

namespace SCRMHub\ActivationSDK\Modules;
use SCRMHub;
use SCRMHub\SDK\API;

class Game extends SCRMHub\ActivationSDK\BaseModule {
    private $api;

    public function __construct(\Silex\Application $app, $customKey, $moduleConfig) {
        parent::__construct($app, $customKey, $moduleConfig);

        $this->api = new API\Game();
    }

    private function getPlayerUuid() {
        return $this->app['page_controller']->get('puuid');
    }

    public function submitScore($score = null, $time = null) {
        $data = array(
            'gamekey' => $this->moduleConfig['key'],
        );

        if (!is_null($score)) {
            $data['score'] = $score;
        }

        if (!is_null($time)) {
            $data['time'] = $time;
        }

        $response = $this->api->submit($data);

        if (!$response->isOk()) {
            throw new \Exception("Unable to submit game score");
        }
    }

    public function getLeaderboard($limit = 10, $offset = 0, $orderBy = "score", $orderDirection = "desc") {
        $data = array(
            'gamekey' => $this->moduleConfig['key'],
            'order' . $orderBy => $orderDirection,
            'limit' => $limit,
            'offset' => $offset,
        );

        $response = $this->api->leaderboard($data);

        if (!$response->isOk()) {
            throw new \Exception("Unable to get leaderboard");
        }

        return $response->getResult();
    }

    public function getPlayerLeaderboard($limit = 5, $offset = 0, $orderBy = "score", $orderDirection = "desc") {
        $data = array(
            'gamekey' => $this->moduleConfig['key'],
            'order' . $orderBy => $orderDirection,
            'limit' => $limit,
            'offset' => $offset,
        );

        $response = $this->api->position($data);

        if (!$response->isOk()) {
            throw new \Exception("Unable to get player leaderboard");
        }

        return $response->getResult();
    }


    public function renderDefault($templateData = array()) {
        $templateData['leaderboard'] = $templateData['leaderboard'] ?: $this->getLeaderboard();
        $templateData['playerUuid']  = $this->getPlayerUuid();
        return $this->renderTemplate('default', $templateData);
    }

    public function renderPlayerLeaderboard($templateData = array()) {
        $templateData['playerLeaderboard'] = $templateData['playerLeaderboard'] ?: $this->getPlayerLeaderboard();
        $templateData['playerUuid'] = $this->getPlayerUuid();
        return $this->renderTemplate('player_leaderboard', $templateData);
    }
}