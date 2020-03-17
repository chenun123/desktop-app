var fs = require('fs');
var Evt = require('evt');
var File = require('file');
var Note = require('note');
var Web = require('web');
var Tag = require('tag');
var async = require('async');
var Common = require('common');
var resanitize = require('resanitize');
var path = require('path');

var bookserivce = require('notebook')

var Import = {
  // 解析Leanote
  /*
  {
  exportDate: '2015-10-12 12:00:00',
  app: 'leanote.desktop.app.mac',
  appVersion: '1.0',
  notes: [
    {
      title: 'life',
      content: 'laldfadf', // 图片, 附件链接为 leanote://file/getImage?fileId=xxxx, leanote://file/getAttach?fileId=3232323
      tags: [1,2,3],
      isMarkdown: true,
      author: 'leanote', // 作者, 没用
      createdTime: '2015-10-12 12:00:00',
      updatedTime: '2015-10-12 12:00:00',
      files: [
        {fileId: '', base64: '', md5: '', type: 'png', 'isAttach': false, createdTime: '2031-12-31 12:12:32'}
        {fileId: '', base64: '', md5: '', type: 'png', 'isAttach': false, createdTime: '2031-12-31 12:12:32'}
      ]
    }
  ]
 }
  */

  // callback 是全局的
  // eachFileCallback是每一个文件的
  // eachNoteFileCallback是每一个笔记的
  // filePaths = []
  importFromLeanote: function (notebookId, filePaths, callback,
    eachFileCallback,
    eachNoteCallback) {
    var me = this;
    // var filePaths = filePaths.split(';');
    // 
    var filePaths = filePaths || [];

    async.eachSeries(filePaths, function (path, cb) {

      try {
        var json = JSON.parse(fs.readFileSync(path));
        me.parseLeanote(notebookId, json, function (ret) {
          // 单个文件完成
          eachFileCallback(ret, path)
          cb();
        },
          // 单个笔记
          function (ret) {
            eachNoteCallback(ret);
          });
      } catch (e) {
        cb();
        return false;
      }
    }, function () {
      // 全部完成
      callback(true);
    });
  },

  // notebookId --> 父节点ID，null时为根
  // dir 需要导入的目录
  // callback 汇总信息 - 笔记总数~ 笔记本创建数，笔记创建数
  // eachFileCallback 是每一个文件的
  // eachNoteFileCallback是每一个笔记的
  // 

  scanDir: function (dir) {
    var me = this;
    var ndirs = {};
    ndirs['name'] = path.basename(dir);
    ndirs['path'] = dir;
    ndirs['subs'] = [];
    ndirs['notes'] = [];
    ndirs['exists'] = false;

    var paths = fs.readdirSync(dir);
    paths.forEach((element) => {
      var one_path = path.join(dir, element);
      const stat = fs.statSync(one_path);

      if (stat.isFile() && path.extname(element) == '.leanote') {
        var json = JSON.parse(fs.readFileSync(one_path));
        var notes = json.notes || [];
        if (Common.isEmpty(notes)) {
          return;
        }
        ndirs['notes'].push({
          'name': path.basename(element),
          'path': one_path,
          'json': json
        });
      } else if (stat.isDirectory()) {
        ndirs['subs'].push(me.scanDir(one_path));
      }


    });


    return ndirs;
  },

  fixScanDir: function (dirs, notebooks) {
    var me = this;
    var curbooks = [];

    for (var i = 0; i < notebooks.length; i++) {
      curbooks.push(notebooks[i].Title);
    }

    for (var i = 0; i < dirs.length; i++) {
      // 查看是否存在
      var pos = curbooks.indexOf(dirs[i].name);
      if (pos > -1) {
        //找到同样的，则处理
        dirs[i]['exists'] = true;
        dirs[i]['notebookid'] = notebooks[pos]['NotebookId'];

        // 查看是否需要遍历子
        if (dirs[i]['subs'].length > 0) {
          me.fixScanDir(dirs[i]['subs'], notebooks[pos]['Subs']);
        }
      }
    }


  },

  getNoteBooksWithRootId: function (notebooks, bookid) {
    var me = this;
    if (bookid == null || bookid == undefined) {
      return null;
    }
    var vret = null;
    for (var i = 0; i < notebooks.length; i++) {
      if (notebooks[i].NotebookId == bookid) {
        return notebooks[i].Subs;
      }

      vret = me.getNoteBooksWithRootId(notebooks[i].Subs, bookid);
      if (vret) break;
    }

    return vret;
  },

  fixScanDirs: function (dirs, notebooks, rootbook) {
    var me = this;
    // 获取当前Notebookid 对应的notebooks
    var nbks = me.getNoteBooksWithRootId(notebooks, rootbook);
    var parentId = null;
    if (nbks != null) {
      parentId = rootbook;
      notebooks = nbks;
    }
    me.fixScanDir(dirs, notebooks);
  },

  flushNoteNumbersNote: function(keys) {
    Web.Notebook.flushNotebookNumberNotes(keys);
  },


  importFromDir: function (notebookId, dir, callback, eachFileCallback, eachNoteCallback) {
    var me = this;
    // 首先取得目录结构    
    // { path:"", notebookId: null, subs: [], notes: []} 
    // path 为当前名称~ no pre or padding
    // notebookId 当前笔记本对应ID， subs 子目录， notes当前目录下笔记
    notebooks_dir = me.scanDir(dir);
    if (!notebooks_dir || typeof notebooks_dir != "object" || (notebooks_dir['subs'].length == 0 && notebooks_dir['notes'].length)) {
      callback(false, {});
      return;
    }
    // 对于根目录，需要过滤掉
    //notebooks_dir['path'] = '';
    //console.log(notebooks_dir);
    // 取得所有笔记
    bookserivce.getNotebooks(function (notebooks) {
      var _notebooks = [];
      if (!notebooks || typeof notebooks != "object" || notebooks.length < 0) {

      } else {
        _notebooks = notebooks;
      }

      //根据已有笔记 修改目录结构信息
      //忽略第一层 
      //TODO 当为文件夹时，需要对第一层进行处理
      //TODO 删除空文件夹
      me.fixScanDirs(notebooks_dir["subs"], _notebooks, notebookId);
      //console.log(notebooks_dir);

      // 获取需要更新文件总数
      var getNotesNum = function (dir) {
        var vret = dir.notes.length;
        for (var i = 0; i < dir.subs.length; i++) {
          vret += getNotesNum(dir.subs[i]);
        }
        // 缓存当前目录所有的个数（递归）
        dir["total"] = vret;
        return vret;
      };

      var notes_num = 0;
      for (var i = 0; i < notebooks_dir["subs"].length; i++) {
        notes_num += getNotesNum(notebooks_dir["subs"][i]);
      }
      notebooks_dir["total"] = notes_num;
      console.log("Scan notes:", notes_num);
      var processed_suc_num = 0;
      var processed_fail_num = 0;
      var createNotebooks = 0;

      var needUpdateNum = {};

      var check_import_status = function() {
        if(processed_fail_num + processed_suc_num == notes_num) {
          // 全部完成，则  
          callback(true, {"createNotebooks": createNotebooks, "suc": processed_suc_num, "fail": processed_fail_num});
          // 更新树目录        
          Notebook.reload();          
          // 更新数量
          var keys = [];
          for (var key in needUpdateNum) {            
            keys.push(key);
          }

          setTimeout(() => {
            Web.Notebook.flushNotebookNumberNotes(keys);
          }, 500);

          return;
        }
      
      };


      var importDirNotes = function(notes, pid) {
        async.eachSeries(notes, function (noteinfo, cb) {
          try {                
            me.parseLeanote(pid, noteinfo.json, function (ret) {
              // 单个文件完成
              eachFileCallback(ret, noteinfo.path)              
              processed_suc_num += 1;                  
              cb();
            },
              // 单个笔记
              function (ret) {
                if(ret && typeof ret == 'object') {
                  if(ret.hasOwnProperty('markUpdateNum') && ret.markUpdateNum) {
                    needUpdateNum[ret.NotebookId] = 1;
                  }
                }

                eachNoteCallback(ret);
              });
          } catch (e) {            
            processed_fail_num += 1;                
            cb();
            return false;
          }
        }, function () {
          // 全部完成
          check_import_status();
        });
      };

      var createNotebook = function(pid, dirs, pos, parentId) {
        bookserivce.addNotebook(pid, dirs[pos].name, parentId, function (newb) {
          // 在其中不能使用可能变化的量
          if (!newb) {
            console.log("create notebook error -> " + dirs[pos].name);
            //当失败时，则更新失败笔记数量
            processed_fail_num += dirs[pos].total;
            // check
            check_import_status();
          } else {
            console.log("create " + dirs[pos].name + " successful");
            createNotebooks += 1;
            //创建成功，则先导入当前目录下所有日记
            importDirNotes(dirs[pos].notes, pid);
            //如果存在子目录，则递归处理
            if (dirs[pos].subs.length > 0)
              importDirs(dirs[pos].subs, pid);
            }
          });
      }

      var importDirs = function (dirs, parentId) {
        for (var i = 0; i < dirs.length; i++) {
          var pid = null;
          if (dirs[i].exists) {
            pid = dirs[i].notebookid;
            //先导入当前目录下所有日记
            importDirNotes(dirs[i].notes, pid);
            //如果存在子目录，则递归处理
            if (dirs[i].subs.length > 0)
              importDirs(dirs[i].subs, pid);
            } else {
              //不存在，则创建
              pid = Common.objectId();
              // 添加，如何同步~ ~
              createNotebook(pid, dirs, i, parentId);
            }
          }
        };
        // 如果不存在，则创建, 并且导入笔记~~, 此处使用Promise实现并行处理
      importDirs(notebooks_dir["subs"], notebookId == null?"": notebookId);
    });
  },


  // 2015-12-12 12:00:00
  parseLeanoteTime: function (str) {
    if (!str || typeof str != 'string' || str.length != '2015-12-12 12:00:00'.length) {
      return new Date();
    }

    var d = new Date(str);
    // invalid
    if (isNaN(d.getTime())) {
      return new Date();
    }
    return d;
  },

  // 处理内容中的链接
  fixContentLink: function (note, filesFixed) {
    var me = this;

    var content = note.content;
    var allMatchs = [];

    if (note.isMarkdown) {

      // image
      var reg = new RegExp('!\\[([^\\]]*?)\\]\\(leanote://file/getImage\\?fileId=([0-9a-zA-Z]{24})\\)', 'g');
      var matches = reg.exec(content);
      // 先找到所有的
      while (matches) {
        var all = matches[0];
        var title = matches[1]; // img与src之间
        var fileId = matches[2];
        allMatchs.push({
          fileId: fileId,
          title: title,
          all: all,
          isAttach: false
        });
        // 下一个
        matches = reg.exec(content);
      }
      // image with img
      reg = new RegExp('<img([^>]*?)src=["\']?leanote://file/getImage\\?fileId=([0-9a-zA-Z]{24})["\']?(.*?)>', 'g');
      matches = reg.exec(content);
      while (matches) {
        var all = matches[0];
        var pre = matches[1]; // img与src之间
        var fileId = matches[2];
        var back = matches[3]; // src与>之间
        allMatchs.push({
          fileId: fileId,
          pre: pre,
          back: back,
          all: all,
          imgStyle: true
        });
        // 下一个
        matches = reg.exec(content);
      }

      // attach
      reg = new RegExp('\\[([^\\]]*?)\\]\\(leanote://file/getAttach\\?fileId=([0-9a-zA-Z]{24})\\)', 'g');
      matches = reg.exec(content);
      // 先找到所有的
      while (matches) {
        var all = matches[0];
        var title = matches[1]; // img与src之间
        var fileId = matches[2];
        allMatchs.push({
          fileId: fileId,
          title: title,
          all: all,
          isAttach: true
        });
        // 下一个
        matches = reg.exec(content);
      }
    }
    else {

      // 图片处理后, 可以替换内容中的链接了
      // leanote://file/getImage?fileId=xxxx,
      var reg = new RegExp('<img([^>]*?)src=["\']?leanote://file/getImage\\?fileId=([0-9a-zA-Z]{24})["\']?(.*?)>', 'g');
      var matches = reg.exec(content);
      while (matches) {
        var all = matches[0];
        var pre = matches[1]; // img与src之间
        var fileId = matches[2];
        var back = matches[3]; // src与>之间
        allMatchs.push({
          fileId: fileId,
          pre: pre,
          back: back,
          all: all
        });
        // 下一个
        matches = reg.exec(content);
      }

      // 处理附件
      var reg = new RegExp('<a([^>]*?)href=["\']?leanote://file/getAttach\\?fileId=([0-9a-zA-Z]{24})["\']?(.*?)>([^<]*)</a>', 'g');
      var matches = reg.exec(content);
      // 先找到所有的
      while (matches) {
        var all = matches[0];
        var pre = matches[1]; // a 与href之间
        var fileId = matches[2];
        var back = matches[3] // href与>之间
        var title = matches[4];

        allMatchs.push({
          fileId: fileId,
          title: title,
          pre: pre,
          back: back,
          isAttach: true,
          all: all
        });
        // 下一个
        matches = reg.exec(content);
      }
    }

    // 替换内容
    for (var i = 0; i < allMatchs.length; ++i) {
      var eachMatch = allMatchs[i];
      var fileInfo = filesFixed[eachMatch.fileId];

      var link;
      if (!fileInfo) {
        link = '';
      }
      else {
        if (note.isMarkdown) {
          if (!eachMatch.isAttach) {            
            if(eachMatch.imgStyle) {
              var href = Api.evtService.getImageLocalUrl(fileInfo.FileId);
              link = '<img ' + eachMatch.pre + 'src="' + href + '"' + eachMatch.back + '>';
            } else {
              // 用新的FileId
              var href = Api.evtService.getImageLocalUrl(fileInfo.FileId);
              link = '![' + eachMatch.title + '](' + href + ')';
            }
            
          }
          else {
            var href = Api.evtService.getAttachLocalUrl(fileInfo.FileId);
            link = '[' + eachMatch.title + '](' + href + ')';
          }
        }
        else {
          if (!eachMatch.isAttach) {
            // 用新的FileId
            var href = Api.evtService.getImageLocalUrl(fileInfo.FileId);
            link = '<img ' + eachMatch.pre + 'src="' + href + '"' + eachMatch.back + '>';
          }
          else {
            var href = Api.evtService.getAttachLocalUrl(fileInfo.FileId);
            link = '<a ' + eachMatch.pre + 'href="' + href + '"' + eachMatch.back + '>' + eachMatch.title + '</a>';
          }
        }
      }
      content = content.replace(eachMatch.all, link);
    }
    note.content = content;
  },

  fixContent: function (content) {
    // srip unsage attrs
    var unsafeAttrs = ['id', , /on\w+/i, /data-\w+/i, 'clear', 'target'];
    content = content.replace(/<([^ >]+?) [^>]*?>/g, resanitize.filterTag(resanitize.stripAttrs(unsafeAttrs)));

    // strip unsafe tags
    content = resanitize.stripUnsafeTags(content,
      ['wbr', 'style', 'comment', 'plaintext', 'xmp', 'listing',
        'applet', 'base', 'basefont', 'bgsound', 'blink', 'body', 'button', 'dir', 'embed', 'fieldset', 'frameset', 'head',
        'html', 'iframe', 'ilayer', 'input', 'isindex', 'label', 'layer', 'legend', 'link', 'marquee', 'menu', 'meta', 'noframes',
        'noscript', 'object', 'optgroup', 'option', 'param', 'plaintext', 'script', 'select', 'style', 'textarea', 'xml']
    );
    return content;
  },

  // 解析笔记
  parseNote: function (notebookId, note, callback) {
    var me = this;
    // 先把files保存到本地
    var files = note.files || [];
    if (Common.isEmpty(files)) {
      files = [];
    }

    var filesFixed = {}; // fileId(旧) => {fileId: (新fileId)}
    var attachs = [];
    async.eachSeries(files,
      function (file, cb) {
        var isAttach = file.isAttach;
        File.writeBase64(file.base64, !isAttach, file.type, file.title, function (fileOk) {
          if (fileOk) {
            filesFixed[file.fileId] = fileOk;
            if (isAttach) {
              attachs.push(fileOk);
            }
          } else {
            console.log('文件保存错误!');
          }
          cb();
        });
      }, function () {

        me.fixContentLink(note, filesFixed);

        // 添加到数据库中
        var jsonNote = {
          Title: note.title,
          Content: note.content,//me.fixContent(note.content), // 對于leanote，不再進行修復
          Tags: note.tags || [],
          CreatedTime: me.parseLeanoteTime(note.createdTime),
          UpdatedTime: me.parseLeanoteTime(note.updatedTime),

          IsMarkdown: note.isMarkdown || false,
          Attachs: attachs,

          NotebookId: notebookId,
          Desc: '',
          NoteId: note.noteId != undefined ? note.noteId : Common.objectId(), // 指定ID，如果id一样，则更新，或者添加
          IsNew: true
        };
        jsonNote._id = jsonNote.NoteId;

        for (var h = 0; h < jsonNote.Tags.length; ++h) {
          var tagTitle = jsonNote.Tags[h];
          if (tagTitle) {
            Tag.addOrUpdateTag(tagTitle, function (tag) {
              Web.addTag(tag);
            });
          }
        }
        Note.updateNoteOrContent(jsonNote, function (insertedNote) {
          callback && callback(insertedNote);
        });
      }
    );
  },

  parseLeanote: function (notebookId, json, callback, eachCallback) {
    var me = this;
    var notes = json.notes || [];

    if (Common.isEmpty(notes)) {
      callback(true);
      return;
    }

    async.eachSeries(notes, function (note, cb) {
      me.parseNote(notebookId, note, function (insertedNote) {
        eachCallback(insertedNote);
        cb();
      });
    }, function () {
      callback(true);
    });
  }

};

module.exports = Import;
