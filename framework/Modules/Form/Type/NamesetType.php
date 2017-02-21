<?php

namespace SCRMHub\ActivationSDK\Modules\Form\Type;

use SCRMHub;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\Form\FormView;
use Symfony\Component\OptionsResolver\OptionsResolver;

class NamesetType extends AbstractType {
    public function configureOptions ( OptionsResolver $resolver ) {
        $resolver->setDefined(['subforms']);
        $resolver->setDefaults(array(
            'label'    => false,
            'subforms' => array(),
            'options'  => array(),
        ));
    }

    public function buildForm( FormBuilderInterface $builder, array $options ) {
        if ( !empty($options['subforms']) ) {
            foreach ($options['subforms'] as $field) {
                $builder->add($field['name'], $field['type'], $field['options']);
            }
        }
    }

    public function buildView( FormView $view, FormInterface $form, array $options ) {
        if (false !== $options['label']) {
            $view->vars['label'] = $options['label'];
        }
    }

    public function getName() {
        return 'nameset';
    }
}