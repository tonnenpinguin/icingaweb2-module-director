<?php

namespace Icinga\Module\Director\Tables;

use Icinga\Data\Limitable;
use Icinga\Module\Director\Web\Table\QuickTable;

class IcingaHostTable extends QuickTable
{
    protected $searchColumns = array(
        'host',
        'address',
        'display_name'
    );

    public function getColumns()
    {
        if ($this->connection()->isPgsql()) {
            $parents = "ARRAY_TO_STRING(ARRAY_AGG(ih.object_name ORDER BY hi.weight), ', ')";
        } else {
            $parents = "GROUP_CONCAT(ih.object_name ORDER BY hi.weight SEPARATOR ', ')";
        }

        return array(
            'id'           => 'h.id',
            'host'         => 'h.object_name',
            'object_type'  => 'h.object_type',
            'address'      => 'h.address',
            'display_name' => 'h.address',
            'zone'         => 'z.object_name',
            'cnt_child_hosts' => "SUM(CASE WHEN ph.object_type = 'object' THEN 1 ELSE 0 END)",
            'cnt_child_templates' => "SUM(CASE WHEN ph.object_type = 'template' THEN 1 ELSE 0 END)",
            'parents'      => $parents,
        );
    }

        protected function getActionUrl($row)
    {
        return $this->url('director/host', array('name' => $row->host));
    }

    protected function getMultiselectProperties()
    {
        return array(
            'url'       => 'director/hosts/edit',
            'sourceUrl' => 'director/hosts',
            'keys'      => array('name'),
        );
    }

    public function getTitles()
    {
        $view = $this->view();
        return array(
            'host'    => $view->translate('Hostname'),
            'address' => $view->translate('Address'),
        );
    }

    protected function getUnfilteredQuery()
    {
        $db = $this->connection()->getConnection();
        $query = $db->select()->from(
            array('ph' => 'icinga_host'),
            array()
        )->joinRight(
            array('hp' => 'icinga_host_inheritance'),
            'hp.host_id = ph.id',
            array()
        )->joinRight(
            array('h' => 'icinga_host'),
            'hp.parent_host_id = h.id',
            array()
        )->joinLeft(
            array('z' => 'icinga_zone'),
            'h.zone_id = z.id',
            array()
        )->joinLeft(
            array('hi' => 'icinga_host_inheritance'),
            'hi.host_id = h.id',
            array()
        )->joinLeft(
            array('ih' => 'icinga_host'),
            'hi.parent_host_id = ih.id',
            array()
        )->group('h.id')
         ->group('z.id')
         ->order('h.object_name');

        return $query;
    }

    public function count()
    {
        $db = $this->connection()->getConnection();
        $sub = clone($this->getBaseQuery());
        $sub->columns($this->getColumns());
        $this->applyFiltersToQuery($sub);
        $query = $db->select()->from(
            array('sub' => $sub),
            'COUNT(*)'
        );

        return $db->fetchOne($query);
    }

    public function getBaseQuery()
    {
        return $this->getUnfilteredQuery();
    }
}
