<?php

class BasePage extends SCRMHub\ActivationSDK\BasePage {
    protected $modules = [
        'memory',
    ];

    public function preload() {
        $memory = $this->getModule('memory');

        // $correctCount = $pairs->getAnsweredQuestionsCorrectCount();
        // $correctCount = $correctCount ?: $pairs->getCorrectCount();

        // $minCorrectAnswers = $this->appConfig['min_correct_answers'];

        // if ( !$correctCount || $correctCount < $minCorrectAnswers ) {
            // $this->app['page_controller']->forward('pair');
        // }
    }
}