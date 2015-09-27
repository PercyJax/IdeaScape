// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This class wraps the popup's form, and performs the proper clearing of data
 * based on the user's selections. It depends on the form containing a single
 * select element with an id of 'timeframe', and a single button with an id of
 * 'button'. When you write actual code you should probably be a little more
 * accepting of variance, but this is just a sample app. :)
 *
 * Most of this is boilerplate binding the controller to the UI. The bits that
 * specifically will be useful when using the BrowsingData API are contained in
 * `parseMilliseconds_`, `handleCallback_`, and `handleClick_`.
 *
 * @constructor
 */
var BackgroundController = function () {
  // this.joinButton_ = document.getElementById("joinButton");
  // this.createButton_ = document.getElementById('newsession');
  // this.key_ = document.getElementById('joinsession');
  // this.errorField_ = document.getElementById('errorField');
  //
  // this.currentSession_ = document.getElementById('currentSession');
  // this.sessionUrl_ = document.getElementById('sessionUrl');
  // this.sessionEnd_ = document.getElementById('sessionEnd');
  //
  // this.offDiv_ = $('#sessionOff');
  // this.onDiv_ = $('#sessionOn');
  // this.wrapperDiv_ = $('#wrapper');

  // this.addListeners_();

};

BackgroundController.prototype = {
  /**
   * A cached reference to the button element.
   *
   * @type {Element}
   * @private
   */

  // joinButton_: null,
  // createButton_: null,
  pages: [],
  serverPromise: false,
  tabs: {},
  tabId: {},
  lastId_: -2,
  startTime_: null,
  chromePromise: false,
  nodesToPush: [],
  viewTimesToPush: [],
  session: null,
  token: null,
  PC: null,
  /**
   * A cached reference to the select element.
   *
   * @type {Element}
   * @private
   */
  //key_: null,

  /**
   * Adds event listeners to the button in order to capture a user's click, and
   * perform some action in response.
   *
   * @private
   */
  // addListeners_: function () { //not neede in backend.
  //   this.createButton_.addEventListener('click', this.handleCreate_.bind(this));
  //   this.joinButton_.addEventListener('click', this.handleJoin_.bind(this));
  //   this.sessionEnd_.addEventListener('click', this.endSession.bind(this));
  //
  //   this.onDiv_.detach();
  // },

  endSession() {
      chrome.tabs.onCreated.removeListener(this.boundCheckNewTab);
      chrome.tabs.onActivated.removeListener(this.boundOnTabActivated);
      chrome.tabs.onUpdated.removeListener(this.boundTabUpdated);
      //need to completely clean all instance variables:
      pages: [],
      serverPromise: false,
      tabs: {},
      tabId: {},
      lastId_: -2,
      startTime_: null,
      chromePromise: false,
      nodesToPush: [],
      viewTimesToPush: [],
      session: null,
      token: null,



      this.PC.endSession();
  },

  getNextId() {
      this.lastId_--;
      return this.lastId_ + 1;
  },

  basicCallback(tab) {
      console.log(tab);
  },

  windowCallback(newWindow) {
    //first redo popup menu
    if (this.PC != undefined && this.PC != null && this.PC.setOnDiv != undefined) {
        this.PC.setOnDiv(self.session);
    }

    this.startTime_ = new Date().getTime();
    this.windowId = newWindow.id;
    chrome.tabs.query({windowId: newWindow.id}, function (results) {
        for (var i = 0; i < results.length; i++) {
            var tab = results[i];
            var index = -1;
            // if (tab.url.slice(0,5) != "chrome") { //there shouldn't be initialized tabs besides ours
            //
            // }
            this.tabs[tab.id] = index;
            this.tabId[tab.id] = tab;
            //manually call callbacks for first tab.
            this.checkNewTab(tab);
            this.onTabActivated({windowId:this.windowId, tabId:tab.id});
        }
    }.bind(this));
    this.boundCheckNewTab = this.checkNewTab.bind(this);
    chrome.tabs.onCreated.addListener(this.boundCheckNewTab);
    this.boundOnTabActivated = this.onTabActivated.bind(this);
    chrome.tabs.onActivated.addListener(this.boundOnTabActivated);
    this.boundTabUpdated = this.tabUpdated.bind(this);
    chrome.tabs.onUpdated.addListener(this.boundTabUpdated);
    setTimeout(this.asyncPolling.bind(this), 1000);
  },

  checkNewTab(tab) {
    if (this.chromePromise == true) {
        return setTimeout(function () {
            this.checkNewTab(tab);
        }.bind(this), 100);
    } else {
        this.chromePromise = true;
    }
    if (tab.windowId == this.windowId) {
        this.tabs[tab.id] = -1; //TODO: push url to pages.
        this.tabId[tab.id] = tab;

    }
    this.chromePromise = false;
  },

  onWindowFocus() { // need to implement

  },

  onTabActivated(activeInfo) {
    if (activeInfo.windowId != this.windowId) {
        return;
    }

    if (this.chromePromise == true) {
        return setTimeout(function () {
            this.onTabActivated(activeInfo);
        }.bind(this), 100);
    } else {
        this.chromePromise = true;
    }
    if (this.active != undefined && this.tabs[this.active.id] >= 0 && this.pages[this.tabs[this.active.id]].start != 0) {
        var diff = new Date().getTime() - this.pages[this.tabs[this.active.id]].start;
        var page = this.pages[this.tabs[this.active.id]]
        page.elapsed += diff;
        page.start = 0;
        this.viewTimesToPush.push({elapsedTime:page.elapsed, id:page.id, session: this.session, token: this.token});
    }
    this.oldActive = this.active;
    for (var key in this.tabs) {
        if (this.tabs.hasOwnProperty(key)) {
            if (key == activeInfo.tabId) {
                this.active = this.tabId[key];
                break;
            }
        }
    }
    if (this.tabs[activeInfo.tabId] == -1) {
        chrome.tabs.get(activeInfo.tabId, function (tab) {
            if (tab.url && tab.url.slice(0,6) != "chrome" && tab.url.slice(0,23) != "http://www.ideascape.ml") {
                chrome.history.getVisits({url:tab.url}, function(results) {
                    var latest = null;
                    for (var i = 0; i < results.length; i++) {
                        if ((latest == null && results[i].visitTime != undefined) || (results[i].visitTime != undefined && results[i].visitTime > latest.visitTime)) {
                            if (results[i].visitTime > this.startTime_) {
                                latest = results[i];
                            }
                        }
                    }
                    var parentId = 0;
                    if (latest != null) {

                        if (latest.transition == "link" || latest.transition == "form_submit") {
                            if (this.oldActive != undefined) {
                                parentId = this.pages[this.tabs[this.oldActive.id]].id;
                            }
                        }
                    }
                    var l = this.pages.push({start:0,
                                url:tab.url,
                                id: this.getNextId(),
                                parentId:parentId,
                                serverElapsed: 0,
                                elapsed: 0
                    });
                    this.nodesToPush.push(this.pages[l-1]);
                    this.tabs[tab.id] = l-1;
                }.bind(this));

            } else {
                this.tabs[activeInfo.tabId] = -2;
            }
        }.bind(this));
    }

    window.setTimeout(function () {
        this.afterDelay(activeInfo);
    }.bind(this), 3000);
  },

  afterDelay(activeInfo) {
    chrome.tabs.query({active:true, currentWindow:true, windowId:this.windowId}, function (tabs) {
        this.onTabConfirmedActive(tabs, activeInfo);
    }.bind(this));
  },

  onTabConfirmedActive(tabs, activeInfo) {
    this.chromePromise = false;
    if (tabs.length == 0) {
        return;
    }
    tab = tabs[0];
    if (tab.id == activeInfo.tabId) {
        var index = this.tabs[tab.id];
        if (index >= 0) {
            var page = this.pages[index];
            if (page.start == 0) {
                page.start = new Date().getTime();
            }
        }
    }

    //do we need to handle the exception? I don't think so. Handle it in onUpdate()
  },

  tabUpdated(tabId, changeDict, tab) {
    if (tab.windowId != this.windowId || changeDict.url == undefined || changeDict.url.slice(0,6) == "chrome") {
        return;
    }

    if (this.chromePromise == true) {
        return setTimeout(function () {
            this.tabUpdated(tabId, changeDict, tab);
        }.bind(this), 100);
    } else {
        this.chromePromise = true;
    }

    if (this.tabs[tabId] == -2) {
        chrome.tabs.get(tabId, function (tab) {
            var l = this.pages.push({start:new Date().getTime(),
                        url:tab.url,
                        id: this.getNextId(),
                        parentId:0,
                        serverElapsed: 0,
                        elapsed: 0
            });
            this.nodesToPush.push(this.pages[l-1]);
            this.tabs[tab.id] = l-1;
        }.bind(this));
    } else if (this.tabs[tabId] >= 0) {
        if (this.active != undefined && this.tabs[this.active.id] >= 0 && this.pages[this.tabs[this.active.id]].start != 0) {
            var diff = new Date().getTime() - this.pages[this.tabs[this.active.id]].start;
            var page = this.pages[this.tabs[this.active.id]]
            page.elapsed += diff;
            page.start = 0;
            this.viewTimesToPush.push({elapsedTime:page.elapsed, id:page.id, session: this.session, token: this.token});
        }
        chrome.tabs.get(tabId, function (tab) {
            chrome.history.getVisits({url:tab.url}, function(results) {
                var latest = null;
                for (var i = 0; i < results.length; i++) {
                    if ((latest == null && results[i].visitTime != undefined) || (results[i].visitTime != undefined && results[i].visitTime > latest.visitTime)) {
                        if (results[i].visitTime > this.startTime_) {
                            latest = results[i];
                        }
                    }
                }
                var parentId = 0;
                if (latest != null) {

                    if (latest.transition == "link" || latest.transition == "form_submit") {
                        parentId = this.pages[this.tabs[this.active.id]].id;
                    }
                }
                var l = this.pages.push({start:new Date().getTime(),
                            url:tab.url,
                            id: this.getNextId(),
                            parentId: parentId,
                            serverElapsed: 0,
                            elapsed: 0
                });
                this.nodesToPush.push(this.pages[l-1]);
                this.tabs[tab.id] = l-1;
            }.bind(this));
        }.bind(this));
    }
    window.setTimeout(function () {
        this.afterDelay({tabId:tabId, windowId:this.windowId});
    }.bind(this), 3000);

  },


  handleCreate_: function () {


    //API stuff goes here
    $.ajax({
        url: "http://ideascape.ml/sessionmanager.php",
        type: "POST",
        data: JSON.stringify({mode:"create"}),
        dataType: "json",
        success: this.onSessionSuccess.bind(this),
        error: this.onSessionFail.bind(this)
    });
  },

  handleJoin_: function (session) {

    $.ajax({
        url: "http://ideascape.ml/sessionmanager.php",
        type: "POST",
        data: JSON.stringify({mode:"join",session:session}),
        dataType: "json",
        success: this.onSessionSuccess.bind(this),
        error: this.onSessionFail.bind(this)
    });
  },
  onSessionSuccess(result) {
    this.session = result.session;
    this.token = result.token;
    chrome.windows.create({focused: true}, this.windowCallback.bind(this));
  },
  onSessionFail(xhr, ajaxOptions, thrownError) {
    console.log("SESSION POST FAILED!");
    console.log(xhr);
    console.log(thrownError);
    //TODO:
    if (this.PC != undefined && this.PC.setErrorField != undefined) {
        if (xhr.responseText == "Session does not exist.") {
            this.PC.setErrorField("Session ID does not exist.");
        } else {
            this.PC.setErrorField("An error has occured. Please try again.");
        }
    }

  },

//interface starts here

  asyncPolling() {
    console.log("polling");
    if (this.serverPromise != true) {
        this.serverPromise = true;
        var query = this.nodesToPush.shift();
        var viewTimes = [];
        for (var i = this.viewTimesToPush.length - 1; i >= 0; i--) {
            if (typeof this.viewTimesToPush[i].id != 'number') {
                viewTimes.push(this.viewTimesToPush.splice(i,1)[0]);
            }
        }
        if (!(query === undefined && viewTimes.length == 0)) {
            if (query === undefined) {
                query = {};
            } else {
                query = {url:query.url, pid:query.parentId, req:query.id, session:this.session, token:this.token};
            }
            var finalQuery = {query:query, viewTime:viewTimes};
            var that = this;
            $.ajax({
                url: "http://ideascape.ml/update.php",
                type: "POST",
                data: JSON.stringify(finalQuery),
                dataType: "json",
                success: function (result) {
                    return this.onSuccess(result, finalQuery);
                }.bind(that),
                error: function (xhr, ajaxOptions, thrownError) {
                    return this.onFail(xhr, ajaxOptions, thrownError, finalQuery);
                }.bind(that)
            });
        } else {
            this.serverPromise = false;
            setTimeout(this.asyncPolling.bind(this), 1000);
        }

    } else {
        setTimeout(this.asyncPolling.bind(this), 1000);
    }

  },
  onSuccess(result, finalQuery) {
    console.log("success!");
    console.log(result);
    console.log(finalQuery);
    if (result != null && result.query != undefined && result.query.token == this.token) {
        var id = result.query.id;
        var pid = result.query.pid;
        for (var i = 0; i < this.pages.length; i++) {
            if (this.pages[i].id == result.query.req) {
                this.pages[i].id = id;
                this.pages[i].pid = pid;
            }
            if (this.pages[i].pid == result.query.req) {
                this.pages[i].pid = id;
            }
        }
        for (var j = 0; j < this.nodesToPush.length; j++) {
            if (this.nodesToPush[j].id == result.query.req) {
                this.nodesToPush[j].id = id;
                this.nodesToPush[j].pid = pid;
            }
            if (this.nodesToPush[j].pid == result.query.req) {
                this.nodesToPush[j].pid = id;
            }
        }
        for (var k = 0; k < this.viewTimesToPush.length; k++) {
            if (this.viewTimes[k].id == result.query.req) {
                this.viewTimes[k].id = id;
            }
        }
    } else {
        if (result.query != {} || finalQuery.query != {}) {
            console.log("error, should have return query");
            console.log(result);
        }
    }
    this.serverPromise = false;
    setTimeout(this.asyncPolling.bind(this), 1000);
  },
  onFail(xhr, ajaxOptions, thrownError, finalQuery) {
    console.log("POST FAILED!");
    console.log(xhr);
    console.log(thrownError);
    //TODO: need to re-add back into lists!
    this.serverPromise = false;
    setTimeout(this.asyncPolling.bind(this), 1000);
  }


};

BC = new BackgroundController();
