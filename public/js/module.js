
(function(Icinga) {

    var Director = function(module) {
        this.module = module;

        this.initialize();

        this.openedFieldsets = {};

        this.module.icinga.logger.debug('Director module loaded');
    };

    Director.prototype = {

        initialize: function()
        {
            /**
             * Tell Icinga about our event handlers
             */
            this.module.on('rendered', this.rendered);
            this.module.on('beforerender', this.beforeRender);
            this.module.on('click', 'fieldset > legend', this.toggleFieldset);
            // Disabled
            // this.module.on('click', 'div.controls ul.tabs a', this.detailTabClick);
            this.module.on('click', 'input.related-action', this.extensibleSetAction);
            this.module.on('focus', 'form input, form textarea, form select', this.formElementFocus);
            this.module.icinga.logger.debug('Director module initialized');
        },

        /**
         * Caused problems with differing tabs, should not be used
         *
         * @deprecated
         */
        detailTabClick: function(ev)
        {
            var $a = $(ev.currentTarget);
            if ($a.closest('#col2').length === 0) {
                return;
            }

            this.alignDetailLinks();
        },

        /**
         * Caused problems with differing tabs, should not be used
         *
         * @deprecated
         */
        alignDetailLinks: function()
        {
            var self = this;
            var $a = $('#col2').find('div.controls ul.tabs li.active a');
            if ($a.length !== 1) {
                return;
            }

            var $leftTable = $('#col1').find('> div.content').find('table.icinga-objects');
            if ($leftTable.length !== 1) {
                return;
            }

            var tabPath = self.pathFromHref($a);

            $leftTable.find('tr').each(function(idx, tr) {
                var $tr = $(tr);
                if ($tr.is('[href]')) {
                    self.setHrefPath($tr, tabPath);
                } else {
                    // Unfortunately we currently run BEFORE the  action table
                    // handler
                    var $a = $tr.find('a[href].rowaction');
                    if ($a.length === 0) {
                        $a = $tr.find('a[href]').first();
                    }

                    if ($a.length) {
                        self.setHrefPath($a, tabPath);
                    }
                }
            });

            $leftTable.find('tr[href]').each(function(idx, tr) {
                var $tr = $(tr);
                self.setHrefPath($tr, tabPath);
            });
        },

        pathFromHref: function($el)
        {
            return this.module.icinga.utils.parseUrl($el.attr('href')).path
        },

        setHrefPath: function($el, path)
        {
            var a = this.module.icinga.utils.getUrlHelper();
            a.href = $el.attr('href');
            a.pathname = path;
            $el.attr('href', a.href);
        },

        extensibleSetAction: function(ev)
        {
            var iid, $li, $prev, $next;
            var el = ev.currentTarget;
            if (el.name.match(/__MOVE_UP$/)) {
                $li = $(el).closest('li');
                $prev = $li.prev();
                // TODO: document what's going on here.
                if ($li.find('input[type=text].autosubmit')) {
                    if (iid = $prev.find('input[type=text]').attr('id')) {
                        $li.closest('.container').data('activeExtensibleEntry', iid);
                    } else {
                        return true;
                    }
                }
                if ($prev.length) {
                    $prev.before($li.detach());
                    this.fixRelatedActions($li.closest('ul'));
                }
                ev.preventDefault();
                ev.stopPropagation();
                return false;
            } else if (el.name.match(/__MOVE_DOWN$/)) {
                $li = $(el).closest('li');
                $next = $li.next();
                // TODO: document what's going on here.
                if ($li.find('input[type=text].autosubmit')) {
                    if (iid = $next.find('input[type=text]').attr('id')) {
                        $li.closest('.container').data('activeExtensibleEntry', iid);
                    } else {
                        return true;
                    }
                }
                if ($next.length && ! $next.find('.extend-set').length) {
                    $next.after($li.detach());
                    this.fixRelatedActions($li.closest('ul'));
                }
                ev.preventDefault();
                ev.stopPropagation();
                return false;
            } else if (el.name.match(/__MOVE_REMOVE$/)) {
                // TODO: skipping for now, wasn't able to prevent web2 form
                //       submission once removed
                /*
                var $li = $(el).closest('li').remove();
                this.fixRelatedActions($li.closest('ul'));
                ev.preventDefault();
                ev.stopPropagation();
                return false;
                */
            }
        },

        fixRelatedActions: function($ul)
        {
            var $uls = $ul.find('li');
            var last = $uls.length - 1;
            if ($ul.find('.extend-set').length) {
                last--;
            }

            $uls.each(function (idx, li) {
                var $li = $(li);
                if (idx === 0) {
                    $li.find('.action-move-up').attr('disabled', 'disabled');
                    if (last === 0) {
                        $li.find('.action-move-down').attr('disabled', 'disabled');
                    } else {
                        $li.find('.action-move-down').removeAttr('disabled');
                    }
                } else if (idx === last) {
                    $li.find('.action-move-up').removeAttr('disabled');
                    $li.find('.action-move-down').attr('disabled', 'disabled');
                } else {
                    $li.find('.action-move-up').removeAttr('disabled');
                    $li.find('.action-move-down').removeAttr('disabled');
                }
            });
        },

        formElementFocus: function(ev)
        {
            var $input = $(ev.currentTarget);
            if ($input.closest('form.editor').length) {
               return;
            }
            var $dd = $input.closest('dd');
            $dd.find('p.description').show();
            if ($dd.attr('id') && $dd.attr('id').match(/button/)) {
                return;
            }
            var $li = $input.closest('li');
            var $dt = $dd.prev();
            var $form = $dd.closest('form');

            $form.find('dt, dd, li').removeClass('active');
            $li.addClass('active');
            $dt.addClass('active');
            $dd.addClass('active');
            $dd.find('p.description.fading-out')
                .stop(true)
                .removeClass('fading-out')
                .fadeIn('fast');

            $form.find('dd').not($dd)
                .find('p.description')
                .not('.fading-out')
                .addClass('fading-out')
                .delay(2000)
                .fadeOut('slow', function() {
                    $(this).removeClass('fading-out').hide()
                });
        },

        highlightFormErrors: function($container)
        {
            $container.find('dd ul.errors').each(function(idx, ul) {
                var $ul = $(ul);
                var $dd = $ul.closest('dd');
                var $dt = $dd.prev();

                $dt.addClass('errors');
                $dd.addClass('errors');
            });
        },

        toggleFieldset: function (ev) {
            ev.stopPropagation();
            var $fieldset = $(ev.currentTarget).closest('fieldset');
            $fieldset.toggleClass('collapsed');
            this.fixFieldsetInfo($fieldset);
            this.openedFieldsets[$fieldset.attr('id')] = ! $fieldset.hasClass('collapsed');
        },

        hideInactiveFormDescriptions: function($container) {
            $container.find('dd').not('.active').find('p.description').hide();
        },

        beforeRender: function(ev) {
            var $container = $(ev.currentTarget);

            var id = $container.attr('id');
            var requests = this.module.icinga.loader.requests;
            if (typeof requests[id] !== 'undefined' && requests[id].autorefresh) {
                $container.data('director-autorefreshed', 'yes');
            } else {
                $container.removeData('director-autorefreshed');
            }
        },

        containerIsAutorefreshed: function($container)
        {
            return $container.data('director-autorefreshed') === 'yes';
        },

        rendered: function(ev) {
            var iid;
            var $container = $(ev.currentTarget);
            this.restoreContainerFieldsets($container);
            this.backupAllExtensibleSetDefaultValues($container);
            this.highlightFormErrors($container);
            this.scrollHighlightIntoView($container);
            this.scrollActiveRowIntoView($container);
            this.hideInactiveFormDescriptions($container);
            if (iid = $container.data('activeExtensibleEntry')) {
                $('#' + iid).focus();
                $container.removeData('activeExtensibleEntry');
            }

            // Disabled for now
            // this.alignDetailLinks();
            if (! this.containerIsAutorefreshed($container)) {
                this.putFocusOnFirstFormElement($container);
            }
        },

        restoreContainerFieldsets: function($container)
        {
            var self = this;
            $container.find('form').each(self.restoreFieldsets.bind(self));
        },

        putFocusOnFirstFormElement: function($container)
        {
            $container.find('form.autofocus').find('label').first().focus();
        },

        scrollHighlightIntoView: function ($container) {
            var $hl = $container.find('.highlight');
            var $content = $container.find('> div.content');

            if ($hl.length) {
              $container.animate({
                scrollTop: $hl.offset().top - $content.offset().top
              }, 700);
            }
        },

        scrollActiveRowIntoView: function ($container) {
            var $tr = $container.find('table.table-row-selectable > tbody > tr.active');
            var $content = $container.find('> div.content');
            if ($tr.length) {
                $container.animate({
                    scrollTop: $tr.offset().top - $content.offset().top
                }, 500);
            }
        },

        backupAllExtensibleSetDefaultValues: function($container) {
            var self = this;
            $container.find('.extensible-set').each(function (idx, eSet) {
                $(eSet).find('input[type=text]').each(self.backupDefaultValue);
                $(eSet).find('select').each(self.backupDefaultValue);
            });
        },

        backupDefaultValue: function(idx, el) {
            $(el).data('originalvalue', el.value);
        },

        restoreFieldsets: function(idx, form) {
            var $form = $(form);
            var self = this;

            $('fieldset', $form).each(function(idx, fieldset) {
                var $fieldset = $(fieldset);
                if ($fieldset.find('.required').length == 0 && (! self.fieldsetWasOpened($fieldset))) {
                    $fieldset.addClass('collapsed');
                    self.fixFieldsetInfo($fieldset);
                }
            });
        },

        fieldsetWasOpened: function($fieldset) {
            var id = $fieldset.attr('id');
            if (typeof this.openedFieldsets[id] === 'undefined') {
                return false;
            }
            return this.openedFieldsets[id];
        },

        fixFieldsetInfo: function($fieldset) {
            if ($fieldset.hasClass('collapsed')) {
                if ($fieldset.find('legend span.element-count').length === 0) {
                    var cnt = $fieldset.find('dt, li').not('.extensible-set li').length;
                    $fieldset.find('legend').append($('<span class="element-count"> (' + cnt + ')</span>'));
                }
            } else {
                $fieldset.find('legend span.element-count').remove();
            }
        }
    };

    Icinga.availableModules.director = Director;

}(Icinga));

