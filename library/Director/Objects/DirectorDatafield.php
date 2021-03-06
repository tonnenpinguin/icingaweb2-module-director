<?php

namespace Icinga\Module\Director\Objects;

use Icinga\Module\Director\Data\Db\DbObjectWithSettings;
use Icinga\Module\Director\Db;
use Icinga\Module\Director\Hook\DataTypeHook;
use Icinga\Module\Director\Web\Form\DirectorObjectForm;
use Zend_Form_Element as ZfElement;

class DirectorDatafield extends DbObjectWithSettings
{
    protected $table = 'director_datafield';

    protected $keyName = 'id';

    protected $autoincKeyName = 'id';

    protected $defaultProperties = array(
        'id'            => null,
        'varname'       => null,
        'caption'       => null,
        'description'   => null,
        'datatype'      => null,
        'format'        => null,
    );

    protected $settingsTable = 'director_datafield_setting';

    protected $settingsRemoteId = 'datafield_id';

    private $required = false;

    private $object;

    public static function fromDbRow($row, Db $connection)
    {
        $obj = static::create((array) $row, $connection);
        $obj->loadedFromDb = true;
        // TODO: $obj->setUnmodified();
        $obj->hasBeenModified = false;
        $obj->modifiedProperties = array();

        // TODO: eventually prefetch
        $obj->onLoadFromDb();
        return $obj;
    }

    protected function setObject(IcingaObject $object)
    {
        $this->object = $object;
    }

    protected function getObject()
    {
        return $this->object;
    }

    protected function setRequired($value)
    {
        $this->required = (bool) $value;
    }

    public function getFormElement(DirectorObjectForm $form, $name = null)
    {
        $className = $this->get('datatype');

        if ($name === null) {
            $name = 'var_' . $this->get('varname');
        }

        if (! class_exists($className)) {
            $form->addElement('text', $name, array('disabled' => 'disabled'));
            $el = $form->getElement($name);
            $msg = $form->translate('Form element could not be created, %s is missing');
            $el->addError(sprintf($msg, $className));
            return $el;
        }

        /** @var DataTypeHook $datatype */
        $datatype = new $className;
        $datatype->setSettings($this->getSettings());
        $el = $datatype->getFormElement($name, $form);

        if ($caption = $this->get('caption')) {
            $el->setLabel($caption);
        }

        if ($description = $this->get('description')) {
            $el->setDescription($description);
        }

        $this->applyObjectData($el, $form);

        return $el;
    }

    protected function applyObjectData(ZfElement $el, DirectorObjectForm $form)
    {
        $object = $form->getObject();
        if ($object instanceof IcingaObject) {
            if ($object->isTemplate()) {
                $el->setRequired(false);
            }

            $varname = $this->get('varname');

            $form->setInheritedValue(
                $el,
                $object->getInheritedVar($varname),
                $object->getOriginForVar($varname)
            );

        } else {
            if ($this->required) {
                $el->setRequired(true);
            }
        }
    }
}
