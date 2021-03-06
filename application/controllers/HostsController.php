<?php

namespace Icinga\Module\Director\Controllers;

use Icinga\Module\Director\Web\Controller\ObjectsController;

class HostsController extends ObjectsController
{
    protected $multiEdit = array(
        'imports',
        'groups'
    );

    protected function checkDirectorPermissions()
    {
        $this->assertPermission('director/hosts');
    }
}
