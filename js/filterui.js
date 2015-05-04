FilterUI = function  (_parentElement, _filters, _eventHandler) {

    var that = this;
    this.eventHandler = _eventHandler;
    this.filters = _filters;
    this.parentElement = _parentElement;

    this.addEventHandlers();
    this.initUI();
};

FilterUI.prototype.addEventHandlers = function() {
    var that = this;
    document.getElementById("state_open").addEventListener("click", function(d) {
        that.filters.state = "open";
        $(that.eventHandler).trigger("filterChanged", that.filters);
    });
    document.getElementById("state_all").addEventListener("click", function(d) {
        that.filters.state = "all";
        $(that.eventHandler).trigger("filterChanged", that.filters);
    });

    document.getElementById("cat_all").addEventListener("click", function(d) {
        that.filters.category = ["test", "spec"];
        $(that.eventHandler).trigger("filterChanged", that.filters);
    });
    document.getElementById("cat_spec").addEventListener("click", function(d) {
        that.filters.category = ["spec"];
        $(that.eventHandler).trigger("filterChanged", that.filters);
    });
    document.getElementById("cat_test").addEventListener("click", function(d) {
        that.filters.category = ["test"];
        $(that.eventHandler).trigger("filterChanged", that.filters);
    });

    document.getElementById("sort_code").addEventListener("click", function(d) {
        that.filters.who_sort = "code";
        $(that.eventHandler).trigger("filterChanged", that.filters);
    });
    document.getElementById("sort_issue").addEventListener("click", function(d) {
        that.filters.who_sort = "issues";
        $(that.eventHandler).trigger("filterChanged", that.filters);
    });

    document.getElementById("caniuse_true").addEventListener("click", function(d) {
        that.filters.caniuse = "true";
        $(that.eventHandler).trigger("filterChanged", that.filters);
    });
    document.getElementById("caniuse_false").addEventListener("click", function(d) {
        that.filters.caniuse = "false";
        $(that.eventHandler).trigger("filterChanged", that.filters);
    });
};

FilterUI.prototype.initUI = function() {
    this.dateFormatter = d3.time.format("%Y-%m-%d");

    this.timelineLabelStart = this.parentElement.select("#timeframeLabelStart");
    this.timelineLabelEnd = this.parentElement.select("#timeframeLabelEnd");
    this.whoLabel = this.parentElement.select("#whoLabel");
    this.specLabel = this.parentElement.select("#specLabel");
    this.wgLabel = this.parentElement.select("#wgLabel");

    this.timelineLabelStart.text(this.dateFormatter(new Date(this.filters.start_date)));
    this.timelineLabelEnd.text(this.dateFormatter(new Date(this.filters.end_date)));
    this.whoLabel.text(this.getAuthorText(this.filters.who));
};

FilterUI.prototype.onAuthorChange = function(author) {
    this.whoLabel.text(this.getAuthorText(this.filters.who));
};

FilterUI.prototype.getAuthorText = function(author) {
    if(!author) {
        return "All"
    } else {
        return author;
    }
};

FilterUI.prototype.onTimelineChange = function(startDate, endDate) {
    this.timelineLabelStart.text(this.dateFormatter(startDate));
    this.timelineLabelEnd.text(this.dateFormatter(endDate));
};

FilterUI.prototype.onSelectionChange = function(sunburstSelection) {
    console.log(sunburstSelection);
    this.wgLabel.text(this.getWgText(sunburstSelection));
    this.specLabel.text(this.getSpecText(sunburstSelection));
};

FilterUI.prototype.getWgText = function(sunburstSelection) {
    switch(sunburstSelection.depth) {
        case 0:
        return "All";
        case 1:
            return sunburstSelection.name;
        case 2:
            return sunburstSelection.parent.name;
        case 3:
            return sunburstSelection.parent.parent.name;
        case 4:
            return sunburstSelection.parent.parent.parent.name;
    }
};

FilterUI.prototype.getSpecText = function(sunburstSelection) {
    switch(sunburstSelection.depth) {
        case 0: case 1:
            return "All";
        case 2:
            return sunburstSelection.name;
        case 3:
            return sunburstSelection.parent.name;
        case 4:
            return sunburstSelection.parent.parent.name;
    }
};
