const EventEmitter = nodeRequire("events");
const dragula = nodeRequire('dragula');
if (!document) {
  throw Error("electron-tabs module must be called in renderer process");
}

class TabGroup extends EventEmitter {
  constructor (args = {}) {
    super();
    let options = this.options = {
      tabContainerSelector: args.tabContainerSelector || ".etabs-tabs",
      tabClass: args.tabClass || "etabs-tab",
      closeButtonText: args.closeButtonText || "&#215;",
      newTab: args.newTab,      
      visibilityThreshold: args.visibilityThreshold || 0,
      ready: args.ready
    };
    this.tabContainer = document.querySelector(options.tabContainerSelector);
    this.tabs = [];
    this.newTabId = 0;
    this.callback = args.callback;
    TabGroupPrivate.initVisibility.bind(this)();
    if (typeof this.options.ready === "function") {
      this.options.ready(this);
    }
  }

  addTab (args = this.options.newTab) {
    if (typeof args === "function") {
      args = args(this);
    }
    let id = this.newTabId;
    this.newTabId++;
    let tab = new Tab(this, id, args);
    this.tabs.push(tab);
    // Don't call tab.activate() before a tab is referenced in this.tabs
    if (args.active === true) {
      tab.activate();
    }
    this.emit("tab-added", tab, this);
    return tab;
  }

  getTab (id) {
    for (let i in this.tabs) {
      if (this.tabs[i].id === id) {
        return this.tabs[i];
      }
    }
    return null;
  }

  getTabBySrc(src) {
    for (let i in this.tabs) {
      if (this.tabs[i].noteId === src) {
        return this.tabs[i];
      }
    }
    return null;
  }

  getTabByPosition (position) {
    let fromRight = position < 0;
    for (let i in this.tabs) {
      if (this.tabs[i].getPosition(fromRight) === position) {
        return this.tabs[i];
      }
    }
    return null;
  }

  getTabByRelPosition (position) {
    position = this.getActiveTab().getPosition() + position;
    if (position <= 0) {
      return null;
    }
    return this.getTabByPosition(position);
  }

  getNextTab () {
    return this.getTabByRelPosition(1);
  }

  getPreviousTab () {
    return this.getTabByRelPosition(-1);
  }

  getTabs () {
    return this.tabs.slice();
  }

  eachTab (fn) {
    this.getTabs().forEach(fn);
    return this;
  }

  getActiveTab () {
    if (this.tabs.length === 0) return null;
    return this.tabs[0];
  }
}

const TabGroupPrivate = {
  initVisibility: function () {
    function toggleTabsVisibility(tab, tabGroup) {
      var visibilityThreshold = this.options.visibilityThreshold;
      var el = tabGroup.tabContainer.parentNode;
      if (this.tabs.length >= visibilityThreshold) {
        el.classList.add("visible");
      } else {
        el.classList.remove("visible");
      }
    }

    this.on("tab-added", toggleTabsVisibility);
    this.on("tab-removed", toggleTabsVisibility);
  },

  removeTab: function (tab, triggerEvent) {
    let id = tab.id;
    for (let i in this.tabs) {
      if (this.tabs[i].id === id) {
        this.tabs.splice(i, 1);
        break;
      }
    }
    if (triggerEvent) {
      this.emit("tab-removed", tab, this);
    }
    return this;
  },

  setActiveTab: function (tab) {
    TabGroupPrivate.removeTab.bind(this)(tab);
    this.tabs.unshift(tab);
    this.emit("tab-active", tab, this);
    return this;
  },

  activateRecentTab: function (tab) {
    if (this.tabs.length > 0) {
      this.tabs[0].activate();
    }
    return this;
  }
};

class Tab extends EventEmitter {
  constructor (tabGroup, id, args) {
    super();
    this.tabGroup = tabGroup;
    this.id = id;
    this.title = args.title;
    this.badge = args.badge;
    this.iconURL = args.iconURL;
    this.icon = args.icon;
    this.closable = args.closable === false ? false : true;
    this.noteId = args.src;
    this.tabElements = {};
    TabPrivate.initTab.bind(this)();
    
    if (args.visible !== false) {
      this.show();
    }
    if (typeof args.ready === "function") {
      args.ready(this);
    }
  }

  setTitle (title) {
    if (this.isClosed) return;
    let span = this.tabElements.title;
    span.innerHTML = title;
    span.title = title;
    this.title = title;
    this.emit("title-changed", title, this);
    return this;
  }

  getTitle () {
    if (this.isClosed) return;
    return this.title;
  }

  setBadge (badge) {
    if (this.isClosed) return;
    let span = this.tabElements.badge;
    this.badge = badge;

    if (badge) {
      span.innerHTML = badge;
      span.classList.remove('hidden');
    } else {
      span.classList.add('hidden');
    }

    this.emit("badge-changed", badge, this);
  }

  getBadge () {
    if (this.isClosed) return;
    return this.badge;
  }

  setIcon (iconURL, icon) {
    if (this.isClosed) return;
    this.iconURL = iconURL;
    this.icon = icon;
    let span = this.tabElements.icon;
    if (iconURL) {
      span.innerHTML = `<img src="${iconURL}" />`;
      this.emit("icon-changed", iconURL, this);
    } else if (icon) {
      span.innerHTML = `<i class="${icon}"></i>`;
      this.emit("icon-changed", icon, this);
    }

    return this;
  }

  getIcon () {
    if (this.isClosed) return;
    if (this.iconURL) return this.iconURL;
    return this.icon;
  }

  setPosition (newPosition) {
    let tabContainer = this.tabGroup.tabContainer;
    let tabs = tabContainer.children;
    let oldPosition = this.getPosition() - 1;

    if (newPosition < 0) {
      newPosition += tabContainer.childElementCount;

      if (newPosition < 0) {
        newPosition = 0;
      }
    } else {
      if (newPosition > tabContainer.childElementCount) {
        newPosition = tabContainer.childElementCount;
      }

      // Make 1 be leftmost position
      newPosition--;
    }

    if (newPosition > oldPosition) {
      newPosition++;
    }

    tabContainer.insertBefore(tabs[oldPosition], tabs[newPosition]);

    return this;
  }

  getPosition (fromRight) {
    let position = 0;
    let tab = this.tab;
    while ((tab = tab.previousSibling) != null) position++;

    if (fromRight === true) {
      position -= this.tabGroup.tabContainer.childElementCount;
    }

    if (position >= 0) {
      position++;
    }

    return position;
  }

  activate () {
    if (this.isClosed) return;
    let activeTab = this.tabGroup.getActiveTab();
    if (activeTab) {
      activeTab.tab.classList.remove("active");      
      activeTab.emit("inactive", activeTab);
    }
    TabGroupPrivate.setActiveTab.bind(this.tabGroup)(this);
    this.tab.classList.add("active");  
    console.log("click" + this.noteId);
    //TODO 激活时需要处理
    if(this.tabGroup.callback)
      this.tabGroup.callback(this.noteId, 0);

    this.emit("active", this);
    return this;
  }

  show (flag) {
    if (this.isClosed) return;
    if (flag !== false) {
      this.tab.classList.add("visible");
      this.emit("visible", this);
    } else {
      this.tab.classList.remove("visible");
      this.emit("hidden", this);
    }
    return this;
  }

  hide () {
    return this.show(false);
  }

  flash (flag) {
    if (this.isClosed) return;
    if (flag !== false) {
      this.tab.classList.add("flash");
      this.emit("flash", this);
    } else {
      this.tab.classList.remove("flash");
      this.emit("unflash", this);
    }
    return this;
  }

  unflash () {
    return this.flash(false);
  }

  hasClass (classname) {
    return this.tab.classList.contains(classname);
  }

  close (force) {
    const abortController = new AbortController();
    const abort = () => abortController.abort();
    this.emit("closing", this, abort);

    const abortSignal = abortController.signal;
    if (this.isClosed || (!this.closable && !force) || abortSignal.aborted) return;

    this.isClosed = true;
    let tabGroup = this.tabGroup;
    tabGroup.tabContainer.removeChild(this.tab);    
    let activeTab = this.tabGroup.getActiveTab();
    TabGroupPrivate.removeTab.bind(tabGroup)(this, true);

    this.emit("close", this);

    if (activeTab.id === this.id) {
      TabGroupPrivate.activateRecentTab.bind(tabGroup)();
    }
  }
}

const TabPrivate = {
  initTab: function () {
    let tabClass = this.tabGroup.options.tabClass;

    // Create tab element
    let tab = this.tab = document.createElement("div");
    tab.classList.add(tabClass);
    for (let el of ["icon", "title", "buttons", "badge"]) {
      let span = tab.appendChild(document.createElement("span"));
      span.classList.add(`${tabClass}-${el}`);
      this.tabElements[el] = span;
    }

    this.setTitle(this.title);
    this.setBadge(this.badge);
    this.setIcon(this.iconURL, this.icon);
    TabPrivate.initTabButtons.bind(this)();
    TabPrivate.initTabClickHandler.bind(this)();

    this.tabGroup.tabContainer.appendChild(this.tab);
  },

  initTabButtons: function () {
    let container = this.tabElements.buttons;
    let tabClass = this.tabGroup.options.tabClass;
    if (this.closable) {
      let button = container.appendChild(document.createElement("button"));
      button.classList.add(`${tabClass}-button-close`);
      button.innerHTML = this.tabGroup.options.closeButtonText;
      button.addEventListener("click", this.close.bind(this, false), false);
    }
  },

  initTabClickHandler: function () {
    // Mouse up
    const tabClickHandler = function (e) {
      if (this.isClosed) return;
      if (e.which === 2) {
        this.close();
      }
    };
    this.tab.addEventListener("mouseup", tabClickHandler.bind(this), false);
    // Mouse down
    const tabMouseDownHandler = function (e) {
      if (this.isClosed) return;
      if (e.which === 1) {
        if (e.target.matches("button")) return;
        this.activate();
      }
    };
    this.tab.addEventListener("mousedown", tabMouseDownHandler.bind(this), false);
  },
};

module.exports = TabGroup;


var TabSerivce = {
  tabGroup: new TabGroup({
    callback: function(noteId, event) {
      console.log("callback -> noteId:", noteId);
      if(Note.curNoteId != noteId) {
        // jmp to curNote
        Pjax.changeNotebookAndNote(noteId);
      }

    },
    tabContainerSelector: '#tabContent',
    ready: function (tabGroup) {
      dragula([tabGroup.tabContainer], {
        direction: "horizontal",        
      }); 
    },

  }),
  init: function() {
    var me = this;
    window.addEventListener('keyup', function(evt) {
      // 对于功能键，需要判断其他功能键未按
      if(evt.altKey && !evt.shiftKey && !evt.metaKey) {
        // 数字键
        if(evt.keyCode >= 49 && evt.keyCode <= 57 ) {          
          var tabIndex = evt.keyCode - 49 ;
          evt.preventDefault();
          console.log("switch to tab:" + tabIndex);          
          let tab = me.tabGroup.getTabByPosition(tabIndex + 2);
          if(tab) {
            tab.activate();
          }
          
        } else if(evt.keyCode == 37) { // left
          evt.preventDefault();
          let tab = me.tabGroup.getPreviousTab();
          if(tab) {
            tab.activate();
          }
          
        } else if(evt.keyCode == 39) { // right
            evt.preventDefault();
            let tab = me.tabGroup.getNextTab();
            if(tab) {
              tab.activate();
            }
        } else if(evt.keyCode == 90) { // Z
            evt.preventDefault();  
            // close left
            var tab = null;
            while(tab = me.tabGroup.getPreviousTab()) {
                tab.close();
            }
        } else if(evt.keyCode == 88) { // X            
            evt.preventDefault();
          // close current
            let tab = me.tabGroup.getActiveTab();
            if(tab) {
              tab.close();
            }
        } else if(evt.keyCode == 67) { // C
          evt.preventDefault();
           // right
           var tab = null;
            while(tab = me.tabGroup.getNextTab()) {
                tab.close();
            }
        } else if(evt.keyCode == 68) { // D
          evt.preventDefault();
           // all
           var tab = null;
           while(tab = me.tabGroup.getActiveTab()) {
              tab.close();
           }
        } else if(evt.keyCode == 84) {
          evt.preventDefault();
          $('#tabToggle').click();
        }
      }
    });
  },
  addTabOrActive: function(noteId, title, isMd) {
    var me = this;
    var tab = me.tabGroup.getTabBySrc(noteId);
    if(tab) {
      tab.activate();
      return;
    }

    me.tabGroup.addTab({
      title: title,
      src: noteId,
      active:true,
      icon: isMd?'fa fa-code': 'fa fa-book'
    });

  }
}

TabSerivce.init();
