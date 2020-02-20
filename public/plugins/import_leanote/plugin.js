/**
 * 导入leanote, 重构
 * @author life@leanote.com
 * @date 2015/04/09
 */
define(function() {
	var importService; //  = nodeRequire('./public/plugins/import_leanote/import');
	var bookserivce; // = require('notebook')
	var leanote = {

		langs: {
			'en-us': {
				'importLeanote': 'Import Leanote',
			},
			'de-de': {
				'importLeanote': 'Leanote Datei importieren',
				'Choose Leanote files(.leanote)': 'Leanote Dateien (.leanote) auswählen',
				'Close': "Schliessen",
				'Import to': "Importiere in Notizbuch",
				"Done! %s notes imported!": "Abgeschlossen! Es wurden %s Notizen importiert!",
				"Import file: %s Success!": "Datei importieren: %s erfolgreich!",
				"Import file: %s Failure, is leanote file ?": "Datei importieren: %s fehlgeschlagen! Ist das eine Leanote Datei?",
				"Import: %s Success!": "Import: %s erfolgreich!"
			},
			'zh-cn': {
				'importLeanote': '导入Leanote',
				'Choose Leanote files(.leanote)': '选择Leanote文件(.leanote)',
				'Close': "关闭",
				'Import to': "导入至",
				"Done! %s notes imported!": "完成, 成功导入 %s 个笔记!",
				"Import file: %s Success!": "文件 %s 导入成功!",
				"Import file: %s Failure, is leanote file ?": "文件 %s 导入失败! 是Leanote文件?",
				"Import: %s Success!": "导入笔记: %s 成功!",
				"All": "所有",				
				"%s notes failed!": "失败 %s 个",
				"Choose Leanote root dir": "选择需要导入文件夹",
				"UnTitled": "无标题"
			},
			'zh-hk': {
				'importLeanote': '導入Leanote',
				'Choose Leanote files(.leanote)': '選擇Leanote文件(.leanote)',
				'Close': "關閉",
				"Import to": "導入至",
				"Done! %s notes imported!": "完成, 成功導入 %s 個筆記!",
				"Import file: %s Success!": "文件 %s 導入成功!",
				"Import file: %s Failure, is leanote file ?": "文件 %s 導入失敗! 是Leanote文件?",
				"Import: %s Success!": "導入筆記: %s 成功!"
			}
		},

		_tpl: `
		<style>
		#importLeanoteDialog .tab-pane {
		  text-align: center;
		  padding: 10px;
		  padding-top: 20px;
		}
		#importLeanoteDialog .alert {
		  margin-top: 10px;
		  padding: 0;
		  border: none;
		}
		</style>
	    <div class="modal fade bs-modal-sm" id="importLeanoteDialog" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel">
	        <div class="modal-dialog modal-sm">
	          <div class="modal-content">
	          <div class="modal-header">
	              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
	              <h4 class="modal-title" class="modalTitle"><span class="lang">Import to</span> <span id="importDialogNotebookLeanote"></span></h4>
	          </div>
	          <div class="modal-body" id="">
	            <div role="tabpanel">

	              <!-- Tab panes -->
	              <div class="tab-content">
	                <div role="tabpanel" class="tab-pane active" id="leanoteTab">
	                    <!-- import -->
	                    <a id="chooseLeanoteFile" class="btn btn-success btn-choose-file">
	                      <i class="fa fa-upload"></i>
	                      <span class="lang">Choose Leanote files(.leanote)</span>
						</a>
						<a id="chooseLeanoteDir" class="btn btn-success btn-choose-file">
	                      <i class="fa fa-upload"></i>
	                      <span class="lang">Choose Leanote root dir</span>
						</a>
						

	                    <!-- 消息 -->
	                    <div id="importLeanoteMsg" class="alert alert-info">
	                        <div class="curImportFile"></div>
	                        <div class="curImportNote"></div>
	                        <div class="allImport"></div>
	                    </div>
	                </div>
	                <div role="tabpanel" class="tab-pane" id="youdaoTab">
	                	<!-- 文件选择框 -->
				        <input id="importLeanoteInput" type="file" nwsaveas="" accept=".enex" multiple style="" style="display: none"/>
	                </div>
	              </div>

	            </div>
	          </div>
	          <div class="modal-footer ">
	            <button type="button" class="btn btn-default upgrade-cancel-btn lang" data-dismiss="modal">Close</button>
	          </div>
	          </div><!-- /.modal-content -->
	        </div><!-- /.modal-dialog -->
	    </div><!-- /.modal -->
		`,
		_importDialog: null,
		_curNotebook: null,
		_notebooks: null, 
		_inited: false,

		getMsg: function(txt, data) {
			return Api.getMsg(txt, 'plugin.import_leanote', data)
		},

		init: function() {
			var me = this;
			me._inited = true;
			bookserivce = require('notebook');

			$('body').append(me._tpl);
			me._importDialog = $("#importLeanoteDialog");

			me._importDialog.find('.lang').each(function() {
				var txt = $.trim($(this).text());
				$(this).text(me.getMsg(txt));
			});

			// 导入, 选择文件
			$('#chooseLeanoteFile').click(function() {
				var importFunc = function(paths) {
					var notebookId = me._curNotebook.NotebookId;

					var n = 0;

					me.clear();

					if (!importService) {
						importService = nodeRequire('./public/plugins/import_leanote/import');
					}
					
					var needUpdateNum = {};
					importService.importFromLeanote(notebookId, paths,
						// 全局
						function(ok) {
							// $('#importLeanoteMsg .curImportFile').html("");
							// $('#importLeanoteMsg .curImportNote').html("");
							var keys = [];
							for (var key in needUpdateNum) {            
								keys.push(key);
							}

							setTimeout(function() {
								$('#importLeanoteMsg .allImport').html(me.getMsg('Done! %s notes imported!', n));
								importService.flushNoteNumbersNote(keys);

							}, 500);
						},
						// 单个文件
						function(ok, filename) {
							if(ok) {
								$('#importLeanoteMsg .curImportFile').html(me.getMsg("Import file: %s Success!", filename));
							} else {
								$('#importLeanoteMsg .curImportFile').html(me.getMsg("Import file: %s Failure, is leanote file ?", filename));
							}
						},
						// 单个笔记
						function(note) {
							if(note) {
								n++;
								$('#importLeanoteMsg .curImportNote').html(me.getMsg("Import: %s Success!", note.Title));
								if(note && typeof note == 'object') {
									if(note.hasOwnProperty('markUpdateNum') && note.markUpdateNum) {
									  needUpdateNum[note.NotebookId] = 1;
									}
								  }									
								// 不要是新的, 不然切换笔记时又会保存一次
								note.IsNew = false;
								
								// 插入到当前笔记中
								Note.addSync([note]);
							}
						}
					);
				};
				Api.gui.dialog.showOpenDialog(Api.gui.getCurrentWindow(), 
					{
						properties: ['openFile', 'multiSelections'],
						filters: [
							{ name: 'Leanote', extensions: ['leanote'] }
						]
					},
					function(paths) {
						//旧版本调用 
						if(!paths) {
							return;
						}
						importFunc(paths);
					}
				).then( result => {
					var paths = result.filePaths;
					if(!paths) {
						return;
					}
					importFunc(paths);
				}).catch(result => {
					console.log(result);
				});

			});

			$('#chooseLeanoteDir').click(function(){
				var importFunc = function(paths) {
					dir = paths[0];
					// 获取当前目录所有笔记，并将路径进行拆分
					if (!importService) {
						importService = nodeRequire('./public/plugins/import_leanote/import');
					}
					// 异步处理

					importService.importFromDir(me._curNotebook, dir, 
						function(ok, summary) {
							//汇总
							// summary --> {createNotebooks, suc, fail}
							$('#importLeanoteMsg .allImport').html(me.getMsg('Done! %s notes imported!', "" + summary.suc) + me.getMsg("%s notes failed!", "" + summary.fail));

							// 
							setTimeout(() => {
								Note.searchNote();
							}, 1000);

						},
						function(ok, filename) {
							// 处理单个一个文件
							// if(ok) {
							// 	$('#importLeanoteMsg .curImportFile').append(me.getMsg("Import file: %s Success!", filename)).append("<br>");
							// } else {
							// 	$('#importLeanoteMsg .curImportFile').append(me.getMsg("Import file: %s Failure, is leanote file ?", filename)).append("<br>");
							// }
						},
						function(note) {
							if(note) {
								var title = note.Title;
								if(title == null || title == '')
									title = me.getMsg("UnTitled");
								$('#importLeanoteMsg .curImportNote').append(me.getMsg("Import: %s Success!", title)).append("<br>");
								// 不要是新的, 不然切换笔记时又会保存一次
								note.IsNew = false;								
								// 插入到当前笔记中
								Note.addSync([note]);
							}
						}
					);
				};
				
				// 点击
				Api.gui.dialog.showOpenDialog(Api.gui.getCurrentWindow(),
				{
					properties: ['openDirectory'],
				},
				function(dirs) {
					if(!dirs || dirs.length == 0)
						return;
					// 旧版本调用 
					importFunc(dirs);					
				}
				).then( result => {
					var paths = result.filePaths;
					if(!paths) {
						return;
					}
					importFunc(paths);
				}).catch(result => {
					console.log(result);
				});
			});

		},

		clear: function() {
			$('#importLeanoteMsg .curImportFile').html("");
			$('#importLeanoteMsg .curImportNote').html("");
			$('#importLeanoteMsg .allImport').html('');
		},
		loadAllNotes: function() {
			var me = this;
			bookserivce.getNotebooks(function(notebooks) {
				// 首先取得导出主目录
				//console.log('log' + notebooks);
				if (!notebooks || typeof notebooks != "object" || notebooks.length < 0) {
					me._notebooks = [];
					return;
				}
				me._notebooks = notebooks;
			});
		},

		open: function(notebook) {
			var me = this;
			if(!notebook) {
				return;
			}
			if(!me._inited) {
				me.init();
			}
			me.clear();			
			$('#importDialogNotebookLeanote').html(notebook.Title);
			$('#chooseLeanoteFile').show();
			me._curNotebook = notebook;
			var notebookId = notebook.NotebookId;
			// 获取所有笔记本
			me.loadAllNotes();
			me._importDialog.modal('show');
		},
		opendir: function() {
			var me = this;
			if(!me._inited) {
				me.init();
			}
			me.clear();
			$('#importDialogNotebookLeanote').html(Api.getMsg('plugin.import_leanote.All'));
			// 获取所有笔记本
			me.loadAllNotes();
			// 隐藏导入单个按钮
			$('#chooseLeanoteFile').hide();
			me._curNotebook = null;
			me._importDialog.modal('show');

		},

		
		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

			Api.addImportMenu({
		        label: Api.getMsg('plugin.import_leanote.importLeanote'),
		        click: (function() {
		        	return function(notebook) {
		        		me.open(notebook);
			        };
			    })()
			});
			
			//  添加导入全部笔记
			Api.addImportAllMenu({
				label: Api.getMsg('plugin.import_leanote.importLeanote'),
				click: (function() {
		        	return function() {
		        		me.opendir();
			        };
			    })()
			});


		},
		// 打开后
		onOpenAfter: function() {
		},
		// 关闭时需要运行的
		onClose: function() {
		}
	};

	return leanote;
});
