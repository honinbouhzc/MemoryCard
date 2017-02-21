<?php

namespace SCRMHub\ActivationSDK\Modules;

use SCRMHub;
use SCRMHub\SDK\API;
use Symfony\Component\Form\Extension\Core\Type;
use SCRMHub\ActivationSDK\Modules\Form\Type\NamesetType;
use Symfony\Component\Security\Csrf\CsrfToken;
use Symfony\Component\OptionsResolver\OptionsResolver;

class Form extends SCRMHub\ActivationSDK\BaseModule {
    public static $errorTypes = array('required', 'invalid');
    private $form;

    public function __construct(\Silex\Application $app, $customKey, $moduleConfig) {
        parent::__construct($app, $customKey, $moduleConfig);

        $this->form = $this->buildForm();
    }

    protected function useBaseForm() {
        return false;
    }

    public function getFormName() {
        $moduleConfig = $this->moduleConfig;
        return 'form-' . $moduleConfig['uuid'];
    }

    public function getFieldValue($data, $fieldName) {
        $formName = $this->getFormName();
        $fieldKey = $formName . '[' . $fieldName . ']';
        return $data[$fieldKey];
    }

    private function buildForm() {
        $app = $this->app;
        $moduleConfig = $this->moduleConfig;

        $formName = $this->getFormName();
        $formClass = $moduleConfig['options']['css_class'] . ' ' . $moduleConfig['options']['label_placement'];
        $formAttributes = array(
            'class' => $formClass,
        );

        foreach (self::$errorTypes as $type) {
            $defaultMessage = $this->app['translator']->trans('validation_' . $type, array(), $this->getId());
            $customMessage = $moduleConfig['options']['validation_message'][$type];

            $formAttributes['data-validation-' . $type] = $customMessage ?: $defaultMessage;
        }

        $formBuilder = $app['form.factory']->createNamedBuilder($formName, Type\FormType::class, null, array('attr' => $formAttributes));

        if (is_array($moduleConfig['fields'])) foreach ($moduleConfig['fields'] as $field) {
            $label = $field['options']['label'];
            $name = $field['options']['name'] ?: $field['cid'];
            $type = $field['type'];
            $options = $field['options'];

            $fieldType = "";
            $fieldOptions = array();
            $attributes = array();
            $fieldOptions['label'] = $label;
            $fieldOptions['required'] = $options['required'] ? true : false;

            if(is_array($options['validation_message'])) foreach ($field['options']['validation_message'] as $error => $msg) {
                $attributes['data-validation-' . $error] = $msg;
            }

            if ($options['css_class']) {
                $attributes['class'] = $options['css_class'];
            }

            // TODO: implement size, small, medium, large
            switch($type) {
                case "email":
                case "text":
                case "textarea":
                    ($options['limit']['min'])    AND $attributes['data-min'] = $options['limit']['min'];
                    ($options['limit']['max'])    AND $attributes['data-max'] = $options['limit']['max'];
                    ($options['limit']['format']) AND $attributes['data-format'] = $options['limit']['format'];

                    if ($options['placeholder']) {
                        $attributes['placeholder'] = $options['placeholder'];
                    }

                    $fieldType = $type;
                    break;

                case "radio":
                case "checkbox":
                case "select":
                    // TODO: implement radio.layout, one-column, two-column, three-column, side-by-side
                    $choices = $options['choices'];

                    $expanded = (in_array($type, array("checkbox", "radio")));
                    $multiple = ($type == "checkbox");
                    if ($multiple) {
                        $values = [];
                        foreach ($options['values'] as $value) {
                            $values[] = $choices[$value];
                        }
                    } else {
                        $values = $choices[$options['value']];
                    }

                    $fieldOptions['choices'] = array_combine($choices, $choices);
                    $fieldOptions['multiple'] = $multiple;
                    $fieldOptions['expanded'] = $expanded;
                    $fieldOptions['data'] = $values;

                    $attributes['required'] = $options['required'] ? true : false;
                    $fieldOptions['required'] = false;

                    $fieldType = 'choice';
                    break;

                case "file":
                    $attributes['data-type'] = $options['type'];

                    $options['extensions'] AND $attributes['data-extensions'] = $options['extensions'];

                    $options['multiple_enabled'] AND $fieldOptions['multiple'] = $options['multiple_enabled'];
                    if($fieldOptions['multiple']) {
                        $options['multiple_limit']['min']    AND $attributes['data-multiple-min'] = $options['multiple_limit']['min'];
                        $options['multiple_limit']['max']    AND $attributes['data-multiple-max'] = $options['multiple_limit']['max'];
                        $options['multiple_limit']['format'] AND $attributes['data-multiple-format'] = $options['multiple_limit']['format'];
                    }

                    if($options['size_enabled']) {
                        $options['size_limit']['min']    AND $attributes['data-size-min'] = $options['size_limit']['min'];
                        $options['size_limit']['max']    AND $attributes['data-size-max'] = $options['size_limit']['max'];
                        $options['size_limit']['format'] AND $attributes['data-size-format'] = $options['size_limit']['format'];
                    }

                    $fieldType = 'file';
                    break;

                case "tnc":
                case "optin":
                    $fieldType = 'checkbox';

                    if ($type == "tnc") {
                        $url = $field['options']['url'];
                        $newLabel = preg_replace('/<a>/', sprintf('<a href="%s" target="_blank">', $url), $label);
                        $fieldOptions['label'] = $newLabel;
                    }
                    break;

                case "name":
                    $subforms = [];
                    foreach ($field['fields'] as $nameField) {
                        if(!$nameField['options']['extended']
                            || ($nameField['options']['extended'] && $field['options']['extended_format'])
                        ) {
                            $nameFieldAttr['placeholder'] = $nameField['options']['placeholder'];
                            if($nameField['options']['limit']) {
                                isset($nameField['options']['limit']['min']) AND $nameFieldAttr['data-limit-min'] = $nameField['options']['limit']['min'];
                                isset($nameField['options']['limit']['max']) AND $nameFieldAttr['data-limit-max'] = $nameField['options']['limit']['max'];
                                isset($nameField['options']['limit']['format']) AND $nameFieldAttr['data-limit-format'] = $nameField['options']['limit']['format'];
                            }

                            $r = new \ReflectionClass('Symfony\\Component\\Form\\Extension\\Core\\Type\\' . ucfirst($nameField['type']) . 'Type');
                            $fieldType = $r->name;
                            $subforms[] = [
                                'name' => $nameField['options']['name'] ?: $nameField['cid'],
                                'type' => $fieldType,
                                'options' => [
                                    'label' => false,
                                    'required' => $fieldOptions['required'],
                                    'attr' => $nameFieldAttr,
                                ]
                            ];
                        }
                    }

                    $fieldOptions['subforms'] = $subforms;
                    $fieldType = new NamesetType();
                    // var_dump($formBuilder->getOptionsResolver());
                    break;
            }
            $fieldOptions['attr'] = $attributes;

            if ($fieldType) {
                if (is_string($fieldType)) {
                    $r = new \ReflectionClass('Symfony\\Component\\Form\\Extension\\Core\\Type\\' . ucfirst($fieldType) . 'Type');
                    $fieldType = $r->name;
                } else if (is_object($fieldType)) {
                    $r = new \ReflectionObject($fieldType);
                    $fieldType = $r->name;
                }

                $formBuilder->add($name, $fieldType, $fieldOptions);
            } else {
                // var_dump($field);
            }
        }

        $formBuilder->add('save', Type\SubmitType::class, array(
            'label' => $this->app['translator']->trans('submit_label', array(), $this->getId())
        ));
        $form = $formBuilder->getForm();

        return $form;
    }

    public function renderDefault($templateData = array()) {
        $templateData['form'] = $this->form->createView();
        return $this->renderTemplate('default', $templateData);
    }

    public function handleSubmit($eventResponse, $data) {
        $app = $this->app;

        $formData = array();
        $expectedFormName = $this->getFormName();

        $tokenName = $expectedFormName.'[_token]';
        $token = $data[$tokenName];
        $valid = $app['csrf.token_manager']->isTokenValid(new CsrfToken($this->getFormName(), $token));
        if (!$valid) {
            throw new \Exception("CSRF attack detected.");
        }

        if (is_array($data)) foreach ($data as $name => $value) {
            preg_match('/(.*?)(?:\[(.*)\])?\[(.*?)\]$/', $name, $matches);

            $formName = $matches[1];
            $fieldGroupName = $matches[2];
            $fieldName = $matches[3];

            if ($formName == $expectedFormName) {
                $formData[$fieldName] = $value;
            }
        }

        $fuuid = $this->moduleConfig['uuid'];
        $data = array(
            'fuuid' => $fuuid,
            'data' => $formData,
        );

        $api = new API\Form();
        $response = $api->store($data);
        if ($response->isOk()) {
            $eventResponse->callForward($this->moduleConfig['redirect_url']);
        } else {
            throw new \Exception("Unable to submit form entry");
        }
    }
}