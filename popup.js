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
var PopupController = function () {
  this.joinButton_ = document.getElementById("joinButton");
  this.createButton_ = document.getElementById('newsession');
  this.key_ = document.getElementById('joinsession');

  this.addListeners_();

};

PopupController.prototype = {
  /**
   * A cached reference to the button element.
   *
   * @type {Element}
   * @private
   */
  joinButton_: null,
  createButton_: null,
  pages: [],
  serverPromise: null,
  tabs: {},
  tabId: {},
  lastId_: -2,
  startTime_: null,
  chromePromise: false,
  /**
   * A cached reference to the select element.
   *
   * @type {Element}
   * @private
   */
  key_: null,

  /**
   * Adds event listeners to the button in order to capture a user's click, and
   * perform some action in response.
   *
   * @private
   */
  addListeners_: function () {
    this.createButton_.addEventListener('click', this.handleCreate_.bind(this));
    this.joinButton_.addEventListener('click', this.handleJoin_.bind(this));
  },

  getNextId() {
      this.lastId_--;
      return this.lastId_ + 1;
  },

  basicCallback(tab) {
      console.log(tab);
  },

  windowCallback(newWindow) {
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
    chrome.tabs.onCreated.addListener(this.checkNewTab.bind(this));
    chrome.tabs.onActivated.addListener(this.onTabActivated.bind(this));
    chrome.tabs.onUpdated.addListener(this.tabUpdated.bind(this));
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
        this.pages[this.tabs[this.active.id]].elapsed += diff;
        this.pages[this.tabs[this.active.id]].start = 0;
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
                    var parentUrl = "";
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
            page.start = new Date().getTime();
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
            var l = this.pages.push({start:0,
                        url:tab.url,
                        id: this.getNextId(),
                        parentId:0,
                        serverElapsed: 0,
                        elapsed: 0
            });
            this.tabs[tab.id] = l-1;
        }.bind(this));
    } else if (this.tabs[tabId] >= 0) {
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
                var parentUrl = "";
                var parentId = 0;
                if (latest != null) {

                    if (latest.transition == "link" || latest.transition == "form_submit") {
                        console.log("Here we go!");
                        console.log(this.active);
                        console.log(this.tabs);
                        console.log(this.pages);
                        parentId = this.pages[this.tabs[this.active.id]].id;
                    }
                }
                var l = this.pages.push({start:0,
                            url:tab.url,
                            parentUrl:parentUrl,
                            id: this.getNextId(),
                            serverElapsed: 0,
                            elapsed: 0
                });
                this.tabs[tab.id] = l-1;
            }.bind(this));
        }.bind(this));
    }
    window.setTimeout(function () {
        this.afterDelay({tabId:tabId, windowId:this.windowId});
    }.bind(this), 3000)

  },

  /**
   * Handle a success/failure callback from the `browsingData` API methods,
   * updating the UI appropriately.
   *
   * @private
   */
  handleCallback_: function () {
    var success = document.createElement('div');
    success.classList.add('overlay');
    success.setAttribute('role', 'alert');
    success.textContent = 'Data has been cleared.';
    document.body.appendChild(success);

    setTimeout(function() { success.classList.add('visible'); }, 10);
    setTimeout(function() {
      if (close === false)
        success.classList.remove('visible');
      else
        window.close();
    }, 4000);
  },

  /**
   * When a user clicks the button, this method is called: it reads the current
   * state of `timeframe_` in order to pull a timeframe, then calls the clearing
   * method with appropriate arguments.
   *
   * @private
   */
  handleCreate_: function () {
    var now = new Date().getTime();
    this.createButton_.innerText = 'Creating Session...';
    this.createButton_.setAttribute('disabled', 'disabled');

    //API stuff goes here

    chrome.windows.create({focused: true}, this.windowCallback.bind(this));
  },

  handleJoin_: function () {
    var now = new Date().getTime();
    this.joinButton_.innerText = 'Creating Session...';
    this.joinButton_.setAttribute('disabled', 'disabled');
  }
};

document.addEventListener('DOMContentLoaded', function () {
  window.PC = new PopupController();
});
