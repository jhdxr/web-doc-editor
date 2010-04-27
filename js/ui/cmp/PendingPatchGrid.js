Ext.namespace('ui','ui.cmp','ui.cmp._PendingPatchGrid');

//------------------------------------------------------------------------------
// PendingPatchGrid internals

// PendingPatchGrid store
ui.cmp._PendingPatchGrid.store = new Ext.data.GroupingStore(
{
    proxy : new Ext.data.HttpProxy({
        url : './do/getFilesPendingPatch'
    }),
    reader : new Ext.data.JsonReader({
        root          : 'Items',
        totalProperty : 'nbItems',
        idProperty    : 'id',
        fields        : [
            {name : 'id'},
            {name : 'path'},
            {name : 'name'},
            {name : 'by'},
            {name : 'uniqID'},
            {name : 'date', type : 'date', dateFormat : 'Y-m-d H:i:s'}
        ]
    }),
    sortInfo : {
        field     : 'name',
        direction : 'ASC'
    },
    groupField : 'path',
    listeners  : {
        add : function(ds)
        {
            Ext.getDom('acc-pendingPatch-nb').innerHTML = ds.getCount();
        },
        datachanged : function(ds)
        {
            Ext.getDom('acc-pendingPatch-nb').innerHTML = ds.getCount();
        }
    }
});

// PendingPatchGrid columns definition
ui.cmp._PendingPatchGrid.columns = [{
    id        : 'name',
    header    : _('Files'),
    sortable  : true,
    dataIndex : 'name'
}, {
    header    : _('Posted by'),
    width     : 45,
    sortable  : true,
    dataIndex : 'by'
}, {
    header    : _('Date'),
    width     : 45,
    sortable  : true,
    dataIndex : 'date',
    renderer  : Ext.util.Format.dateRenderer(_('Y-m-d, H:i'))
}, {
    header    : _('Path'),
    dataIndex : 'path',
    'hidden'  : true
}];

// PendingPatchGrid view
ui.cmp._PendingPatchGrid.view = new Ext.grid.GroupingView({
    forceFit      : true,
    groupTextTpl  : '{[values.rs[0].data["path"]]} ' +
                    '({[values.rs.length]} ' +
                    '{[values.rs.length > 1 ? "' + _('Files') + '" : "' + _('File') + '"]})',
    emptyText     : '<div style="text-align: center;">' + _('No pending patches') + '</div>',
    deferEmptyText: false
});

// PendingPatchGrid context menu
// config - { grid, rowIdx, event, fid, fpath, fname, fuid }
ui.cmp._PendingPatchGrid.menu = function(config)
{
    Ext.apply(this, config);
    this.init();
    ui.cmp._PendingPatchGrid.menu.superclass.constructor.call(this);
};
Ext.extend(ui.cmp._PendingPatchGrid.menu, Ext.menu.Menu,
{
    init : function()
    {
        Ext.apply(this,
        {
            items : [{
                scope   : this,
                text    : '<b>' + _('Edit in a new Tab') + '</b>',
                iconCls : 'iconPendingPatch',
                handler : function()
                {
                    this.grid.openFile(this.grid.store.getAt(this.rowIdx).data.id);
                }
            }, '-', {
                scope   : this,
                text    : _('Reject this patch'),
                disabled: (PhDOE.userLogin === 'anonymous'),
                iconCls : 'iconTrash',
                handler : function()
                {
                    new ui.task.RejectPatchTask({
                        fid         : this.fid,
                        fuid        : this.fuid,
                        storeRecord : this.grid.store.getAt(this.rowIdx)
                    });
                }
            }]
        });
    }
});

//------------------------------------------------------------------------------
// PendingPatchGrid
ui.cmp.PendingPatchGrid = Ext.extend(Ext.grid.GridPanel,
{
    columns          : ui.cmp._PendingPatchGrid.columns,
    view             : ui.cmp._PendingPatchGrid.view,
    loadMask         : true,
    border           : false,
    autoExpandColumn : 'name',
    enableDragDrop   : true,
    ddGroup          : 'mainPanelDDGroup',

    onRowDblClick: function(grid, rowIndex)
    {
        this.openFile(this.store.getAt(rowIndex).data.id);
    },

    openFile: function(rowId)
    {
        var storeRecord = false;

        this.store.each(function(r)
        {
            if (r.data.id === rowId) {
                storeRecord = r;
            }
        });

        var FilePath    = storeRecord.data.path,
            FileName    = storeRecord.data.name,
            FileUniqID  = storeRecord.data.uniqID,
            FileID      = Ext.util.md5('PP-' + FileUniqID + FilePath + FileName);

        // Render only if this tab don't exist yet
        if (!Ext.getCmp('main-panel').findById('PP-' + FileID)) {

            Ext.getCmp('main-panel').add({
                id             : 'PP-' + FileID,
                layout         : 'border',
                iconCls        : 'iconPendingPatch',
                title          : FileName,
                originTitle    : FileName,
                tabTip         : String.format(_('Patch for {0}'), FilePath + FileName),
                closable       : true,
                tabLoaded      : false,
                panPatchContent: false,
                panVCS         : !PhDOE.userConf.patchDisplayLog,
                panPatchLoaded : false,
                panOriginLoaded: false,
                defaults       : { split : true },
                items          : [{
                        xtype            : 'panel',
                        id               : 'PP-patch-desc-' + FileID,
                        title            : _('Patch content'),
                        iconCls          : 'iconPendingPatch',
                        collapsedIconCls : 'iconPendingPatch',
                        plugins          : [Ext.ux.PanelCollapsedTitle],
                        layout           : 'fit',
                        region           : 'north',
                        border           : false,
                        height           : PhDOE.userConf.patchDisplayContentPanelHeight || 150,
                        autoScroll       : true,
                        collapsible      : true,
                        collapsed        : !PhDOE.userConf.patchDisplayContentPanel,
                        html             : '<div id="diff_content_' + FileID + '" class="diff-content"></div>',
                        listeners        : {
                            collapse: function()
                            {
                                if ( this.ownerCt.tabLoaded ) {
                                    new ui.task.UpdateConfTask({
                                        item  : 'patchDisplayContentPanel',
                                        value : false,
                                        notify: false
                                    });
                                }
                            },
                            expand: function()
                            {
                                if ( this.ownerCt.tabLoaded ) {
                                    new ui.task.UpdateConfTask({
                                        item  : 'patchDisplayContentPanel',
                                        value : true,
                                        notify: false
                                    });
                                }
                            },
                            resize: function(a,b,newHeight)
                            {
                                if( this.ownerCt.tabLoaded && newHeight && newHeight > 50 && newHeight != PhDOE.userConf.patchDisplayContentPanelHeight ) { // As the type is different, we can't use !== to compare with !
                                    new ui.task.UpdateConfTask({
                                        item  : 'patchDisplayContentPanelHeight',
                                        value : newHeight,
                                        notify: false
                                    });
                                }
                            },
                            render : function()
                            {
                                // Load diff data
                                XHR({
                                    params  : {
                                        task     : 'getDiff',
                                        FilePath : FilePath,
                                        FileName : FileName,
                                        DiffType : 'patch',
                                        uniqID   : FileUniqID
                                    },
                                    success : function(response)
                                    {
                                        var o = Ext.util.JSON.decode(response.responseText);
                                        // We display in diff div
                                        Ext.get('diff_content_' + FileID).dom.innerHTML = o.content;
                                    },
                                    callback: function() {
                                        Ext.getCmp('PP-' + FileID).panPatchContent = true;
                                        Ext.getCmp('main-panel').fireEvent('tabLoaded', 'PP', FileID);
                                    }
                                });
                            }
                        }
                    }, {
                        region           : 'west',
                        xtype            : 'panel',
                        title            : _('VCS Log'),
                        iconCls          : 'iconVCSLog',
                        collapsedIconCls : 'iconVCSLog',
                        plugins          : [Ext.ux.PanelCollapsedTitle],
                        layout           : 'fit',
                        bodyBorder       : false,
                        collapsible      : true,
                        collapsed        : !PhDOE.userConf.patchDisplaylogPanel,
                        width            : PhDOE.userConf.patchDisplaylogPanelWidth || 375,
                        listeners        : {
                            collapse : function() {
                                if ( this.ownerCt.tabLoaded ) {
                                    new ui.task.UpdateConfTask({
                                        item  : 'patchDisplaylogPanel',
                                        value : false,
                                        notify: false
                                    });
                                }
                            },
                            expand : function() {
                                if ( this.ownerCt.tabLoaded ) {
                                    new ui.task.UpdateConfTask({
                                        item  : 'patchDisplaylogPanel',
                                        value : true,
                                        notify: false
                                    });
                                }
                            },
                            resize : function(a,newWidth) {
                                if( this.ownerCt.tabLoaded && newWidth && newWidth != PhDOE.userConf.patchDisplaylogPanelWidth ) { // As the type is different, we can't use !== to compare with !
                                    new ui.task.UpdateConfTask({
                                        item  : 'patchDisplaylogPanelWidth',
                                        value : newWidth,
                                        notify: false
                                    });
                                }
                            }
                        },
                        items       : {
                            xtype       : 'tabpanel',
                            activeTab   : 0,
                            tabPosition : 'bottom',
                            defaults    : { autoScroll : true },
                            items       : new ui.cmp.VCSLogGrid({
                                layout    : 'fit',
                                title     : _('Log'),
                                prefix    : 'PP',
                                fid       : FileID,
                                fpath     : FilePath,
                                fname     : FileName,
                                loadStore : PhDOE.userConf.patchDisplayLog
                            })
                        }
                    }, new ui.cmp.FilePanel(
                    {
                        id             : 'PP-PATCH-PANEL-' + FileID,
                        region         : 'center',
                        title          : String.format(_('Proposed Patch for {0}'), FilePath + FileName),
                        prefix         : 'PP',
                        ftype          : 'PATCH',
                        spellCheck     : PhDOE.userConf.patchSpellCheck,
                        spellCheckConf : 'patchSpellCheck',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        isPatch        : true,
                        fuid           : FileUniqID,
                        parser         : 'xml',
                        storeRecord    : storeRecord,
                        syncScrollCB   : true,
                        syncScroll     : true,
                        syncScrollConf : 'patchScrollbars'
                    }), new ui.cmp.FilePanel(
                    {
                        id             : 'PP-ORIGIN-PANEL-' + FileID,
                        region         : 'east',
                        width          : 575,
                        title          : _('Original File: ') + FilePath + FileName,
                        prefix         : 'PP',
                        ftype          : 'ORIGIN',
                        fid            : FileID,
                        fpath          : FilePath,
                        fname          : FileName,
                        lang           : '',
                        readOnly       : true,
                        parser         : 'xml',
                        syncScroll     : true,
                        syncScrollConf : 'patchScrollbars'
                    })
                ]
            });
        }
        Ext.getCmp('main-panel').setActiveTab('PP-' + FileID);
    },

    onRowContextMenu : function(grid, rowIndex, e)
    {
        e.stopEvent();

        var FilePath   = grid.store.getAt(rowIndex).data.path,
            FileName   = grid.store.getAt(rowIndex).data.name,
            FileUniqID = grid.store.getAt(rowIndex).data.uniqID,
            FileID     = Ext.util.md5('PP-' + FileUniqID + FilePath + FileName);

        grid.getSelectionModel().selectRow(rowIndex);

        new ui.cmp._PendingPatchGrid.menu({
            grid   : grid,
            rowIdx : rowIndex,
            event  : e,
            fid    : FileID,
            fpath  : FilePath,
            fname  : FileName,
            fuid   : FileUniqID
        }).showAt(e.getXY());
    },

    initComponent : function()
    {
        Ext.apply(this,
        {
            store : ui.cmp._PendingPatchGrid.store
        });
        ui.cmp.PendingPatchGrid.superclass.initComponent.call(this);

        this.on('rowcontextmenu', this.onRowContextMenu, this);
        this.on('rowdblclick',    this.onRowDblClick,    this);
    }
});

// singleton
ui.cmp._PendingPatchGrid.instance = null;
ui.cmp.PendingPatchGrid.getInstance = function(config)
{
    if (!ui.cmp._PendingPatchGrid.instance) {
        if (!config) {
            config = {};
        }
        ui.cmp._PendingPatchGrid.instance = new ui.cmp.PendingPatchGrid(config);
    }
    return ui.cmp._PendingPatchGrid.instance;
};