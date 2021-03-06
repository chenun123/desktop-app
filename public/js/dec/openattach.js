/**
 * @file 历史记录
 * @author  life
 * 
 */
var attach_content_var = null;
var converter = null;
//const path = require('path')
const shell = require('electron').shell
const mammoth = require('mammoth');
const handsontable = require('handsontable');

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

    var supportType = [
        'htm', 'html', 'mxml', 'xhtml', 'xml', 'xsl',
        'c', 'cc', 'cpp', 'cxx', 'cyc', 'm',
        'json',
        'cs',
        'java',
        'bash', 'bsh', 'csh', 'sh',
        'py', 'python',
        'pl', 'pm', 'perl',
        'rb', 'ruby',
        'js',
        'coffee',
        'rc', 'rs', 'rust'
    ];
    // 默认 default-code
    var needConvType = [
        'h',
        'mm',
        'css',
        'php',
        'go'
    ];

    var view = {
        attach: null,
        content: null,
        
        canDisplay: function(docType) {
            
            if(docType == 'txt' ||                                
                docType == 'png' || 
                docType == 'jpg' || 
                docType == 'bmp' || 
                docType == 'ico' ||                
                supportType.indexOf(docType) >= 0 ||
                needConvType.indexOf(docType) >= 0)
                return true;
            return false;
        },

        convType: function(docType) {
            if(supportType.indexOf(docType))
                return docType;
            
            if (docType == 'h' || docType == 'mm') {
                return 'cpp';
            }
            if(docType == 'css')
                return 'html'
            
            return 'default-code';
        },

        render: function (attach, ctx) {
            var me = this;            
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

            } else if(attach.Type == 'docx') {
                mammoth.convertToHtml({path: attach.Path})
                    .then(function(result) {
                        vpl = result.value; // The generated HTML
                        //var messages = result.messages; // Any messages, such as warnings during conversion
                        $attachContent.html(vpl);
                    });

            } else if(attach.Type == 'xlsx') {
                //var objE = document.createElement("div");
                var xlsx_id = 'open_attach_xlsx';
                //$container = $(objE);
                $container = $('<div></div>', {
                    id: xlsx_id,
                    width: '100%',
                    height: '100%'
                });
                $container.addClass(xlsx_id + "_clas");
                $container.addClass("wbSheets_clas");
                                
                // 添加事件
                var loadXlsx  = function() {                   
                    if(!xlsxService) {
                        var xlsxService = require('xlsx');
                    }
                    //var vpl = xlsxService.utils.sheet_to_html();
    
                    var wb = xlsxService.read(attach.Path, { type: "file" });
                    var sheetNames = wb.SheetNames;
                    $container = $('#' +xlsx_id);
                    $container.append('<ul class="wbSheets_clas_ul">');
                    var li_container = "";
                    sheetNames.forEach(function (sheetName, idx) {
                        var subDivId = 'wbSheets_' + idx;                        
                        $container.find("ul").append('<li><a href="#' + subDivId + '">' + sheetName + '</a></li>');
                    });
                    var hot, hot_ary = []; 
                    var availableWidth, availableHeight;
                    sheetNames.forEach(function (sheetName, idx) {
                        var subDivId = 'wbSheets_' + idx;
                        var json = xlsxService.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
                        var dsply = "";
                        
                        if (idx == 0) {
                            dsply = "display:block;";
                        } else {
                            dsply = "display:none;";
                        }
    
                        var subDiv = $('<div/>').attr({
                            class: 'wbSheets',
                            id: subDivId,
                            style: dsply
                        });
                        $container.append(subDiv);
                        //availableWidth = Math.max(subDiv.width(),600);
                        //availableHeight = Math.max(subDiv.height(), 500);
                        availableWidth = $container.width() - 20;
                        availableHeight = $container.height() - 50;
                        /* add header row for table */
                        if (!json) json = [];
                        json.forEach(function (r) {
                            //must "...,{header:1}"
                            if (json[0].length < r.length) json[0].length = r.length;
                        });
                        //console.log(json)
                        var container = $container.find('#'+subDivId);

                        var cur_lang = window.curLang;

                        var all_lang = {
                            'de-de': 'de-DE',
                            'zh-cn': 'zh-CN',
                            'zh-hk': 'zh-TW',
                            'ja-jp': 'ja-JP'
                        };

                        hot = new handsontable.default(container[0], {
                            data: json,                        
                            width: availableWidth,
                            height: availableHeight,
                            //licenseKey: 'non-commercial-and-evaluation',
                            colHeaders: true,
                            rowHeaders: true,
                            sortIndicator: true,
                            filters: true,
                            contextMenu: true,
                            dropdownMenu: true,
                            language: all_lang[cur_lang]
                        });
                        hot_ary.push(hot);
                    });
                    $container.tabs({seleted: 0});
                };

                $container.ready(function() {
                    setTimeout(loadXlsx, 1000);                    
                });

                $attachContent.html('');
                $attachContent.append($container);
            } else if(attach.Type == 'png' || 
                attach.Type == 'jpg' || 
                attach.Type == 'bmp' || 
                attach.Type == 'ico') {
                $attachContent.html('<img src="data:image/' + attach.Type + ';base64,' + ctx.toString('base64') + '"/>');
            } else if(ctx && ctx.length > 0) {
                // if(converter) {
                //     var convhtml = converter.makeHtml(ctx.toString('utf8'));
                //     if(prettyPrintOne) {
                //         console.log("11111111111");
                //         convhtml = prettyPrintOne(convhtml,'python', false);
                //     };
                //     $attachContent.html(convhtml);                    
                // } else 
                if(prettyPrintOne) {
                    var convhtml = '<pre class="prettyprint linenums prettyprinted"><code>' + prettyPrintOne(ctx.toString('utf8'), me.convType(attach.Type), true) + '</code></pre>';                    
                    $attachContent.html(convhtml);
                }
                else                 
                    $attachContent.html('<pre>' + ctx.toString('utf8') + '</pre>');                
            } else {
                $attachContent.html(getMsg('open with system shell'));
                shell.openItem(attach.Path);
            }
                            
            $attachTitle.html(attach.Name);
            $attachPath.html('<a>' + attach.Path + '</a>');
            $attachPath.off('click');
            $attachPath.on('click', 'a', function() {
                shell.openItem(attach.Path);
            });
            $attachType.html(attach.Type);
            $attachContent.animate({scrollTop: '0px'});
            // show
            $tpl.modal({show: true,
                           
            });
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
                    // console.log('name:' + doc.Name);
                    // console.log('type:' + doc.Type);
                    // console.log('path:' + doc.Path);
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
            
            return;
            converter = new Markdown.Converter();
            var regexp = '^.+[ \\t]*\\n=+[ \\t]*\\n+|^.+[ \\t]*\\n-+[ \\t]*\\n+|^\\#{1,6}[ \\t]*.+?[ \\t]*\\#*\\n+'; // Title delimiters            
            regexp = '^```.*\\n[\\s\\S]*?\\n```|' + regexp; // Fenced block delimiters
            regexp = new RegExp(regexp, 'gm');
            converter.hooks.chain("preConversion", function(text) {
                // console.log('preConversion');
                // console.log(text);
                //eventMgr.previewStartTime = new Date();
                var tmpText = text + "\n\n";
                function addSection(startOffset, endOffset) {
                    var sectionText = tmpText.substring(offset, endOffset);
                    sectionList.push({
                        text: sectionText,
                        textWithDelimiter: '\n<div class="se-section-delimiter"></div>\n\n' + sectionText + '\n'
                    });
                }
                var sectionList = [], offset = 0;
                // Look for delimiters
                tmpText.replace(regexp, function(match, matchOffset) {
                    // Create a new section with the text preceding the delimiter
                    addSection(offset, matchOffset);
                    offset = matchOffset;
                });
                // Last section
                addSection(offset, text.length);
                //eventMgr.onSectionsCreated(sectionList);
                return _.reduce(sectionList, function(result, section) {
                    return result + section.textWithDelimiter;
                }, '');
            });

            var config = {
                extensions: [
                    "fenced_code_gfm",
                    "tables",
                    "def_list",
                    "attr_list",
                    "footnotes",
                    // smartypants不要, 因为它把'和"转成了中文引号, --转成了一个–
                    // "smartypants", // https://daringfireball.net/projects/smartypants/
                    /*s
                    SmartyPants is a free web publishing plug-in for Movable Type, Blosxom, and BBEdit that easily translates plain ASCII punctuation characters into “smart” typographic punctuation HTML entities.
        SmartyPants can perform the following transformations:
        
        Straight quotes ( " and ' ) into “curly” quote HTML entities
        Backticks-style quotes (``like this'') into “curly” quote HTML entities
        Dashes (“--” and “---”) into en- and em-dash entities
        Three consecutive dots (“...”) into an ellipsis entity
        This means you can write, edit, and save your posts using plain old ASCII straight quotes, plain dashes, and plain dots, but your published posts (and final HTML output) will appear with smart quotes, em-dashes, and proper ellipses.
        
        SmartyPants is a combination plug-in — a single plug-in file that works with Movable Type, Blosxom, and BBEdit. It can also be used from a Unix-style command-line.
        
        SmartyPants does not modify characters within <pre>, <code>, <kbd>, or <script> tag blocks. Typically, these tags are used to display text where smart quotes and other “smart punctuation” would not be appropriate, such as source code or example markup.
                     */
                    "strikethrough",
                    "newlines",
                ],
                intraword: true,
                comments: true,
                highlighter: "prettify"
            };

            var extraOptions = {
                extensions: config.extensions
            };


            extraOptions.highlighter = "prettify";
            Markdown.Extra.init(converter, extraOptions);
            converter.hooks.chain("postConversion", function(html) {
                buf = [];
                html.split('<div class="se-preview-section-delimiter"></div>').forEach(function(sectionHtml) {
                    htmlParser(sectionHtml, htmlSanitizeWriter(buf
                        /*, function(uri, isImage) {
                        return !/^unsafe/.test(sanitizeUri(uri, isImage));
                    }*/));
                    buf.push('<div class="se-preview-section-delimiter"></div>');
                });
                return buf.slice(0, -1).join('');
            });


            // Regular Expressions for parsing tags and attributes
            var START_TAG_REGEXP =
                /^<\s*([\w:-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)\s*>/,
                END_TAG_REGEXP = /^<\s*\/\s*([\w:-]+)[^>]*>/,
                ATTR_REGEXP = /([\w:-]+)(?:\s*=\s*(?:(?:"((?:[^"])*)")|(?:'((?:[^'])*)')|([^>\s]+)))?/g,
                BEGIN_TAG_REGEXP = /^</,
                BEGING_END_TAGE_REGEXP = /^<\s*\//,
                COMMENT_REGEXP = /<!--(.*?)-->/g,
                DOCTYPE_REGEXP = /<!DOCTYPE([^>]*?)>/i,
                CDATA_REGEXP = /<!\[CDATA\[(.*?)]]>/g,
                // Match everything outside of normal chars and " (quote character)
                NON_ALPHANUMERIC_REGEXP = /([^\#-~| |!])/g;

            function makeMap(str) {
                var obj = {}, items = str.split(','), i;
                for (i = 0; i < items.length; i++) {
                    obj[items[i]] = true;
                }
                return obj;
            }

            // Good source of info about elements and attributes
            // http://dev.w3.org/html5/spec/Overview.html#semantics
            // http://simon.html5.org/html-elements

            // Safe Void Elements - HTML5
            // http://dev.w3.org/html5/spec/Overview.html#void-elements
            var voidElements = makeMap("area,br,col,hr,img,wbr");

            // Elements that you can, intentionally, leave open (and which close themselves)
            // http://dev.w3.org/html5/spec/Overview.html#optional-tags
            var optionalEndTagBlockElements = makeMap("colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr"),
                optionalEndTagInlineElements = makeMap("rp,rt"),
                optionalEndTagElements = _.extend({},
                    optionalEndTagInlineElements,
                    optionalEndTagBlockElements);

            // 允许的elements
            // Safe Block Elements - HTML5
            var blockElements = _.extend({}, optionalEndTagBlockElements, makeMap("address,article," +
                "aside,blockquote,caption,center,del,dir,div,dl,figure,figcaption,footer,h1,h2,h3,h4,h5," +
                "h6,header,hgroup,hr,ins,map,menu,nav,ol,pre,script,section,table,ul,embed,iframe"));

            // Inline Elements - HTML5
            var inlineElements = _.extend({}, optionalEndTagInlineElements, makeMap("a,abbr,acronym,b," +
                "bdi,bdo,big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,mark,q,ruby,rp,rt,s," +
                "samp,small,span,strike,strong,sub,sup,time,tt,u,var,input"));

            // Special Elements (can contain anything)
            // var specialElements = makeMap("script,style"); //  style为什么需要, 是因为表格style="align:left"
            var specialElements = makeMap("script"); //  style为什么需要, 是因为表格style="align:left"

            // benweet: Add iframe
            // blockElements.iframe = true;

            var validElements = _.extend({},
                voidElements,
                blockElements,
                inlineElements,
                optionalEndTagElements);

            //Attributes that have href and hence need to be sanitized
            var uriAttrs = makeMap("background,cite,href,longdesc,src,usemap");
            var validAttrs = _.extend({}, uriAttrs, makeMap(
                'abbr,align,alt,axis,bgcolor,border,cellpadding,cellspacing,class,clear,' +
                'color,cols,colspan,compact,coords,dir,face,headers,height,hreflang,hspace,' +
                'ismap,lang,language,nohref,nowrap,rel,rev,rows,rowspan,rules,' +
                'scope,scrolling,shape,size,span,start,summary,target,title,type,' +
                'valign,value,vspace,width,checked,style')); // style为什么需要, 是因为表格style="align:left"

            // benweet: Add id and allowfullscreen (YouTube iframe)
            validAttrs.id = true;
            validAttrs.allowfullscreen = true;

            /*
            * HTML Parser By Misko Hevery (misko@hevery.com)
            * based on:  HTML Parser By John Resig (ejohn.org)
            * Original code by Erik Arvidsson, Mozilla Public License
            * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
            *
            * // Use like so:
            * htmlParser(htmlString, {
            *     start: function(tag, attrs, unary) {},
            *     end: function(tag) {},
            *     chars: function(text) {},
            *     comment: function(text) {}
            * });
            *
            */
            /* jshint -W083 */
            function htmlParser(html, handler) {
                var index, chars, match, stack = [], last = html;
                stack.last = function () {
                    return stack[stack.length - 1];
                };

                function parseStartTag(tag, tagName, rest, unary) {
                    tagName = tagName && tagName.toLowerCase();
                    if (blockElements[tagName]) {
                        while (stack.last() && inlineElements[stack.last()]) {
                            parseEndTag("", stack.last());
                        }
                    }

                    if (optionalEndTagElements[tagName] && stack.last() == tagName) {
                        parseEndTag("", tagName);
                    }

                    unary = voidElements[tagName] || !!unary;

                    if (!unary) {
                        stack.push(tagName);
                    }

                    var attrs = {};

                    rest.replace(ATTR_REGEXP,
                        function (match, name, doubleQuotedValue, singleQuotedValue, unquotedValue) {
                            var value = doubleQuotedValue ||
                                singleQuotedValue ||
                                unquotedValue ||
                                '';

                            attrs[name] = decodeEntities(value);
                        });
                    if (handler.start) {
                        handler.start(tagName, attrs, unary);
                    }
                }

                function parseEndTag(tag, tagName) {
                    var pos = 0, i;
                    tagName = tagName && tagName.toLowerCase();
                    if (tagName) {
                        // Find the closest opened tag of the same type
                        for (pos = stack.length - 1; pos >= 0; pos--) {
                            if (stack[pos] == tagName) {
                                break;
                            }
                        }
                    }

                    if (pos >= 0) {
                        // Close all the open elements, up the stack
                        for (i = stack.length - 1; i >= pos; i--) {
                            if (handler.end) {
                                handler.end(stack[i]);
                            }
                        }

                        // Remove the open elements from the stack
                        stack.length = pos;
                    }
                }

                while (html) {
                    chars = true;

                    // Make sure we're not in a script or style element
                    if (!stack.last() || !specialElements[stack.last()]) {

                        // Comment
                        if (html.indexOf("<!--") === 0) {
                            // comments containing -- are not allowed unless they terminate the comment
                            index = html.indexOf("--", 4);

                            if (index >= 0 && html.lastIndexOf("-->", index) === index) {
                                if (handler.comment) {
                                    handler.comment(html.substring(4, index));
                                }
                                html = html.substring(index + 3);
                                chars = false;
                            }
                            // DOCTYPE
                        } else if (DOCTYPE_REGEXP.test(html)) {
                            match = html.match(DOCTYPE_REGEXP);

                            if (match) {
                                html = html.replace(match[0], '');
                                chars = false;
                            }
                            // end tag
                        } else if (BEGING_END_TAGE_REGEXP.test(html)) {
                            match = html.match(END_TAG_REGEXP);

                            if (match) {
                                html = html.substring(match[0].length);
                                match[0].replace(END_TAG_REGEXP, parseEndTag);
                                chars = false;
                            }

                            // start tag
                        } else if (BEGIN_TAG_REGEXP.test(html)) {
                            match = html.match(START_TAG_REGEXP);

                            if (match) {
                                html = html.substring(match[0].length);
                                match[0].replace(START_TAG_REGEXP, parseStartTag);
                                chars = false;
                            }
                        }

                        if (chars) {
                            index = html.indexOf("<");

                            var text = index < 0 ? html : html.substring(0, index);
                            html = index < 0 ? "" : html.substring(index);

                            if (handler.chars) {
                                handler.chars(decodeEntities(text));
                            }
                        }

                    } else {
                        html = html.replace(new RegExp("(.*)<\\s*\\/\\s*" + stack.last() + "[^>]*>", 'i'),
                            function (all, text) {
                                text = text.replace(COMMENT_REGEXP, "$1").replace(CDATA_REGEXP, "$1");

                                if (handler.chars) {
                                    handler.chars(decodeEntities(text));
                                }

                                return "";
                            });

                        parseEndTag("", stack.last());
                    }

                    if (html == last) {
                        //throw new Error("The sanitizer was unable to parse the following block of html: " + html);
                        stack.reverse();
                        return stack.forEach(function (tag) {
                            buf.push('</');
                            buf.push(tag);
                            buf.push('>');
                        });
                    }
                    last = html;
                }

                // Clean up any remaining tags
                parseEndTag();
            }

            var hiddenPre = document.createElement("pre");
            var spaceRe = /^(\s*)([\s\S]*?)(\s*)$/;

            /**
            * decodes all entities into regular string
            * @param value
            * @returns {string} A string with decoded entities.
            */
            function decodeEntities(value) {
                if (!value) {
                    return '';
                }

                // Note: IE8 does not preserve spaces at the start/end of innerHTML
                // so we must capture them and reattach them afterward
                var parts = spaceRe.exec(value);
                var spaceBefore = parts[1];
                var spaceAfter = parts[3];
                var content = parts[2];
                if (content) {
                    hiddenPre.innerHTML = content.replace(/</g, "&lt;");
                    // innerText depends on styling as it doesn't display hidden elements.
                    // Therefore, it's better to use textContent not to cause unnecessary
                    // reflows. However, IE<9 don't support textContent so the innerText
                    // fallback is necessary.
                    content = 'textContent' in hiddenPre ?
                        hiddenPre.textContent : hiddenPre.innerText;
                }
                return spaceBefore + content + spaceAfter;
            }

            /**
            * Escapes all potentially dangerous characters, so that the
            * resulting string can be safely inserted into attribute or
            * element text.
            * @param value
            * @returns {string} escaped text
            */
            function encodeEntities(value) {
                return value.
                    replace(/&/g, '&amp;').
                    replace(NON_ALPHANUMERIC_REGEXP, function (value) {
                        return '&#' + value.charCodeAt(0) + ';';
                    }).
                    replace(/</g, '&lt;').
                    replace(/>/g, '&gt;');
            }


            /**
            * create an HTML/XML writer which writes to buffer
            * @param {Array} buf use buf.jain('') to get out sanitized html string
            * @returns {object} in the form of {
            *     start: function(tag, attrs, unary) {},
            *     end: function(tag) {},
            *     chars: function(text) {},
            *     comment: function(text) {}
            * }
            */
            function htmlSanitizeWriter(buf /* , uriValidator */) {
                var ignore = false;
                var out = _.bind(buf.push, buf);
                return {
                    start: function (tag, attrs, unary) {
                        tag = tag && tag.toLowerCase();
                        if (!ignore && specialElements[tag]) {
                            ignore = tag;
                        }
                        if (!ignore && validElements[tag] === true) {
                            out('<');
                            out(tag);
                            _.forEach(attrs, function (value, key) {
                                var lkey = key && key.toLowerCase();
                                // var isImage = (tag === 'img' && lkey === 'src') || (lkey === 'background');
                                if (validAttrs[lkey] === true &&
                                    (uriAttrs[lkey] !== true || true/* || uriValidator(value, isImage) */)) {
                                    out(' ');
                                    out(key);
                                    out('="');
                                    out(encodeEntities(value));
                                    out('"');
                                }
                            });
                            out(unary ? '/>' : '>');
                        }
                    },
                    end: function (tag) {
                        tag = tag && tag.toLowerCase();
                        if (!ignore && validElements[tag] === true) {
                            out('</');
                            out(tag);
                            out('>');
                        }
                        if (tag == ignore) {
                            ignore = false;
                        }
                    },
                    chars: function (chars) {
                        if (!ignore) {
                            out(encodeEntities(chars));
                        }
                    },
                    comment: function (comment) {
                        if (!ignore) {
                            out('<!--');
                            out(encodeEntities(comment));
                            out('-->');
                        }
                    }
                };
            }

        }
    };    
    view.init();
    attach_content_var = view;
});