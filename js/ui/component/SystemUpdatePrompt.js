Ext.namespace('ui','ui.component');

ui.component.SystemUpdatePrompt = Ext.extend(Ext.Window,
{
    id        : 'sys-update-win',
    title     : _('Refresh all data'),
    layout    : 'form',
    width     : 300,
    height    : 200,
    resizable : false,
    modal     : true,
    bodyStyle : 'padding:15px 15px 0',
    iconCls   : 'refresh',
    html      : [
        '<div id="wizard-step-1" class="wizard-step-before">',
            _('Update all files from VCS'),
        '</div>',
        '<div id="wizard-step-1.1" class="wizard-wait">',
            _('This may take time. Thank you for your patience...'),
        '</div>',
        '<div id="wizard-step-2" class="wizard-step-before">',
            _('Apply all tools'),
        '</div>',
        '<div id="wizard-step-3" class="wizard-step-before">',
            _('Reload data'),
        '</div>'
    ].join(''),
    buttons : [{
        id      : 'btn-start-refresh',
        text    : _('Start'),
        iconCls : 'startRefresh',
        handler : function()
        {
            // Disable start button
            Ext.getCmp('btn-start-refresh').disable();

            // Disable the close button for this win
             this.ownerCt.ownerCt.tools.close.setVisible(false);

            // Set 'in progress'
            Ext.getDom('lastUpdateTime').innerHTML = _('update in progress...');

            var tmp = new ui.task.SystemUpdateTask();
        }
    }]
});
