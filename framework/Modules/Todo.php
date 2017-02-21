<?php

namespace SCRMHub\ActivationSDK\Modules;
use SCRMHub;

class Todo extends SCRMHub\ActivationSDK\BaseModule {
    private $listsData = [];
    private $sortedItems = [];

    public function __construct(\Silex\Application $app, $customKey, $moduleConfig) {
        parent::__construct($app, $customKey, $moduleConfig);

        $this->setListsData();
    }

    private function setListsData() {
        $order = 0;
        $lastCompletedItem = null;
        $puuid = $this->getPersonUuid();
        $this->listsData = $this->moduleConfig['lists'];

        foreach ($this->listsData as $listIndex => &$listData) {
            $listData['id'] = $listIndex;
            foreach ($listData['items'] as $itemIndex => &$itemData) {
                if ($itemData['link']) {
                    $parse = parse_url($itemData['link']['url']);
                    $itemData['link']['external'] = ($parse['host'] && $parse['host'] != $_SERVER['HTTP_HOST'])
                        ? true : false;
                }

                $itemData = array_merge($itemData, [
                    'id' => $itemIndex,
                    'listId' => $listIndex,
                    'is_completed' => $this->get($puuid)[$listIndex][$itemIndex]['is_completed'],
                    'order' => $order,
                    'changeable' => !$this->moduleConfig['auto_complete'] && !$this->moduleConfig['is_sequential'],
                ]);

                if ($this->moduleConfig['is_sequential']) {
                    $this->sortedItems[$order] = [$listIndex, $itemIndex];

                    if ($itemData['is_completed']) {
                        $lastCompletedItem = [$listIndex, $itemIndex];
                    }
                }

                $order ++;
            }
        }

        // make last completed item and first incomplete item active.
        if ($this->moduleConfig['is_sequential'] && !$this->moduleConfig['auto_complete']) {
            if ($lastCompletedItem) {
                $this->listsData[$lastCompletedItem[0]]['items'][$lastCompletedItem[1]]['changeable'] = true;

                $firstIncompleteItem = $this->listsData[$lastCompletedItem[0]]['items'][$lastCompletedItem[1]]['order'] + 1;
                $firstIncompleteItem = $this->sortedItems[$firstIncompleteItem];
            } else {
                $firstIncompleteItem = reset($this->sortedItems);
            }

            if ($firstIncompleteItem) {
                $this->listsData[$firstIncompleteItem[0]]['items'][$firstIncompleteItem[1]]['changeable'] = true;
            }
        }
    }

    private function getPersonUuid() {
        return $this->app['page_controller']->get('puuid');
    }

    protected function getTemplateData() {
        return ['lists' => $this->listsData];
    }

    public function renderDefault($templateData) {
        if (!isset($templateData['activeListId'])) {
            $listIds = array_keys($this->listsData);
            $listId = reset($listIds);

            $templateData['activeListId'] = $listId;
        }

        return $this->renderTemplate('default', $templateData);
    }

    public function handleCompleteItem($eventResponse, $data) {
        if (!$this->moduleConfig['auto_complete']) {
            $this->completeItem($data['listId'], $data['itemId'], $eventResponse);
        }
    }

    public function handleUndoCompleteItem($eventResponse, $data) {
        if (!$this->moduleConfig['auto_complete']) {
            $this->undoCompleteItem($data['listId'], $data['itemId'], $eventResponse);
        }
    }

    public function handleFetchLists($eventResponse, $data) {
            $eventResponse->callModule(
                $this->getId(),
                'replaceLists',
                (string) $this->render('lists', ['activeListId' => $data['listId']]));
    }

    public function completeItem($listId, $itemId, $eventResponse = null) {
        if (!isset($this->listsData[$listId]['items'][$itemId])) {
            return false;
        }

        // if items should be completed sequentially check if previous item is completed
        $order = $this->listsData[$listId]['items'][$itemId]['order'];
        $preItem = $this->sortedItems[$order - 1];
        if ($preItem && $this->moduleConfig['is_sequential']) {
            $preItemListId = $preItem[0];
            $preItemId = $preItem[1];
            if (!$this->listsData[$preItemListId]['items'][$preItemId]['is_completed']) {
                return false;
            }
        }

        $puuid = $this->getPersonUuid();
        $cacheData = $this->get($puuid);
        $cacheData[$listId][$itemId]['is_completed'] = true;
        $this->set($puuid, $cacheData);
        $this->setListsData();

        if (isset($eventResponse)) {
            // re-render lists to fetch latest changes in todo list
            $eventResponse->callModule(
                $this->getId(),
                'replaceLists',
                (string) $this->render('lists', ['activeListId' => $listId]));
        }

        return true;
    }

    public function undoCompleteItem($listId, $itemId, $eventResponse = null) {
        if (!isset($this->listsData[$listId]['items'][$itemId])) {
            return false;
        }

        $order = $this->listsData[$listId]['items'][$itemId]['order'];
        $nextItem = $this->sortedItems[$order + 1];
        if ($nextItem && $this->moduleConfig['is_sequential']) {
            $nextItemListId = $nextItem[0];
            $nextItemId = $nextItem[1];
            if ($this->listsData[$nextItemListId]['items'][$nextItemId]['is_completed']) {
                return false;
            }
        }

        $puuid = $this->getPersonUuid();
        $cacheData = $this->get($puuid);
        $cacheData[$listId][$itemId]['is_completed'] = false;
        $this->set($puuid, $cacheData);
        $this->setListsData();

        if (isset($eventResponse)) {
            // re-render lists to fetch latest changes in todo list
            $eventResponse->callModule(
                $this->getId(),
                'replaceLists',
                (string) $this->render('lists', ['activeListId' => $listId]));
        }

        return true;
    }

    public function getLists() {
        $lists = array_map(function($list) {
            return [
                'id' => $list['id'],
                'title' => $list['title'],
                'description' => $list['description'],
            ];
        }, $this->listsData);

        return $lists;
    }

    public function getItems($listId) {
        return $this->listsData[$listId]['items'];
    }

    public function countCompletedItems() {
        $count = 0;

        $puuid = $this->getPersonUuid();
        $cacheData = (array) $this->get($puuid);
        foreach ($cacheData as $list) {
            foreach ($list as $item) {
                if ($item['is_completed']) {
                    $count++;
                }
            }
        }

        return $count;
    }
}