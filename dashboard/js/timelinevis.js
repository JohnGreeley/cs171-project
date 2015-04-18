TimelineVis = function(_parentElement, _data, _eventHandler, _options) {
    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = [];
    this.vizData = [];
    this.eventHandler = _eventHandler;
    this.options = _options || {width:1200, height:300};

    // defines constants
    this.margin = {top: 20, right: 20, bottom: 20, left: 50};
    this.width = this.options.width - this.margin.left - this.margin.right;
    this.height = this.options.height - this.margin.top - this.margin.bottom;

    this.dateFormatter = d3.time.format("%Y-%m-%d");

    this.reorderData(); // creates .displayData by date but complete
    this.initVis();
};

TimelineVis.prototype.initVis = function() {

    var that = this;
    var space = this.height/8; // REMOVE HARD-# IF FINAL LAYOUT

    // constructs SVG layout
    this.svg = this.parentElement.append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("class", "timeline")
        .attr("transform", "translate(" + this.margin.left
              + "," + this.margin.top + ")");

    // creates scales
    this.x0 = d3.time.scale.utc()
                    .range([0, this.width]);

//  PROBABLY DEFUNCT DUE TO SO MUCH DATA
    this.x1 = d3.scale.ordinal()
                      .domain(["ISS_O", "ISS_C",
                               "PR_O", "PR_C",
                              "COM", "PUB"])
                      .range([0, 0, 1, 1, 0, 0]);

    this.y_axisType = d3.scale.ordinal()
                      .domain([
                               "spec code",
                               "spec count",
                               "test code",
                               "test count"
                              ])
                      .range([
                              space,
                              3*space,
                              5*space,
                              7*space
                              ]);

// how high should the bar be?  We actually calc. the bar here.
    this.height_lines = d3.scale.pow()
        .exponent(.2)
        .range([0, space]);
    this.height_count = d3.scale.pow()
        .exponent(.5)
        .range([0, space]);

    // create x axis  - saving y-axis for later if ever
    this.xAxis = d3.svg.axis()
        .scale(this.x)
        .orient("bottom");

    // prepare for display bars
    this.svg.append("g")
            .attr("class", "bars");

    // Add axes visual elements
    this.svg.append("g")
        .attr("class", "x axis")  // put it in the middle
        .attr("transform", "translate(0," + this.height + ")");

    // brushing
    this.brush = d3.svg.brush()
        .on("brush", function(){
            $(that.eventHandler).trigger("brushChanged",
            that.brush.extent());
        });
    this.svg.append("g")
        .attr("class", "brush");


    // filter, aggregate, modify data
    this.wrangleData(null); // will create filtered VizData
    // call the update method
    this.updateVis();
};

TimelineVis.prototype.updateVis = function() {
    var that = this;

console.log("In updateVis #3");

    // update scales
    this.x0.domain(d3.extent(this.vizData.dates, function(d)
                    { return Date.parse(d.date); } ));

    this.height_lines.domain([0, this.vizData.max_linesCode]);
    this.height_count.domain([0, this.vizData.max_numIssues]);

    // update graph:
    var dates = this.svg.select(".bars")
                        .selectAll(".date")
                        .data(this.vizData.dates, function(d)
                          { return d.date; });

    // create necessary containers for new dates
    dates.enter()
          .append("g")
          .attr("class", "date")
          .attr("transform", function(d)
                {
                  return "translate("
                          + that.x0(Date.parse(d.date))
                          + ",0)";
                });

    // create new bars within each date
    var bars = dates.selectAll("rect")
          .data(function(d) { return d.actions; })
          .enter()
          .append("rect")
          .attr("class", function(d)
                  {
                    var res = "timebar " + d.type;
                    if(d.type == "PUB" && d.details.length
                         == d.details.filter(function(dd)
                            { return dd.status == "REC"; }
                            ).length )
                    {
                            res = res + " REC";
                    }
                    return res;
                  }
                );

    // for all bars, new and changing
    bars.attr("width", 1)
        .attr("height", function(d)
                  {
                    if(d.type == "PUB")
                    {
                      d.height = that.height;
                    }
                    else if(d.scale == "code")
                    {
                      d.height = that.height_lines(d.total);
                    }
                    else
                    {
                      d.height =  that.height_count(d.total);
                    }
// console.log("for " + d.type + " total " + + d.total
//               + ", height = " + d.height);
                    return d.height;
                  })
        .attr("x", function(d) {
                                  // return 0; // for stacked charts
                                  // for grouped bar
                                  return that.x1(d.type);
                                })
        .attr("y", function(d)
                  {
                    if(d.type == "PUB")
                    {
                      d.y = 0;
                    }
                    else
                    {
                      if(d.dir == "up")
                      {
                        d.y = that.y_axisType(d.cat + " " + d.scale)
                              - d.height;
                      }
                      else  // opened issues or PRs
                      {
                        d.y = that.y_axisType(d.cat + " " + d.scale);
                      }
                    }
// console.log("for " + d.type + " total " + + d.total
//               + ", y = " + y);
                    return d.y;
                  });

    // remove any not-needed-bars


    // update axis
    // this.svg.select(".x.axis")
    //     .call(this.xAxis);

    //update brush
    // this.brush.x(this.x);
    // this.svg.select(".brush")
    //     .call(this.brush)
    //     .selectAll("rect")
    //     .attr("height", this.height);
console.log("Finished updateVis");
};



TimelineVis.prototype.onSelectionChange = function(specs) {

};

TimelineVis.prototype.reorderData = function() {

  var that = this;
  var category = "spec";  // TEMPORARY until revise for tests too

  // helper functions

  var stripTime = function(dateTime) {
      return dateFormatter(new Date(dateTime))
  };

  function findDate(day)
  {
    var found = false;
    for(var i = 0; i < that.displayData.length; i++)
    {
      if(that.displayData[i].date == day)
      {
        return i;
      }
    }

    // if we're here, we need to create a new element
    that.displayData.push(
      { "date"          : day,
        "actions"       : [ { "cat"   : category,
                              "type"  : "PUB",
                              "total" : 0,
                              "details" : [] },
                            { "cat"   : category,
                              "type"  : "COM",
                              "scale" : "code",
                              "dir"   : "up",
                              "total" : 0,
                              "details" : [] },
                            { "cat"  : category,
                              "type" : "PR_O",
                              "scale": "code",
                              "dir"   : "down",
                              "total" : 0,
                              "details" : [] },
                            { "cat"  : category,
                              "type" : "PR_C",
                              "scale": "code",
                              "dir"   : "up",
                              "total" : 0,
                              "details" : [] },
                            { "cat"  : category,
                              "type" : "ISS_O",
                              "scale": "count",
                              "dir"   : "down",
                              "total" : 0,
                              "details" : [] },
                            { "cat"  : category,
                              "type" : "ISS_C",
                              "scale": "count",
                              "dir"   : "up",
                              "total" : 0,
                              "details" : [] } ]

      });

    return (that.displayData.length - 1);
  }


  // MAIN DATA WRANGLING FUNCTION

  // for each "thing" in the data
  // check the array for an element with that date
  // create the element if necessary,
  //  initializing it with blanks for each data type
  // based on type,
  //  add/subtract the number of lines to display_lines
  //  add details to the details_array

  this.displayData = [];
  this.data.forEach(function(d)
  {
    var today;
    var index;
    if(d.last_pub)
    {
      index = findDate(d.last_pub);
      today = that.displayData[index];
      today.actions[0].total++;
      today.actions[0].details.push(d);
    }

    if(d.commits)
    {
      d.commits.forEach(function(c)
      {
          index = findDate(c.date);
          today = that.displayData[index];
          today.actions[1].total += (c.line_added + c.line_deleted);
          today.actions[1].details.push(c);
      });
    }

    if(d.issues)  // HERE WE ARE NOT YET USING # LINES OF CODE
    {
      d.issues.forEach(function(c)
      {
        // is it a PR or an issue
        if(c.type === "pull")
        {
          // when was it created
          index = findDate(c.created_at);
          today = that.displayData[index];
          today.actions[2].total += (c.line_added + c.line_deleted);
          today.actions[2].details.push(c);
          // when was it possibly closed
          if(c.closed_at)
          {
            index = findDate(c.closed_at);
            today = that.displayData[index];
            today.actions[3].total += (c.line_added + c.line_deleted);
            today.actions[3].details.push(c);
          }
        }
        else if(c.type === "issue")
        {
// if(c.difficulty)
// {
// console.log("found difficulty");
// console.log(today);
// }

          // when was it created
          index = findDate(c.created_at);
          today = that.displayData[index];

// REVISE THIS FOR DIFFICULTY WHEN ADD TESTS
          today.actions[4].total++;
          today.actions[4].details.push(c);
          // when was it possibly closed
          if(c.closed_at)
          {
            index = findDate(c.closed_at);
            today = that.displayData[index];


// REVISE THIS FOR DIFFICULTY WHEN ADD TESTS
            today.actions[5].total++;
            today.actions[5].details.push(c);
          }
        }
      });
    } // end of d.issues work
  });

// remove later for performance sake
this.displayData.sort(function(a,b)
        {return Date.parse(a.date) - Date.parse(b.date); });
// console.log("displayData");
// console.log(displayData);
}

TimelineVis.prototype.onSelectionChange = function(specs) {

};

TimelineVis.prototype.wrangleData = function(filters)
{
  // this is where we will apply filters and recalculate totals
  // and remove all bits that don't have any data in them anyway
  //
  var that = this;
  that.vizData = { max_linesCode : 0,
                  // max_codedate : "",
                  // max_issdate : "",
                   max_numIssues : 0,
                   dates         : []
                 };

  // TEMPORARY, UNTIL WE COORDINATE
  filters = { "start_date"  : "2000-01-01",
              "end_date"    : "2015-05-05",
              "categories"  : ["spec", "test"],
              "actions"     : ["ISS_O", "ISS_C",
                               "PR_O", "PR_C",
                               "COM", "PUB"],
              "who"         : []
            }

  this.displayData.forEach(function(d)
  {
    var day = {};

    // if we're in the timeframe
    if( ((!filters.start_date) || (d.date >= filters.start_date))
        &&
        ((!filters.end_date) || (d.date <= filters.end_date)) )
    {
      day = { "date"    : d.date,
              "actions" : []
            };

      // evaluate data for this date
      d.actions.forEach(function(dd)
      {
        if (dd.total > 0)  // we have some data we might want to see
        {
          if(    filters.categories.indexOf(dd.cat) !== -1
              && filters.actions.indexOf(dd.type) !== -1)
// ADD WHO LATER
          {
// if added who, need to recalculate TOTAL
            day.actions.push(dd);
            // check if either maximum needs to be updated
            if(dd.scale == "code")
            {
              if (dd.total > that.vizData.max_linesCode)
              {
                that.vizData.max_linesCode = dd.total;
                // that.vizData.max_codedate = d.date;
              }
            }
            else
            {
              if (dd.total > that.vizData.max_numIssues)
              {
                that.vizData.max_numIssues = dd.total;
                // that.vizData.max_issdate = d.date;
              }
            }
          }
        }
      });
    }

    // we found data meeting the criteria
    if(day.actions && day.actions.length > 0)
    {
      that.vizData.dates.push(day);
    }
  });
console.log("vizData: ");
console.log(this.vizData);
}

