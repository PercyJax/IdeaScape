
var PopupController = function () {
    this.joinButton_ = document.getElementById("joinButton");
    this.createButton_ = document.getElementById('newsession');
    this.key_ = document.getElementById('joinsession');
    this.errorField_ = document.getElementById('errorField');

    this.currentSession_ = document.getElementById('currentSession');
    this.sessionUrl_ = document.getElementById('sessionUrl');
    this.sessionEnd_ = document.getElementById('sessionEnd');

    this.offDiv_ = $('#sessionOff');
    this.onDiv_ = $('#sessionOn');
    this.wrapperDiv_ = $('#wrapper');

    this.BC = chrome.extension.getBackgroundPage().BC;
    this.BC.PC = this;

    this.addListeners_();
    if (this.BC.session != null) {
        this.setOnDiv(this.BC.session);
    }
}

PopupController.prototype = {
    addListeners_: function () { //not neede in backend.
      this.createButton_.addEventListener('click', this.handleCreate_.bind(this));
      this.joinButton_.addEventListener('click', this.handleJoin_.bind(this));
      this.sessionEnd_.addEventListener('click', this.BC.endSession.bind(this.BC));

      this.onDiv_.detach();
    },
    handleCreate_() {
        this.createButton_.innerText = 'Creating Session...';
        this.createButton_.setAttribute('disabled', 'disabled');
        this.BC.handleCreate_();
    },
    handleJoin_() {
        this.joinButton_.innerText = 'Creating Session...';
        this.joinButton_.setAttribute('disabled', 'disabled');
        var session = this.key_.value;
        if (session == "") {
            this.errorField_.innerText = "Session ID required.";
            setTimeout(function () {
                this.joinButton_.innerText = 'Join!';
                this.joinButton_.disabled = false;
            }.bind(this), 100);



            return;
        }
        this.BC.handleJoin_(session);
    },
    endSession() {
      this.onDiv_.detach();
      this.wrapperDiv_.append(this.offDiv_);
      this.createButton_.innerText = 'Create!';
      this.createButton_.disabled = false;
      this.joinButton_.innerText = 'Join!';
      this.joinButton_.disabled = false;
    },
    setOnDiv(session) {
        this.offDiv_.detach();
        this.wrapperDiv_.append(this.onDiv_);
        this.currentSession_.innerText = session;
        this.sessionUrl_.innerText = "ideascape.ml/?session=" + session;
        this.sessionUrl_.href = "http://www.ideascape.ml/?session=" + session;

    },
    setErrorField(text) {
        this.errorField_.innerText = text;
        setTimeout(function () {
            this.createButton_.innerText = 'Create!';
            this.createButton_.disabled = false;
            this.joinButton_.innerText = 'Join!';
            this.joinButton_.disabled = false;
        }.bind(this), 100);
    }
}




document.addEventListener('DOMContentLoaded', function () {
    //add listeners, report to backend.
    window.PC = new PopupController();
});
