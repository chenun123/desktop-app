/**
 * @file 历史记录
 * @author  life
 * 
 */
var attach_content_var = null;
//const path = require('path')
const shell = require('electron').shell
define(function() {

    var tpl = ['<div class="modal fade attach-modal" tabindex="-1" role="dialog" aria-hidden="true">',
            '<div class="modal-dialog modal-lg ">',
                '<div class="modal-content">',
                    '<div class="modal-header">',
                        '<h4 class="modal-title">' + getMsg('AttachView') + '</h4>',                        
                    '</div>',
                    '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>',                        
                    '<div class="modal-body clearfix">',
                        '<div class="attach-header-wrap">',                        
                        '<div>' + getMsg('title') + ' :<span class="attach-title"></span></div>',
                        '<div class="attach-header-element">' + getMsg('path') + ' :<span class="attach-path"></span></div>',
                        '<div>' + getMsg('type') + ' :<span class="attach-type"></span></div>',
                        
                        '</div>',
                        '<div class="attach-content-wrap">',                            
                            '<div class="attach-content"></div>',
                        '</div>',
                    '</div>',
                    '<div class="modal-footer hide">',
                        '<button type="button" class="btn btn-default" data-dismiss="modal">' + getMsg('close') + '</button>',
                    '</div>',
                '</div>',
            '</div>',
       '</div>'].join('');
    var $tpl = $(tpl);

    var $attachContent = $tpl.find('.attach-content');
    var $attachTitle = $tpl.find('.attach-title');
    var $attachPath = $tpl.find('.attach-path');
    var $attachType = $tpl.find('.attach-type');
    var view = {
        attach: null,
        content: null,

        canDisplay: function(docType) {
            return docType == 'cpp' || 
                docType == 'c' || 
                docType == 'java' ||
                docType == 'm' ||
                docType == 'json' ||
                docType == 'h' || 
                docType == 'mm' ||
                docType == 'html' ||
                docType == 'css' ||
                docType == 'js' ||
                docType == 'go' ||
                docType == 'txt' ||
                docType == 'png' || 
                docType == 'jpg' || 
                docType == 'bmp' || 
                docType == 'ico'
                ;
        },

        render: function (attach, ctx) {            
            this.attach = attach;
            this.content = ctx;            
            if(attach.Type == 'pdf') {
                // new window.PDFTron.WebViewer({
                //     path: '',

                // }, $attachContent);
                vpl = [
                    '<iframe src="public/pdfjs/web/viewer.html?file=' + attach.Path + '">',
                    '</iframe>'
                ].join('');
                $attachContent.html(vpl);

            } else if(attach.Type == 'png' || 
                attach.Type == 'jpg' || 
                attach.Type == 'bmp' || 
                attach.Type == 'ico') {
                $attachContent.html('<img src="data:image/' + attach.Type + ';base64,' + ctx.toString('base64') + '"/>');
            } else if(ctx && ctx.length > 0) {
                $attachContent.html('<pre>' + ctx.toString('utf8') + '</pre>');                
            } else {
                $attachContent.html(getMsg('open with system shell'));
                shell.openItem(attach.Path);
            }
                            
            $attachTitle.html(attach.Name);
            $attachPath.html('<a>' + attach.Path + '</a>');
            $attachPath.on('click', 'a', function() {
                shell.openItem(attach.Path);
            });

            $attachType.html(attach.Type);
            // show
            $tpl.modal({show: true});
        },

        bind: function () {
            var me = this;
            
            // $historyContent.on('click', 'a', function(e) {
            //     e.preventDefault();
            //     var href = $(this).attr('href');
            //     if(href && href.indexOf('http://127.0.0.1') < 0 && isURL(href)) {
            //         openExternal(href);
            //     }
            // });


        },

        openAttach: function (fileid) {
            var me = this;
            FileService.getAttachInfo(fileid, function(err, doc) {
                if (doc) {
                    console.log('name:' + doc.Name);
                    console.log('type:' + doc.Type);
                    console.log('path:' + doc.Path);
                    var ctx = '';
                    if (me.canDisplay(doc.Type)) {
                        ctx = FileService.getFileContent(doc.Path);
                    }
                    me.render(doc, ctx);
                }
            });    

        },

        init: function () {
            var me = this;
            this.bind();

        }
    };    
    view.init();
    attach_content_var = view;
});