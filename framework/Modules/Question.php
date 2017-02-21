<?php

namespace SCRMHub\ActivationSDK\Modules;

use SCRMHub;
use SCRMHub\SDK\API;

class NoAnswerException extends \Exception {}

class Question extends SCRMHub\ActivationSDK\BaseModule {
    protected $questionKeys;
    protected $questionIndex;
    protected $selectedAnswers;
    protected $results;

    public function __construct(\Silex\Application $app, $customKey, $moduleConfig) {
        parent::__construct($app, $customKey, $moduleConfig);

        if ($this->has('question_keys')) {
            $this->questionKeys = $this->get('question_keys');
            $this->questionIndex = $this->get('question_index', 1);
            $this->selectedAnswers = $this->get('selected_answers', array());
        } else {
            $this->resetQuestions();
        }

        $this->results = $this->get('results', array());
    }

    public function reset() {
        $this->resetQuestions();
        $this->resetResults();
    }

    private function resetQuestions() {
        $questions = $this->moduleConfig['questions'];
        $this->questionKeys = array();
        $this->questionIndex = 1;
        $this->selectedAnswers = array();

        $keys = array_keys($questions);

        if ($this->moduleConfig['random_questions']) {
            shuffle($keys);
        }

        $questionKeys = array();
        foreach ($keys as $key) {
            $question = $questions[$key];
            $questionKey = array(
                "key" => $key,
                "answer_keys" => array_keys($question['answer_choices']),
            );
            $questionKeys[] = $questionKey;
        }

        $this->questionKeys = $questionKeys;

        foreach ($this->questionKeys as &$questionKey) {
            $question = $questions[$questionKey['key']];
            if ($question['question_type'] == 'boolean') {
                continue;
            }

            $answerKeys = $questionKey['answer_keys'];
            if ($this->moduleConfig['random_answers']) {
                shuffle($answerKeys);
            }

            $questionKey['answer_keys'] = $answerKeys;
        }

        $this->set('question_keys', $this->questionKeys);
        $this->set('question_index', $this->questionIndex);
        $this->set('selected_answers', $this->selectedAnswers);
    }

    private function resetResults() {
        $this->set('results', []);
    }

    private function buildQuestion($questionKey) {
        $questions = $this->moduleConfig['questions'];
        $questionKey = $this->questionKeys[$this->questionIndex - 1];
        $question = $questions[$questionKey['key']];
        $question['key'] = $questionKey['key'];
        $question['timer'] = (!$question['is_flashcard']) ? 0 : $this->moduleConfig['flashcard_timer'];

        $answerChoices = $question['answer_choices'];
        $answerKeys = $questionKey['answer_keys'];
        $newAnswerChoices = array();

        foreach ($answerKeys as $answerKey) {
            $answerChoice = $answerChoices[$answerKey];
            $answerChoice['key'] = $answerKey;
            $newAnswerChoices[] = $answerChoice;
        }
        $question['answer_choices'] = $newAnswerChoices;

        return $question;
    }

    private function storeAnswer($data) {
        $questions = $this->moduleConfig['questions'];
        $questionKey = $this->questionKeys[$this->questionIndex - 1];
        $key = (int) $questionKey['key'];
        $answerKeys = array_map('intval', (array) $data['answer_keys']);

        if (empty($answerKeys)) {
            throw new NoAnswerException("Answer is required");
        }

        if (!is_null($answerKeys)) {
            // TODO: check answer is valid
            $this->selectedAnswers[$this->questionIndex] = array(
                'question_key' => $key,
                'answer_keys' => $answerKeys,
            );

            $this->set('selected_answers', $this->selectedAnswers);
        }
    }

    protected function getTemplateData() {
        $questionKey = $this->questionKeys[$this->questionIndex - 1];
        $question = $this->buildQuestion($questionKey);

        return array(
            'question' => $question,
            'question_index' => $this->questionIndex,
            'question_total' => $this->getTotalCount(),
        );
    }

    protected function getResultsTemplateData() {
        return array(
            'correct_count' => $this->getCorrectCount(),
            'total_count' => $this->getTotalCount(),

            'percentage' => $this->getPercentage(),

            'outcome' => $this->getOutcome(),
            'selected_answers' => $this->selectedAnswers,
        );
    }

    public function getCorrectCount() {
        $questions = $this->moduleConfig['questions'];
        $selectedAnswers = $this->results['selected_answers'];

        $correctCount = 0;
        if (is_array($selectedAnswers)) foreach ($selectedAnswers as $questionIndex => $selectedAnswer) {
            $questionKey = $selectedAnswer['question_key'];
            $answerKeys = $selectedAnswer['answer_keys'];

            $question = $questions[$questionKey];
            $answerChoices = $question['answer_choices'];

            array_walk($answerChoices, function(&$item, $key) {
                $item['id'] = $key;
            });

            $correctKeys = array_keys(array_column($answerChoices, 'is_correct', 'id'));

            sort($correctKeys);
            sort($answerKeys);
            if ($correctKeys === $answerKeys) {
                $correctCount++;
            }
        }

        return $correctCount;
    }

    public function getAnsweredQuestionsCount() {
        return $this->has('selected_answers') ? count($this->get('selected_answers')) : 0;
    }

    public function getAnsweredQuestionsCorrectCount() {
        if (!$this->has('selected_answers')) {
            return 0;
        }

        $questions = $this->moduleConfig['questions'];
        $selectedAnswers = $this->get('selected_answers');

        $correctCount = 0;
        if (is_array($selectedAnswers)) foreach ($selectedAnswers as $questionIndex => $selectedAnswer) {
            $questionKey = $selectedAnswer['question_key'];
            $answerKeys = $selectedAnswer['answer_keys'];

            $question = $questions[$questionKey];
            $answerChoices = $question['answer_choices'];

            array_walk($answerChoices, function(&$item, $key) {
                $item['id'] = $key;
            });

            $correctKeys = array_keys(array_column($answerChoices, 'is_correct', 'id'));

            sort($correctKeys);
            sort($answerKeys);

            if ($correctKeys === $answerKeys) {
                $correctCount++;
            }
        }

        return $correctCount;
    }


    public function getTotalCount() {
        $questions = $this->moduleConfig['questions'];
        return count($questions);
    }

    private function getPercentage() {
        return floor($this->getCorrectCount() / $this->getTotalCount() * 100);
    }

    private function getOutcomeVotes() {
        $questions = $this->moduleConfig['questions'];
        $selectedAnswers = $this->results['selected_answers'];

        $outcomeVotes = array();
        if (is_array($selectedAnswers)) foreach ($selectedAnswers as $selectedAnswer) {
            $questionKey = $selectedAnswer['question_key'];
            $answerKeys = $selectedAnswer['answer_keys'];

            $question = $questions[$questionKey];
            $answerChoices = $question['answer_choices'];

            if (is_array($answerKeys)) foreach ($answerKeys as $answerKey) {
                $outcomeKeys = $answerChoices[$answerKey]['outcome_keys'] ?: array();

                foreach ($outcomeKeys as $outcomeKey) {
                    $outcomeVotes[$outcomeKey]++;
                }
            }
        }

        return $outcomeVotes;
    }

    private function getOutcome() {
        $outcomes = $this->moduleConfig['outcomes'];
        $type = $this->moduleConfig['type'];

        if ($type == 'graded') {
            $percentage = $this->getPercentage();

            $defaultOutcome = array();
            if (is_array($outcomes)) foreach ($outcomes as $outcome) {
                if ($outcome['default']) {
                    $defaultOutcome = $outcome;
                    continue;
                }

                $min = $outcome['min'] ?: 0;
                $max = $outcome['max'] ?: 100;

                if ($min <= $percentage && $max >= $percentage) {
                    return $outcome;
                }
            }

            return $defaultOutcome;
        } elseif ($type == 'outcome') {
            $outcomeVotes = $this->getOutcomeVotes();
            $max = -1;

            $defaultOutcome = array();
            if (is_array($outcomes)) foreach ($outcomes as $outcome) {
                if ($outcome['default']) {
                    $defaultOutcome = $outcome;
                    continue;
                }
            }

            $outcome = array();
            if (is_array($outcomeVotes)) foreach ($outcomeVotes as $outcomeKey => $outcomeVote) {
                if ($outcomeVote > $max) {
                    $max = $outcomeVote;
                    $outcome = $outcomes[$outcomeKey];
                }
            }

            return $outcome ?: $defaultOutcome;
        }

        return array();
    }

    public function renderDefault($templateData = array()) {
        $templateData = $this->getTemplateData();

        $isFlashcard = $templateData['question']['is_flashcard'];
        $templateData['show_answer'] = (!$isFlashcard) ? true : false;
        $templateData['show_question'] = (!$isFlashcard) ? 'all' : 'image';
        $templateData['timer'] = (!$isFlashcard) ? 0 : $this->moduleConfig['flashcard_timer'];


        return $this->renderTemplate('default', $templateData);
    }

    public function renderResults($templateData = array()) {
        $templateData = $this->getResultsTemplateData();
        return $this->renderTemplate('results', $templateData);
    }

    public function renderPollResults($templateData = array()) {
        $questions = $this->moduleConfig['questions'];

        $questionKey = $templateData['questionKey'];
        if (!isset($questionKey)) {
            $questionKeys = array_keys($questions);
            $questionKey = array_shift($questionKeys);
        }

        $question = $questions[$questionKey];

        $cacheKey = ['results', 'poll', $questionKey];
        if($this->hasCache($cacheKey)) {
            $templateData = $this->getCache($cacheKey);
        } else {
            $data = ['questionkey' => $this->getQuestionApiKey($questionKey)];

            $api = new API\Question();
            $response = $api->count($data);

            if($response->isOk()) {
                $result = $response->getResult();
                $result = array_shift($result);
                $apiAnswers = (array) $result['answers'];
            } else
                $apiAnswers = [];

            $answersNo  = 0;
            $answerKeys = [];
            $allAnswers = $question['answer_choices'];
            foreach ($apiAnswers as $answer) {
                $answers[] = [
                    'title' => $allAnswers[$answer['answerkey']]['title'],
                    'image' => $allAnswers[$answer['answerkey']]['image'],
                    'count'  => $answer['occurances'],
                ];

                $answerKeys[] = $answer['answerkey'];
                $answersNo += $answer['occurances'];
            }

            $missedAnswers = array_diff(array_keys($allAnswers), $answerKeys);
            foreach ($missedAnswers as $answer) {
                $answers[] = [
                    'title' => $allAnswers[$answer]['title'],
                    'image' => $allAnswers[$answer]['image'],
                    'count'  => 0,
                ];
            }

            $templateData = [
                'question'     => $question,
                'answers'      => $answers,
                'totalAnswers' => $answersNo,
                'type'         => $question['answer_type']
            ];

            // Cache the result if only its the result from API
            if($response->isOk()) {
                $this->setCache($cacheKey, $templateData, 300);
            }
        }

        return $this->renderTemplate('pollResults', $templateData);
    }

    public function handleShowDetails($eventResponse, $data) {
        $templateData['show_answer'] = true;
        $templateData['show_question'] = 'text';

        $eventResponse->callReplaceWith($this->getTemplateSelector('default'),
            (string) $this->renderTemplate('default', $templateData));
    }

    public function handleNext($eventResponse, $data) {
        if ($this->questionIndex >= count($this->questionKeys)) {
            throw new \Exception("Already reached end of questions");
        }

        try {
            $this->storeAnswer($data);
        } catch(NoAnswerException $e) {
            $eventResponse->callRemoveClass('#no-answer-selected', 'hide');
            return;
        }
        $eventResponse->callAddClass('#no-answer-selected', 'hide');

        $this->questionIndex++;
        $this->set('question_index', $this->questionIndex);

        $eventResponse->callReplaceWith($this->getTemplateSelector('default'),
            (string) $this->render("default"));

        $eventResponse->callReplaceWith($this->getTemplateSelector('controls'),
            (string) $this->render("controls"));

        $eventResponse->callModule($this->getId(), 'startTimer');
    }

    public function handlePrev($eventResponse, $data) {
        if ($this->questionIndex <= 1) {
            throw new \Exception("Already reached beginning of questions");
        }

        $this->questionIndex--;
        $this->set('question_index', $this->questionIndex);

        $eventResponse->callReplaceWith($this->getTemplateSelector('default'),
            (string) $this->render("default"));

        $eventResponse->callReplaceWith($this->getTemplateSelector('controls'),
            (string) $this->render("controls"));

        $eventResponse->callModule($this->getId(), 'startTimer');
    }

    public function handleFinish($eventResponse, $data) {
        try {
            $this->storeAnswer($data);
        } catch(NoAnswerException $e) {
            $eventResponse->callRemoveClass('#no-answer-selected', 'hide');
        }
        $eventResponse->callAddClass('#no-answer-selected', 'hide');

        $this->set('results', array(
            'question_keys' => $this->questionKeys,
            'selected_answers' => $this->selectedAnswers,
        ));
        $this->results = $this->get('results');

        $data = [
            'questions' => $this->getAnswers()
        ];
        $api = new API\Question();
        // $response = $api->answer($data);

        // if ($response->isOk()) {
            $this->resetQuestions();

            $eventResponse->callForward($this->moduleConfig['redirect_url']);
        // } else {
        //     throw new \Exception("Unable to submit question answers");
        // }
    }

    private function getAnswers() {
        $answerSet = [];
        foreach ($this->selectedAnswers as $selectedAnswer) {
            $question = $this->moduleConfig['questions'][$selectedAnswer['question_key']];
            $questionApiKey = $this->getQuestionApiKey($selectedAnswer['question_key']);

            $answers = [];
            foreach ($selectedAnswer['answer_keys'] as $answerChoice)
                $answers[] = [
                    'answer'    => $question['answer_choices'][$answerChoice]['title'],
                    'answerkey' => $answerChoice
                ];

            $answerSet[] = [
                'question'    => $question['title'],
                'questionkey' => $questionApiKey,
                'answers'     => $answers
            ];
        }

        return $answerSet;
    }

    private function getQuestionApiKey($questionKey) {
        return $this->moduleConfig['uid'] . '-' . $questionKey;
    }
}