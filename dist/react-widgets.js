(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.reactWidgets = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){

var invariant = require("react/lib/invariant");

if ("production" !== process.env.NODE_ENV) {
  [Array.prototype.some, Array.prototype.filter, Array.prototype.reduce].forEach(function (method) {
    if (!method) throw new Error("One or more ES5 features is not available to ReactWidgets: http://jquense.github.io/react-widgets/docs/#/getting-started/browser");
  });
}

module.exports = {

  DropdownList: require("./DropdownList"),
  Combobox: require("./Combobox"),

  Calendar: require("./Calendar"),
  DateTimePicker: require("./DateTimePicker"),

  NumberPicker: require("./NumberPicker"),

  Multiselect: require("./Multiselect"),
  SelectList: require("./SelectList"),

  configure: require("./configure"),

  utils: {
    ReplaceTransitionGroup: require("./ReplaceTransitionGroup"),
    SlideTransition: require("./SlideTransition") }
};

}).call(this,require('_process'))
},{"./Calendar":2,"./Combobox":4,"./DateTimePicker":7,"./DropdownList":9,"./Multiselect":15,"./NumberPicker":19,"./ReplaceTransitionGroup":21,"./SelectList":22,"./SlideTransition":23,"./configure":27,"_process":58,"react/lib/invariant":70}],2:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    cx = require("classnames"),
    compat = require("./util/compat"),
    Header = require("./Header"),
    Footer = require("./Footer"),
    Month = require("./Month"),
    Year = require("./Year"),
    Decade = require("./Decade"),
    Century = require("./Century"),
    CustomPropTypes = require("./util/propTypes"),
    createUncontrolledWidget = require("uncontrollable"),
    SlideTransition = require("./SlideTransition"),
    dates = require("./util/dates"),
    constants = require("./util/constants"),
    _ = require("./util/_"); //values, omit

var dir = constants.directions,
    values = function (obj) {
  return Object.keys(obj).map(function (k) {
    return obj[k];
  });
},
    invert = function (obj) {
  return _.transform(obj, function (o, val, key) {
    o[val] = key;
  }, {});
};

var views = constants.calendarViews,
    VIEW_OPTIONS = values(views),
    ALT_VIEW = invert(constants.calendarViewHierarchy),
    NEXT_VIEW = constants.calendarViewHierarchy,
    VIEW_UNIT = constants.calendarViewUnits,
    VIEW = (function () {
  var _VIEW = {};
  _VIEW[views.MONTH] = Month;
  _VIEW[views.YEAR] = Year;
  _VIEW[views.DECADE] = Decade;
  _VIEW[views.CENTURY] = Century;
  return _VIEW;
})();

var ARROWS_TO_DIRECTION = {
  ArrowDown: dir.DOWN,
  ArrowUp: dir.UP,
  ArrowRight: dir.RIGHT,
  ArrowLeft: dir.LEFT
};

var OPPOSITE_DIRECTION = (function () {
  var _OPPOSITE_DIRECTION = {};
  _OPPOSITE_DIRECTION[dir.LEFT] = dir.RIGHT;
  _OPPOSITE_DIRECTION[dir.RIGHT] = dir.LEFT;
  return _OPPOSITE_DIRECTION;
})();

var MULTIPLIER = (function () {
  var _MULTIPLIER = {};
  _MULTIPLIER[views.YEAR] = 1;
  _MULTIPLIER[views.DECADE] = 10;
  _MULTIPLIER[views.CENTURY] = 100;
  return _MULTIPLIER;
})();

var VIEW_FORMATS = (function () {
  var _VIEW_FORMATS = {};
  _VIEW_FORMATS[views.MONTH] = "dateFormat";
  _VIEW_FORMATS[views.YEAR] = "monthFormat";
  _VIEW_FORMATS[views.DECADE] = "yearFormat";
  _VIEW_FORMATS[views.CENTURY] = "decadeFormat";
  return _VIEW_FORMATS;
})();

var propTypes = {

  onChange: React.PropTypes.func,
  value: React.PropTypes.instanceOf(Date),

  min: React.PropTypes.instanceOf(Date),
  max: React.PropTypes.instanceOf(Date),

  initialView: React.PropTypes.oneOf(VIEW_OPTIONS),

  finalView: function (props, propname, componentName) {
    var err = React.PropTypes.oneOf(VIEW_OPTIONS)(props, propname, componentName);

    if (err) return err;
    if (VIEW_OPTIONS.indexOf(props[propname]) < VIEW_OPTIONS.indexOf(props.initialView)) return new Error(("The `" + propname + "` prop: `" + props[propname] + "` cannot be 'lower' than the `initialView` \n                        prop. This creates a range that cannot be rendered.").replace(/\n\t/g, ""));
  },

  disabled: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["disabled"])]),

  readOnly: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["readOnly"])]),

  culture: React.PropTypes.string,

  footer: React.PropTypes.bool,

  headerFormat: CustomPropTypes.localeFormat,
  footerFormat: CustomPropTypes.localeFormat,

  dayFormat: CustomPropTypes.localeFormat,
  dateFormat: CustomPropTypes.localeFormat,
  monthFormat: CustomPropTypes.localeFormat,
  yearFormat: CustomPropTypes.localeFormat,
  decadeFormat: CustomPropTypes.localeFormat,
  centuryFormat: CustomPropTypes.localeFormat,

  messages: React.PropTypes.shape({
    moveBack: React.PropTypes.string,
    moveForward: React.PropTypes.string })
};

var Calendar = React.createClass({

  displayName: "Calendar",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/TimeoutMixin"), require("./mixins/PureRenderMixin"), require("./mixins/RtlParentContextMixin")],

  propTypes: propTypes,

  getInitialState: function () {
    var value = this.inRangeValue(this.props.value);

    return {
      selectedIndex: 0,
      view: this.props.initialView || "month",
      currentDate: value ? new Date(value) : this.inRangeValue(new Date())
    };
  },

  getDefaultProps: function () {
    return {

      value: null,
      min: new Date(1900, 0, 1),
      max: new Date(2099, 11, 31),

      initialView: "month",
      finalView: "century",

      tabIndex: "0",
      footer: false,

      headerFormat: dates.formats.MONTH_YEAR,
      footerFormat: dates.formats.FOOTER,

      dayFormat: dates.shortDay,
      dateFormat: dates.formats.DAY_OF_MONTH,
      monthFormat: dates.formats.MONTH_NAME_ABRV,
      yearFormat: dates.formats.YEAR,

      decadeFormat: function (dt, culture) {
        return "" + dates.format(dt, dates.formats.YEAR, culture) + " - " + dates.format(dates.endOf(dt, "decade"), dates.formats.YEAR, culture);
      },

      centuryFormat: function (dt, culture) {
        return "" + dates.format(dt, dates.formats.YEAR, culture) + " - " + dates.format(dates.endOf(dt, "century"), dates.formats.YEAR, culture);
      },

      messages: msgs({})
    };
  },

  componentWillReceiveProps: function (nextProps) {
    var bottom = VIEW_OPTIONS.indexOf(nextProps.initialView),
        top = VIEW_OPTIONS.indexOf(nextProps.finalView),
        current = VIEW_OPTIONS.indexOf(this.state.view),
        view = this.state.view,
        val = this.inRangeValue(nextProps.value);

    if (current < bottom) this.setState({ view: view = nextProps.initialView });else if (current > top) this.setState({ view: view = nextProps.finalView });

    //if the value changes reset views to the new one
    if (!dates.eq(val, dateOrNull(this.props.value), VIEW_UNIT[view])) this.setState({
      currentDate: val ? new Date(val) : new Date()
    });
  },

  render: function () {
    var _this = this;

    var _$omit = _.omit(this.props, Object.keys(propTypes));

    var className = _$omit.className;
    var props = babelHelpers.objectWithoutProperties(_$omit, ["className"]);
    var View = VIEW[this.state.view];
    var viewProps = _.pick(this.props, Object.keys(compat.type(View).propTypes));
    var unit = this.state.view;
    var messages = msgs(this.props.messages);

    var disabled = this.props.disabled || this.props.readOnly;
    var date = this.state.currentDate;
    var todaysDate = new Date();
    var todayNotInRange = !dates.inRange(todaysDate, this.props.min, this.props.max, unit);
    var labelId = this._id("_view_label");
    var key = this.state.view + "_" + dates[this.state.view](date);
    var id = this._id("_view");

    return React.createElement(
      "div",
      babelHelpers._extends({}, props, {
        onKeyDown: this._keyDown,
        onFocus: this._maybeHandle(this._focus.bind(null, true), true),
        onBlur: this._focus.bind(null, false),
        className: cx(className, "rw-calendar", "rw-widget", {
          "rw-state-focus": this.state.focused,
          "rw-state-disabled": this.props.disabled,
          "rw-state-readonly": this.props.readOnly,
          "rw-rtl": this.isRtl()
        }) }),
      React.createElement(Header, {
        label: this._label(),
        labelId: labelId,
        messages: messages,
        upDisabled: disabled || this.state.view === this.props.finalView,
        prevDisabled: disabled || !dates.inRange(this.nextDate(dir.LEFT), this.props.min, this.props.max, unit),
        nextDisabled: disabled || !dates.inRange(this.nextDate(dir.RIGHT), this.props.min, this.props.max, unit),
        onViewChange: this._maybeHandle(this.navigate.bind(null, dir.UP, null)),
        onMoveLeft: this._maybeHandle(this.navigate.bind(null, dir.LEFT, null)),
        onMoveRight: this._maybeHandle(this.navigate.bind(null, dir.RIGHT, null)) }),
      React.createElement(
        SlideTransition,
        {
          ref: "animation",
          duration: props.duration,
          direction: this.state.slideDirection,
          onAnimate: function () {
            return _this._focus(true);
          } },
        React.createElement(View, babelHelpers._extends({}, viewProps, {
          tabIndex: "-1", key: key, id: id,
          "aria-labelledby": labelId,
          today: todaysDate,
          value: this.props.value,
          focused: this.state.currentDate,
          onChange: this._maybeHandle(this.change),
          onKeyDown: this._maybeHandle(this._keyDown) }))
      ),
      this.props.footer && React.createElement(Footer, {
        value: todaysDate,
        format: this.props.footerFormat,
        culture: this.props.culture,
        disabled: this.props.disabled || todayNotInRange,
        readOnly: this.props.readOnly,
        onClick: this._maybeHandle(this.select)
      })
    );
  },

  navigate: function (direction, date) {
    var view = this.state.view,
        slideDir = direction === dir.LEFT || direction === dir.UP ? "right" : "left";

    if (!date) date = [dir.LEFT, dir.RIGHT].indexOf(direction) !== -1 ? this.nextDate(direction) : this.state.currentDate;

    if (direction === dir.DOWN) view = ALT_VIEW[view] || view;

    if (direction === dir.UP) view = NEXT_VIEW[view] || view;

    if (this.isValidView(view) && dates.inRange(date, this.props.min, this.props.max, view)) {
      this._focus(true, "nav");

      this.setState({
        currentDate: date,
        slideDirection: slideDir,
        view: view
      });
    }
  },

  _focus: function (focused, e) {
    var _this = this;

    if (+this.props.tabIndex === -1) return;

    this.setTimeout("focus", function () {

      if (focused) compat.findDOMNode(_this).focus();

      if (focused !== _this.state.focused) {
        _this.notify(focused ? "onFocus" : "onBlur", e);
        _this.setState({ focused: focused });
      }
    });
  },

  change: function (date) {
    var _this = this;

    setTimeout(function () {
      return _this._focus(true);
    });

    if (this.props.onChange && this.state.view === this.props.initialView) return this.notify("onChange", date);

    this.navigate(dir.DOWN, date);
  },

  select: function (date) {
    var view = this.props.initialView,
        slideDir = view !== this.state.view || dates.gt(date, this.state.currentDate) ? "left" // move down to a the view
    : "right";

    this.notify("onChange", date);

    if (this.isValidView(view) && dates.inRange(date, this.props.min, this.props.max, view)) {
      this._focus(true, "nav");

      this.setState({
        currentDate: date,
        slideDirection: slideDir,
        view: view
      });
    }
  },

  nextDate: function (direction) {
    var method = direction === dir.LEFT ? "subtract" : "add",
        view = this.state.view,
        unit = view === views.MONTH ? view : views.YEAR,
        multi = MULTIPLIER[view] || 1;

    return dates[method](this.state.currentDate, 1 * multi, unit);
  },

  _keyDown: function (e) {
    var ctrl = e.ctrlKey,
        key = e.key,
        direction = ARROWS_TO_DIRECTION[key],
        current = this.state.currentDate,
        view = this.state.view,
        unit = VIEW_UNIT[view],
        currentDate = current;

    if (key === "Enter") {
      e.preventDefault();
      return this.change(current);
    }

    if (direction) {
      if (ctrl) {
        e.preventDefault();
        this.navigate(direction);
      } else {
        if (this.isRtl() && OPPOSITE_DIRECTION[direction]) direction = OPPOSITE_DIRECTION[direction];

        currentDate = dates.move(currentDate, this.props.min, this.props.max, view, direction);

        if (!dates.eq(current, currentDate, unit)) {
          e.preventDefault();

          if (dates.gt(currentDate, current, view)) this.navigate(dir.RIGHT, currentDate);else if (dates.lt(currentDate, current, view)) this.navigate(dir.LEFT, currentDate);else this.setState({ currentDate: currentDate });
        }
      }
    }

    this.notify("onKeyDown", [e]);
  },

  _label: function () {
    var _props = this.props;
    var culture = _props.culture;
    var props = babelHelpers.objectWithoutProperties(_props, ["culture"]);
    var view = this.state.view;
    var dt = this.state.currentDate;

    if (view === "month") return dates.format(dt, props.headerFormat, culture);else if (view === "year") return dates.format(dt, props.yearFormat, culture);else if (view === "decade") return dates.format(dates.startOf(dt, "decade"), props.decadeFormat, culture);else if (view === "century") return dates.format(dates.startOf(dt, "century"), props.centuryFormat, culture);
  },

  inRangeValue: function (_value) {
    var value = dateOrNull(_value);

    if (value === null) return value;

    return dates.max(dates.min(value, this.props.max), this.props.min);
  },

  isValidView: function (next) {
    var bottom = VIEW_OPTIONS.indexOf(this.props.initialView),
        top = VIEW_OPTIONS.indexOf(this.props.finalView),
        current = VIEW_OPTIONS.indexOf(next);

    return current >= bottom && current <= top;
  }
});

function dateOrNull(dt) {
  if (dt && !isNaN(dt.getTime())) return dt;
  return null;
}

function msgs(msgs) {
  return babelHelpers._extends({
    moveBack: "navigate back",
    moveForward: "navigate forward" }, msgs);
}

function formats(obj) {
  return babelHelpers._extends({
    headerFormat: dates.formats.MONTH_YEAR,
    dateFormat: dates.formats.DAY_OF_MONTH,
    monthFormat: dates.formats.MONTH_NAME_ABRV,
    yearFormat: dates.formats.YEAR,

    decadeFormat: function (dt, culture) {
      return "" + dates.format(dt, dates.formats.YEAR, culture) + " - " + dates.format(dates.endOf(dt, "decade"), dates.formats.YEAR, culture);
    },

    centuryFormat: function (dt, culture) {
      return "" + dates.format(dt, dates.formats.YEAR, culture) + " - " + dates.format(dates.endOf(dt, "century"), dates.formats.YEAR, culture);
    } }, obj);
}

module.exports = createUncontrolledWidget(Calendar, { value: "onChange" });

module.exports.BaseCalendar = Calendar;

},{"./Century":3,"./Decade":8,"./Footer":10,"./Header":11,"./Month":14,"./SlideTransition":23,"./Year":26,"./mixins/PureRenderMixin":32,"./mixins/RtlParentContextMixin":34,"./mixins/TimeoutMixin":35,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/constants":42,"./util/dates":43,"./util/propTypes":55,"classnames":59,"react":undefined,"uncontrollable":72}],3:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    cx = require("classnames"),
    dates = require("./util/dates"),
    directions = require("./util/constants").directions,
    Btn = require("./WidgetButton"),
    _ = require("./util/_"),
    CustomPropTypes = require("./util/propTypes"); //omit

module.exports = React.createClass({

  displayName: "CenturyView",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/PureRenderMixin"), require("./mixins/RtlChildContextMixin")],

  propTypes: {
    culture: React.PropTypes.string,
    value: React.PropTypes.instanceOf(Date),
    min: React.PropTypes.instanceOf(Date),
    max: React.PropTypes.instanceOf(Date),

    onChange: React.PropTypes.func.isRequired,

    decadeFormat: CustomPropTypes.localeFormat.isRequired
  },

  render: function () {
    var props = _.omit(this.props, ["max", "min", "value", "onChange"]),
        years = getCenturyDecades(this.props.focused),
        rows = _.chunk(years, 4);

    return React.createElement(
      "table",
      babelHelpers._extends({}, props, {
        role: "grid",
        className: "rw-calendar-grid rw-nav-view",
        "aria-activedescendant": this._id("_selected_item") }),
      React.createElement(
        "tbody",
        null,
        rows.map(this._row)
      )
    );
  },

  _row: function (row, i) {
    var _this = this;

    var id = this._id("_selected_item");

    return React.createElement(
      "tr",
      { key: "row_" + i, role: "row" },
      row.map(function (date, i) {
        var focused = dates.eq(date, _this.props.focused, "decade"),
            selected = dates.eq(date, _this.props.value, "decade"),
            d = inRangeDate(date, _this.props.min, _this.props.max),
            currentDecade = dates.eq(date, _this.props.today, "decade");

        return !inRange(date, _this.props.min, _this.props.max) ? React.createElement(
          "td",
          { key: i, role: "gridcell", className: "rw-empty-cell" },
          " "
        ) : React.createElement(
          "td",
          { key: i, role: "gridcell" },
          React.createElement(
            Btn,
            { onClick: _this.props.onChange.bind(null, d),
              tabIndex: "-1",
              id: focused ? id : undefined,
              "aria-pressed": selected,
              "aria-disabled": _this.props.disabled,
              disabled: _this.props.disabled || undefined,
              className: cx({
                "rw-off-range": !inCentury(date, _this.props.focused),
                "rw-state-focus": focused,
                "rw-state-selected": selected,
                "rw-now": currentDecade
              }) },
            dates.format(dates.startOf(date, "decade"), _this.props.decadeFormat, _this.props.culture)
          )
        );
      })
    );
  }

});

function label(date, format, culture) {
  return dates.format(dates.startOf(date, "decade"), format, culture) + " - " + dates.format(dates.endOf(date, "decade"), format, culture);
}

function inRangeDate(decade, min, max) {
  return dates.max(dates.min(decade, max), min);
}

function inRange(decade, min, max) {
  return dates.gte(decade, dates.startOf(min, "decade"), "year") && dates.lte(decade, dates.endOf(max, "decade"), "year");
}

function inCentury(date, start) {
  return dates.gte(date, dates.startOf(start, "century"), "year") && dates.lte(date, dates.endOf(start, "century"), "year");
}

function getCenturyDecades(_date) {
  var days = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      date = dates.add(dates.startOf(_date, "century"), -20, "year");

  return days.map(function (i) {
    return date = dates.add(date, 10, "year");
  });
}

},{"./WidgetButton":25,"./mixins/PureRenderMixin":32,"./mixins/RtlChildContextMixin":33,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/constants":42,"./util/dates":43,"./util/propTypes":55,"classnames":59,"react":undefined}],4:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    cx = require("classnames"),
    _ = require("./util/_"),
    filter = require("./util/filter"),
    Popup = require("./Popup"),
    Btn = require("./WidgetButton"),
    Input = require("./ComboboxInput"),
    compat = require("./util/compat"),
    CustomPropTypes = require("./util/propTypes"),
    PlainList = require("./List"),
    GroupableList = require("./ListGroupable"),
    validateList = require("./util/validateListInterface"),
    createUncontrolledWidget = require("uncontrollable");

var defaultSuggest = function (f) {
  return f === true ? "startsWith" : f ? f : "eq";
};

var propTypes = {
  //-- controlled props -----------
  value: React.PropTypes.any,
  onChange: React.PropTypes.func,
  open: React.PropTypes.bool,
  onToggle: React.PropTypes.func,
  //------------------------------------

  itemComponent: CustomPropTypes.elementType,
  listComponent: CustomPropTypes.elementType,

  groupComponent: CustomPropTypes.elementType,
  groupBy: CustomPropTypes.accessor,

  data: React.PropTypes.array,
  valueField: React.PropTypes.string,
  textField: CustomPropTypes.accessor,
  name: React.PropTypes.string,

  onSelect: React.PropTypes.func,

  disabled: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["disabled"])]),

  readOnly: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["readOnly"])]),

  suggest: CustomPropTypes.filter,
  filter: CustomPropTypes.filter,

  busy: React.PropTypes.bool,

  dropUp: React.PropTypes.bool,
  duration: React.PropTypes.number, //popup

  placeholder: React.PropTypes.string,

  messages: React.PropTypes.shape({
    open: React.PropTypes.string,
    emptyList: React.PropTypes.string,
    emptyFilter: React.PropTypes.string
  })
};

var ComboBox = React.createClass({

  displayName: "ComboBox",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/TimeoutMixin"), require("./mixins/DataFilterMixin"), require("./mixins/DataHelpersMixin"), require("./mixins/PopupScrollToMixin"), require("./mixins/RtlParentContextMixin")],

  propTypes: propTypes,

  getInitialState: function () {
    var items = this.process(this.props.data, this.props.value),
        idx = this._dataIndexOf(items, this.props.value);

    return {
      selectedItem: items[idx],
      focusedItem: items[! ~idx ? 0 : idx],
      processedData: items,
      open: false
    };
  },

  getDefaultProps: function () {
    return {
      data: [],
      value: "",
      open: false,
      suggest: false,
      filter: false,
      delay: 500,

      messages: {
        open: "open combobox",
        emptyList: "There are no items in this list",
        emptyFilter: "The filter returned no results"
      }
    };
  },

  componentDidUpdate: function () {
    this.refs.list && validateList(this.refs.list);
  },

  shouldComponentUpdate: function (nextProps, nextState) {
    var isSuggesting = this.refs.input && this.refs.input.isSuggesting(),
        stateChanged = !_.isShallowEqual(nextState, this.state),
        valueChanged = !_.isShallowEqual(nextProps, this.props);

    return isSuggesting || stateChanged || valueChanged;
  },

  componentWillReceiveProps: function (nextProps) {
    var rawIdx = this._dataIndexOf(nextProps.data, nextProps.value),
        valueItem = rawIdx == -1 ? nextProps.value : nextProps.data[rawIdx],
        isSuggesting = this.refs.input.isSuggesting(),
        items = this.process(nextProps.data, nextProps.value, (rawIdx === -1 || isSuggesting) && this._dataText(valueItem)),
        idx = this._dataIndexOf(items, nextProps.value),
        focused = this.filterIndexOf(items, this._dataText(valueItem));

    this._searchTerm = "";

    this.setState({
      processedData: items,
      selectedItem: items[idx],
      focusedItem: items[idx === -1 ? focused !== -1 ? focused : 0 // focus the closest match
      : idx]
    });
  },

  render: function () {
    var _this = this;

    var _$omit = _.omit(this.props, Object.keys(propTypes));

    var className = _$omit.className;
    var props = babelHelpers.objectWithoutProperties(_$omit, ["className"]);
    var valueItem = this._dataItem(this._data(), this.props.value);
    var items = this._data();
    var listID = this._id("_listbox");
    var optID = this._id("_option");
    var dropUp = this.props.dropUp;
    var renderList = _.isFirstFocusedRender(this) || this.props.open;
    var List = this.props.listComponent || this.props.groupBy && GroupableList || PlainList;
    var completeType = this.props.suggest ? this.props.filter ? "both" : "inline" : this.props.filter ? "list" : "";

    return React.createElement(
      "div",
      babelHelpers._extends({}, props, {
        ref: "element",
        role: "combobox",
        onKeyDown: this._keyDown,
        onFocus: this._focus.bind(null, true),
        onBlur: this._focus.bind(null, false),
        tabIndex: "-1",
        className: cx(className, "rw-combobox", "rw-widget", (function () {
          var _cx = {};
          _cx["rw-state-focus"] = _this.state.focused;
          _cx["rw-state-disabled"] = _this.props.disabled;
          _cx["rw-state-readonly"] = _this.props.readOnly;
          _cx["rw-rtl"] = _this.isRtl();
          _cx["rw-open" + (dropUp ? "-up" : "")] = _this.props.open;
          return _cx;
        })()) }),
      React.createElement(
        Btn,
        {
          tabIndex: "-1",
          className: "rw-select",
          onClick: this.toggle,
          disabled: !!(this.props.disabled || this.props.readOnly) },
        React.createElement(
          "i",
          { className: "rw-i rw-i-caret-down" + (this.props.busy ? " rw-loading" : "") },
          React.createElement(
            "span",
            { className: "rw-sr" },
            this.props.messages.open
          )
        )
      ),
      React.createElement(Input, {
        ref: "input",
        type: "text",
        suggest: this.props.suggest,
        name: this.props.name,
        "aria-owns": listID,
        "aria-busy": !!this.props.busy,
        "aria-autocomplete": completeType,
        "aria-activedescendent": this.props.open ? optID : undefined,
        "aria-expanded": this.props.open,
        "aria-haspopup": true,
        placeholder: this.props.placeholder,
        disabled: this.props.disabled,
        readOnly: this.props.readOnly,
        className: "rw-input",
        value: this._dataText(valueItem),
        onChange: this._inputTyping,
        onKeyDown: this._inputKeyDown }),
      React.createElement(
        Popup,
        babelHelpers._extends({}, _.pick(this.props, Object.keys(compat.type(Popup).propTypes)), {
          onOpening: function () {
            return _this.refs.list.forceUpdate();
          },
          onRequestClose: this.close }),
        React.createElement(
          "div",
          null,
          renderList && React.createElement(List, babelHelpers._extends({ ref: "list"
          }, _.pick(this.props, Object.keys(compat.type(List).propTypes)), {
            id: listID,
            optID: optID,
            "aria-hidden": !this.props.open,
            "aria-live": completeType && "polite",
            data: items,
            selected: this.state.selectedItem,
            focused: this.state.focusedItem,
            onSelect: this._onSelect,
            onMove: this._scrollTo,
            messages: {
              emptyList: this.props.data.length ? this.props.messages.emptyFilter : this.props.messages.emptyList
            } }))
        )
      )
    );
  },

  _onSelect: _.ifNotDisabled(function (data) {
    this.close();
    this.notify("onSelect", data);
    this.change(data);
    this._focus(true);
  }),

  _inputKeyDown: function (e) {
    this._deleting = e.key === "Backspace" || e.key === "Delete";
    this._isTyping = true;
  },

  _inputTyping: function (e) {
    var _this = this;

    var self = this,
        shouldSuggest = !!this.props.suggest,
        strVal = e.target.value,
        suggestion,
        data;

    suggestion = this._deleting || !shouldSuggest ? strVal : this.suggest(this._data(), strVal);

    suggestion = suggestion || strVal;

    data = _.find(self.props.data, function (item) {
      return _this._dataText(item).toLowerCase() === suggestion.toLowerCase();
    });

    this.change(!this._deleting && data ? data : strVal, true);

    this.open();
  },

  _focus: _.ifNotDisabled(true, function (focused, e) {
    var _this = this;

    focused ? this.refs.input.focus() : this.refs.input.accept(); //not suggesting anymore

    this.setTimeout("focus", function () {
      //console.log(type, focused)
      if (!focused) _this.close();

      if (focused !== _this.state.focused) {
        _this.notify(focused ? "onFocus" : "onBlur", e);
        _this.setState({ focused: focused });
      }
    });
  }),

  _keyDown: _.ifNotDisabled(function (e) {
    var self = this,
        key = e.key,
        alt = e.altKey,
        list = this.refs.list,
        focusedItem = this.state.focusedItem,
        selectedItem = this.state.selectedItem,
        isOpen = this.props.open;

    if (key === "End") if (isOpen) this.setState({ focusedItem: list.last() });else select(list.last(), true);else if (key === "Home") if (isOpen) this.setState({ focusedItem: list.first() });else select(list.first(), true);else if (key === "Escape" && isOpen) this.close();else if (key === "Enter" && isOpen) {
      this.close();
      select(this.state.focusedItem, true);
    } else if (key === "ArrowDown") {
      if (alt) this.open();else {
        if (isOpen) this.setState({ focusedItem: list.next(focusedItem) });else select(list.next(selectedItem), true);
      }
    } else if (key === "ArrowUp") {
      if (alt) this.close();else {
        if (isOpen) this.setState({ focusedItem: list.prev(focusedItem) });else select(list.prev(selectedItem), true);
      }
    }

    this.notify("onKeyDown", [e]);

    function select(item, fromList) {
      if (!item) return self.change(compat.findDOMNode(self.refs.input).value, false);

      self.refs.input.accept(true); //removes caret

      if (fromList) self.notify("onSelect", item);

      self.change(item, false);
    }
  }),

  change: function (data, typing) {
    this._typedChange = !!typing;
    this.notify("onChange", data);
  },

  open: function () {
    if (!this.props.open) this.notify("onToggle", true);
  },

  close: function () {
    if (this.props.open) this.notify("onToggle", false);
  },

  toggle: _.ifNotDisabled(function (e) {
    this._focus(true);

    this.props.open ? this.close() : this.open();
  }),

  suggest: function (data, value) {
    var word = this._dataText(value),
        suggest = defaultSuggest(this.props.suggest),
        suggestion;

    if (!(word || "").trim() || word.length < (this.props.minLength || 1)) return "";

    suggestion = typeof value === "string" ? _.find(data, getFilter(suggest, word, this)) : value;

    if (suggestion && (!this.state || !this.state.deleting)) return this._dataText(suggestion);

    return "";
  },

  _data: function () {
    return this.state.processedData;
  },

  process: function (data, values, searchTerm) {
    if (this.props.filter && searchTerm) data = this.filter(data, searchTerm);

    return data;
  }
});

function getFilter(suggest, word, ctx) {
  return typeof suggest === "string" ? function (item) {
    return filter[suggest](ctx._dataText(item).toLowerCase(), word.toLowerCase());
  } : function (item) {
    return suggest(item, word);
  };
}

module.exports = createUncontrolledWidget(ComboBox, { open: "onToggle", value: "onChange" });

module.exports.BaseComboBox = ComboBox;

},{"./ComboboxInput":5,"./List":12,"./ListGroupable":13,"./Popup":20,"./WidgetButton":25,"./mixins/DataFilterMixin":28,"./mixins/DataHelpersMixin":29,"./mixins/PopupScrollToMixin":31,"./mixins/RtlParentContextMixin":34,"./mixins/TimeoutMixin":35,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/filter":54,"./util/propTypes":55,"./util/validateListInterface":57,"classnames":59,"react":undefined,"uncontrollable":72}],5:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    caretPos = require("./util/caret"),
    compat = require("./util/compat");

module.exports = React.createClass({

  displayName: "ComboboxInput",

  propTypes: {
    value: React.PropTypes.string,
    onChange: React.PropTypes.func.isRequired
  },

  componentDidUpdate: function () {
    var input = compat.findDOMNode(this),
        val = this.props.value;

    if (this.isSuggesting()) {
      var start = val.toLowerCase().indexOf(this._last.toLowerCase()) + this._last.length,
          end = val.length - start;

      if (start >= 0) {
        caretPos(input, start, start + end);
      }
    }
  },

  getDefaultProps: function () {
    return {
      value: ""
    };
  },

  render: function () {
    return React.createElement("input", babelHelpers._extends({}, this.props, {
      type: "text",
      "aria-disabled": this.props.disabled,
      "aria-readonly": this.props.readOnly,
      className: this.props.className + " rw-input",
      onKeyDown: this.props.onKeyDown,
      onChange: this._change,
      value: this.props.value == null ? "" : this.props.value }));
  },

  isSuggesting: function () {
    var val = this.props.value,
        isSuggestion = this._last != null && val.toLowerCase().indexOf(this._last.toLowerCase()) !== -1;

    return this.props.suggest && isSuggestion;
  },

  accept: function (removeCaret) {
    var val = compat.findDOMNode(this).value || "",
        end = val.length;

    this._last = null;
    removeCaret && caretPos(compat.findDOMNode(this), end, end);
  },

  _change: function (e) {
    var val = e.target.value,
        pl = !!this.props.placeholder;

    // IE fires input events when setting/unsetting placeholders.
    // issue #112
    if (pl && !val && val === (this.props.value || "")) return;

    this._last = val;
    this.props.onChange(e, val);
  },

  focus: function () {
    compat.findDOMNode(this).focus();
  }
});

},{"./util/babelHelpers.js":38,"./util/caret":39,"./util/compat":40,"react":undefined}],6:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    cx = require("classnames"),
    dates = require("./util/dates"),
    compat = require("./util/compat"),
    CustomPropTypes = require("./util/propTypes");

module.exports = React.createClass({

  displayName: "DatePickerInput",

  propTypes: {
    format: CustomPropTypes.localeFormat,
    parse: React.PropTypes.func.isRequired,

    value: React.PropTypes.instanceOf(Date),
    onChange: React.PropTypes.func.isRequired,
    culture: React.PropTypes.string },

  getDefaultProps: function () {
    return {
      textValue: ""
    };
  },

  componentWillReceiveProps: function (nextProps) {
    var text = formatDate(nextProps.value, nextProps.editing && nextProps.editFormat ? nextProps.editFormat : nextProps.format, nextProps.culture);

    this.startValue = text;

    this.setState({
      textValue: text
    });
  },

  getInitialState: function () {
    var text = formatDate(this.props.value, this.props.editing && this.props.editFormat ? this.props.editFormat : this.props.format, this.props.culture);

    this.startValue = text;

    return {
      textValue: text
    };
  },

  render: function () {
    var value = this.state.textValue;

    return React.createElement("input", babelHelpers._extends({}, this.props, {
      type: "text",
      className: cx({ "rw-input": true }),
      value: value,
      "aria-disabled": this.props.disabled,
      "aria-readonly": this.props.readOnly,
      disabled: this.props.disabled,
      readOnly: this.props.readOnly,
      onChange: this._change,
      onBlur: chain(this.props.blur, this._blur, this) }));
  },

  _change: function (e) {
    this.setState({ textValue: e.target.value });
    this._needsFlush = true;
  },

  _blur: function (e) {
    var val = e.target.value;

    if (this._needsFlush) {
      this._needsFlush = false;
      this.props.onChange(this.props.parse(val), val);
    }
  },

  focus: function () {
    compat.findDOMNode(this).focus();
  }

});

function isValid(d) {
  return !isNaN(d.getTime());
}

function formatDate(date, format, culture) {
  var val = "";

  if (date instanceof Date && isValid(date)) val = dates.format(date, format, culture);

  return val;
}

function chain(a, b, thisArg) {
  return function () {
    a && a.apply(thisArg, arguments);
    b && b.apply(thisArg, arguments);
  };
}

},{"./util/babelHelpers.js":38,"./util/compat":40,"./util/dates":43,"./util/propTypes":55,"classnames":59,"react":undefined}],7:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    invariant = require("react/lib/invariant"),
    activeElement = require("react/lib/getActiveElement"),
    cx = require("classnames"),
    compat = require("./util/compat"),
    _ = require("./util/_") //pick, omit, has

,
    dates = require("./util/dates"),
    views = require("./util/constants").calendarViews,
    popups = require("./util/constants").datePopups,
    Popup = require("./Popup"),
    Calendar = require("./Calendar").BaseCalendar,
    Time = require("./TimeList"),
    DateInput = require("./DateInput"),
    Btn = require("./WidgetButton"),
    CustomPropTypes = require("./util/propTypes"),
    createUncontrolledWidget = require("uncontrollable");

var viewEnum = Object.keys(views).map(function (k) {
  return views[k];
});

var propTypes = babelHelpers._extends({}, compat.type(Calendar).propTypes, {

  //-- controlled props -----------
  value: React.PropTypes.instanceOf(Date),
  onChange: React.PropTypes.func,
  open: React.PropTypes.oneOf([false, popups.TIME, popups.CALENDAR]),
  onToggle: React.PropTypes.func,
  //------------------------------------

  onSelect: React.PropTypes.func,

  min: React.PropTypes.instanceOf(Date),
  max: React.PropTypes.instanceOf(Date),

  culture: React.PropTypes.string,

  format: CustomPropTypes.localeFormat,
  editFormat: CustomPropTypes.localeFormat,

  calendar: React.PropTypes.bool,
  time: React.PropTypes.bool,

  timeComponent: CustomPropTypes.elementType,

  //popup
  dropUp: React.PropTypes.bool,
  duration: React.PropTypes.number,

  placeholder: React.PropTypes.string,
  name: React.PropTypes.string,

  initialView: React.PropTypes.oneOf(viewEnum),
  finalView: React.PropTypes.oneOf(viewEnum),

  disabled: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["disabled"])]),

  readOnly: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["readOnly"])]),

  parse: React.PropTypes.oneOfType([React.PropTypes.arrayOf(React.PropTypes.string), React.PropTypes.string, React.PropTypes.func]),

  messages: React.PropTypes.shape({
    calendarButton: React.PropTypes.string,
    timeButton: React.PropTypes.string })
});

var DateTimePicker = React.createClass({

  displayName: "DateTimePicker",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/TimeoutMixin"), require("./mixins/PureRenderMixin"), require("./mixins/PopupScrollToMixin"), require("./mixins/RtlParentContextMixin")],

  propTypes: propTypes,

  getInitialState: function () {
    return {
      focused: false };
  },

  getDefaultProps: function () {

    return {
      value: null,

      min: new Date(1900, 0, 1),
      max: new Date(2099, 11, 31),
      calendar: true,
      time: true,
      open: false,

      //calendar override
      footer: true,

      messages: {
        calendarButton: "Select Date",
        timeButton: "Select Time" }
    };
  },

  render: function () {
    var _this = this;

    var _$omit = _.omit(this.props, Object.keys(propTypes));

    var className = _$omit.className;
    var props = babelHelpers.objectWithoutProperties(_$omit, ["className"]);
    var calProps = _.pick(this.props, Object.keys(compat.type(Calendar).propTypes));

    var timeListID = this._id("_time_listbox");
    var timeOptID = this._id("_time_option");
    var dateListID = this._id("_cal");
    var dropUp = this.props.dropUp;
    var renderPopup = _.isFirstFocusedRender(this) || this.props.open;
    var value = dateOrNull(this.props.value);
    var owns;

    if (dateListID && this.props.calendar) owns = dateListID;
    if (timeListID && this.props.time) owns += " " + timeListID;

    return React.createElement(
      "div",
      babelHelpers._extends({}, props, {
        ref: "element",
        tabIndex: "-1",
        onKeyDown: this._maybeHandle(this._keyDown),
        onFocus: this._maybeHandle(this._focus.bind(null, true), true),
        onBlur: this._focus.bind(null, false),
        className: cx(className, "rw-datetimepicker", "rw-widget", (function () {
          var _cx = {};
          _cx["rw-state-focus"] = _this.state.focused;
          _cx["rw-state-disabled"] = _this.isDisabled();
          _cx["rw-state-readonly"] = _this.isReadOnly();
          _cx["rw-has-both"] = _this.props.calendar && _this.props.time;
          _cx["rw-has-neither"] = !_this.props.calendar && !_this.props.time;
          _cx["rw-rtl"] = _this.isRtl();
          _cx["rw-open" + (dropUp ? "-up" : "")] = _this.props.open;
          return _cx;
        })()) }),
      React.createElement(DateInput, { ref: "valueInput",
        "aria-labelledby": this.props["aria-labelledby"],
        "aria-activedescendant": this.props.open ? this.props.open === popups.CALENDAR ? this._id("_cal_view_selected_item") : timeOptID : undefined,
        "aria-expanded": !!this.props.open,
        "aria-busy": !!this.props.busy,
        "aria-owns": owns,
        "aria-haspopup": true,
        placeholder: this.props.placeholder,
        name: this.props.name,
        disabled: this.isDisabled(),
        readOnly: this.isReadOnly(),
        role: this.props.time ? "combobox" : null,
        value: value,

        format: getFormat(this.props),
        editFormat: this.props.editFormat,

        editing: this.state.focused,
        culture: this.props.culture,
        parse: this._parse,
        onChange: this._change }),
      (this.props.calendar || this.props.time) && React.createElement(
        "span",
        { className: "rw-select" },
        this.props.calendar && React.createElement(
          Btn,
          { tabIndex: "-1",
            className: "rw-btn-calendar",
            disabled: this.isDisabled() || this.isReadOnly(),
            "aria-disabled": this.isDisabled() || this.isReadOnly(),
            onClick: this._maybeHandle(this._click.bind(null, popups.CALENDAR)) },
          React.createElement(
            "i",
            { className: "rw-i rw-i-calendar" },
            React.createElement(
              "span",
              { className: "rw-sr" },
              this.props.messages.calendarButton
            )
          )
        ),
        this.props.time && React.createElement(
          Btn,
          { tabIndex: "-1",
            className: "rw-btn-time",
            disabled: this.isDisabled() || this.isReadOnly(),
            "aria-disabled": this.isDisabled() || this.isReadOnly(),
            onClick: this._maybeHandle(this._click.bind(null, popups.TIME)) },
          React.createElement(
            "i",
            { className: "rw-i rw-i-clock-o" },
            React.createElement(
              "span",
              { className: "rw-sr" },
              this.props.messages.timeButton
            )
          )
        )
      ),
      React.createElement(
        Popup,
        {
          dropUp: dropUp,
          open: this.props.open === popups.TIME,
          onRequestClose: this.close,
          duration: this.props.duration,
          onOpening: function () {
            return _this.refs.timePopup.forceUpdate();
          } },
        React.createElement(
          "div",
          null,
          renderPopup && React.createElement(Time, { ref: "timePopup",
            id: timeListID,
            optID: timeOptID,
            "aria-hidden": !this.props.open,
            value: value,
            step: this.props.step,
            min: this.props.min,
            max: this.props.max,
            culture: this.props.culture,
            onMove: this._scrollTo,
            preserveDate: !!this.props.calendar,
            itemComponent: this.props.timeComponent,
            onSelect: this._maybeHandle(this._selectTime) })
        )
      ),
      React.createElement(
        Popup,
        {
          className: "rw-calendar-popup",
          dropUp: dropUp,
          open: this.props.open === popups.CALENDAR,
          duration: this.props.duration,
          onRequestClose: this.close },
        renderPopup && React.createElement(Calendar, babelHelpers._extends({}, calProps, {
          ref: "calPopup",
          tabIndex: "-1",
          id: dateListID,
          value: value,
          "aria-hidden": !this.props.open,
          onChange: this._maybeHandle(this._selectDate) }))
      )
    );
  },

  _change: function (date, str, constrain) {
    var change = this.props.onChange;

    if (constrain) date = this.inRangeValue(date);

    if (change) {
      if (date == null || this.props.value == null) {
        if (date != this.props.value) change(date, str);
      } else if (!dates.eq(date, this.props.value)) change(date, str);
    }
  },

  _keyDown: function (e) {

    if (e.key === "Tab") return;

    if (e.key === "Escape" && this.props.open) this.close();else if (e.altKey) {
      e.preventDefault();

      if (e.key === "ArrowDown") this.open(this.props.open === popups.CALENDAR ? popups.TIME : popups.CALENDAR);else if (e.key === "ArrowUp") this.close();
    } else if (this.props.open) {
      if (this.props.open === popups.CALENDAR) this.refs.calPopup._keyDown(e);
      if (this.props.open === popups.TIME) this.refs.timePopup._keyDown(e);
    }

    this.notify("onKeyDown", [e]);
  },

  _focus: function (focused, e) {
    var _this = this;

    var calendarOpen = this.props.open === popups.CALENDAR;

    // #75: need to aggressively reclaim focus from the calendar otherwise
    // disabled header/footer buttons will drop focus completely from the widget
    if (focused) calendarOpen && this.refs.valueInput.focus();

    this.setTimeout("focus", function () {
      if (!focused) _this.close();

      if (focused !== _this.state.focused) {
        _this.notify(focused ? "onFocus" : "onBlur", e);
        _this.setState({ focused: focused });
      }
    });
  },

  focus: function () {
    if (activeElement() !== compat.findDOMNode(this.refs.valueInput)) this.refs.valueInput.focus();
  },

  _selectDate: function (date) {
    var format = getFormat(this.props),
        dateTime = dates.merge(date, this.props.value),
        dateStr = formatDate(date, format, this.props.culture);

    this.close();
    this.notify("onSelect", [dateTime, dateStr]);
    this._change(dateTime, dateStr, true);
    this.focus();
  },

  _selectTime: function (datum) {
    var format = getFormat(this.props),
        dateTime = dates.merge(this.props.value, datum.date),
        dateStr = formatDate(datum.date, format, this.props.culture);

    this.close();
    this.notify("onSelect", [dateTime, dateStr]);
    this._change(dateTime, dateStr, true);
    this.focus();
  },

  _click: function (view, e) {
    this.focus();
    this.toggle(view, e);
  },

  _parse: function (string) {
    var format = getFormat(this.props, true),
        editFormat = this.props.editFormat,
        parse = this.props.parse,
        formats = [];

    if (typeof parse === "function") return parse(string, this.props.culture);

    if (typeof format === "string") formats.push(format);

    if (typeof editFormat === "string") formats.push(editFormat);

    if (parse) formats = formats.concat(this.props.parse);

    invariant(formats.length, "React Widgets: there are no specified `parse` formats provided and the `format` prop is a function. " + "the DateTimePicker is unable to parse `%s` into a dateTime, " + "please provide either a parse function or Globalize.js compatible string for `format`", string);

    return formatsParser(formats, this.props.culture, string);
  },

  toggle: function (view, e) {

    this.props.open ? this.props.open !== view ? this.open(view) : this.close(view) : this.open(view);
  },

  open: function (view) {
    if (this.props.open !== view && this.props[view] === true) this.notify("onToggle", view);
  },

  close: function () {
    if (this.props.open) this.notify("onToggle", false);
  },

  inRangeValue: function (value) {
    if (value == null) return value;

    return dates.max(dates.min(value, this.props.max), this.props.min);
  } });

module.exports = createUncontrolledWidget(DateTimePicker, { open: "onToggle", value: "onChange" });

module.exports.BaseDateTimePicker = DateTimePicker;

function getFormat(props) {
  var cal = props[popups.CALENDAR] != null ? props.calendar : true,
      time = props[popups.TIME] != null ? props.time : true;

  return props.format ? props.format : cal && time || !cal && !time ? "f" : cal ? "d" : "t";
}

function formatDate(date, format, culture) {
  var val = "";

  if (date instanceof Date && !isNaN(date.getTime())) val = dates.format(date, format, culture);

  return val;
}

function formatsParser(formats, culture, str) {
  var date;

  for (var i = 0; i < formats.length; i++) {
    date = dates.parse(str, formats[i], culture);
    if (date) return date;
  }
  return null;
}

function dateOrNull(dt) {
  if (dt && !isNaN(dt.getTime())) return dt;
  return null;
}

},{"./Calendar":2,"./DateInput":6,"./Popup":20,"./TimeList":24,"./WidgetButton":25,"./mixins/PopupScrollToMixin":31,"./mixins/PureRenderMixin":32,"./mixins/RtlParentContextMixin":34,"./mixins/TimeoutMixin":35,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/constants":42,"./util/dates":43,"./util/propTypes":55,"classnames":59,"react":undefined,"react/lib/getActiveElement":67,"react/lib/invariant":70,"uncontrollable":72}],8:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    _ = require("./util/_"),
    cx = require("classnames"),
    dates = require("./util/dates"),
    CustomPropTypes = require("./util/propTypes"),
    Btn = require("./WidgetButton");

module.exports = React.createClass({

  displayName: "DecadeView",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/PureRenderMixin"), require("./mixins/RtlChildContextMixin")],

  propTypes: {
    culture: React.PropTypes.string,

    value: React.PropTypes.instanceOf(Date),
    focused: React.PropTypes.instanceOf(Date),
    min: React.PropTypes.instanceOf(Date),
    max: React.PropTypes.instanceOf(Date),
    onChange: React.PropTypes.func.isRequired,

    yearFormat: CustomPropTypes.localeFormat.isRequired

  },

  render: function () {
    var props = _.omit(this.props, ["max", "min", "value", "onChange"]),
        years = getDecadeYears(this.props.focused),
        rows = _.chunk(years, 4);

    return React.createElement(
      "table",
      babelHelpers._extends({}, props, {
        role: "grid",
        className: "rw-calendar-grid rw-nav-view",
        "aria-activedescendant": this._id("_selected_item") }),
      React.createElement(
        "tbody",
        null,
        rows.map(this._row)
      )
    );
  },

  _row: function (row, i) {
    var _this = this;

    var id = this._id("_selected_item");

    return React.createElement(
      "tr",
      { key: "row_" + i, role: "row" },
      row.map(function (date, i) {
        var focused = dates.eq(date, _this.props.focused, "year"),
            selected = dates.eq(date, _this.props.value, "year"),
            currentYear = dates.eq(date, _this.props.today, "year");

        return !dates.inRange(date, _this.props.min, _this.props.max, "year") ? React.createElement(
          "td",
          { key: i, role: "gridcell", className: "rw-empty-cell" },
          " "
        ) : React.createElement(
          "td",
          { key: i, role: "gridcell" },
          React.createElement(
            Btn,
            { onClick: _this.props.onChange.bind(null, date), tabIndex: "-1",
              id: focused ? id : undefined,
              "aria-pressed": selected,
              "aria-disabled": _this.props.disabled,
              disabled: _this.props.disabled || undefined,
              className: cx({
                "rw-off-range": !inDecade(date, _this.props.focused),
                "rw-state-focus": focused,
                "rw-state-selected": selected,
                "rw-now": currentYear
              }) },
            dates.format(date, _this.props.yearFormat, _this.props.culture)
          )
        );
      })
    );
  }
});

function inDecade(date, start) {
  return dates.gte(date, dates.startOf(start, "decade"), "year") && dates.lte(date, dates.endOf(start, "decade"), "year");
}

function getDecadeYears(_date) {
  var days = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      date = dates.add(dates.startOf(_date, "decade"), -2, "year");

  return days.map(function (i) {
    return date = dates.add(date, 1, "year");
  });
}

//require('./mixins/DateFocusMixin')('decade', 'year')

},{"./WidgetButton":25,"./mixins/PureRenderMixin":32,"./mixins/RtlChildContextMixin":33,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/dates":43,"./util/propTypes":55,"classnames":59,"react":undefined}],9:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    activeElement = require("react/lib/getActiveElement"),
    _ = require("./util/_"),
    $ = require("./util/dom"),
    cx = require("classnames"),
    compat = require("./util/compat"),
    CustomPropTypes = require("./util/propTypes"),
    Popup = require("./Popup"),
    PlainList = require("./List"),
    GroupableList = require("./ListGroupable"),
    validateList = require("./util/validateListInterface"),
    createUncontrolledWidget = require("uncontrollable");

var propTypes = {
  //-- controlled props -----------
  value: React.PropTypes.any,
  onChange: React.PropTypes.func,
  open: React.PropTypes.bool,
  onToggle: React.PropTypes.func,
  //------------------------------------

  data: React.PropTypes.array,
  valueField: React.PropTypes.string,
  textField: CustomPropTypes.accessor,

  valueComponent: CustomPropTypes.elementType,
  itemComponent: CustomPropTypes.elementType,
  listComponent: CustomPropTypes.elementType,

  groupComponent: CustomPropTypes.elementType,
  groupBy: CustomPropTypes.accessor,

  onSelect: React.PropTypes.func,

  searchTerm: React.PropTypes.string,
  onSearch: React.PropTypes.func,

  busy: React.PropTypes.bool,

  delay: React.PropTypes.number,

  dropUp: React.PropTypes.bool,
  duration: React.PropTypes.number, //popup

  disabled: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["disabled"])]),

  readOnly: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["readOnly"])]),

  messages: React.PropTypes.shape({
    open: React.PropTypes.string })
};

var DropdownList = React.createClass({

  displayName: "DropdownList",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/TimeoutMixin"), require("./mixins/PureRenderMixin"), require("./mixins/DataFilterMixin"), require("./mixins/DataHelpersMixin"), require("./mixins/PopupScrollToMixin"), require("./mixins/RtlParentContextMixin")],

  propTypes: propTypes,

  getDefaultProps: function () {
    return {
      delay: 500,
      value: "",
      open: false,
      data: [],
      searchTerm: "",
      messages: {
        open: "open dropdown",
        filterPlaceholder: "",
        emptyList: "There are no items in this list",
        emptyFilter: "The filter returned no results"
      }
    };
  },

  getInitialState: function () {
    var filter = this.props.open && this.props.filter,
        data = filter ? this.filter(this.props.data, props.searchTerm) : this.props.data,
        initialIdx = this._dataIndexOf(this.props.data, this.props.value);

    return {
      filteredData: filter && data,
      selectedItem: data[initialIdx],
      focusedItem: data[initialIdx] || data[0] };
  },

  componentDidUpdate: function () {
    this.refs.list && validateList(this.refs.list);
  },

  componentWillReceiveProps: function (props) {
    var filter = props.open && props.filter,
        data = filter ? this.filter(props.data, props.searchTerm) : props.data,
        idx = this._dataIndexOf(data, props.value);

    this.setState({
      filteredData: filter && data,
      selectedItem: data[idx],
      focusedItem: data[! ~idx ? 0 : idx]
    });
  },

  render: function () {
    var _this = this;

    var _$omit = _.omit(this.props, Object.keys(propTypes));

    var className = _$omit.className;
    var props = babelHelpers.objectWithoutProperties(_$omit, ["className"]);
    var ValueComponent = this.props.valueComponent;
    var data = this._data();
    var valueItem = this._dataItem(this.props.data, this.props.value) // take value from the raw data
    ;var optID = this._id("_option");
    var dropUp = this.props.dropUp;
    var renderList = _.isFirstFocusedRender(this) || this.props.open;
    var List = this.props.listComponent || this.props.groupBy && GroupableList || PlainList;

    return React.createElement(
      "div",
      babelHelpers._extends({}, props, {
        ref: "element",
        onKeyDown: this._keyDown,
        onClick: this._click,
        onFocus: this._focus.bind(null, true),
        onBlur: this._focus.bind(null, false),
        "aria-expanded": this.props.open,
        "aria-haspopup": true,
        "aria-busy": !!this.props.busy,
        "aria-activedescendent": this.props.open ? optID : undefined,
        "aria-disabled": this.props.disabled,
        "aria-readonly": this.props.readOnly,
        tabIndex: this.props.disabled ? "-1" : "0",
        className: cx(className, "rw-dropdownlist", "rw-widget", (function () {
          var _cx = {};
          _cx["rw-state-disabled"] = _this.props.disabled;
          _cx["rw-state-readonly"] = _this.props.readOnly;
          _cx["rw-state-focus"] = _this.state.focused;
          _cx["rw-rtl"] = _this.isRtl();
          _cx["rw-open" + (dropUp ? "-up" : "")] = _this.props.open;
          return _cx;
        })()) }),
      React.createElement(
        "span",
        { className: "rw-dropdownlist-picker rw-select rw-btn" },
        React.createElement(
          "i",
          { className: "rw-i rw-i-caret-down" + (this.props.busy ? " rw-loading" : "") },
          React.createElement(
            "span",
            { className: "rw-sr" },
            this.props.messages.open
          )
        )
      ),
      React.createElement(
        "div",
        { className: "rw-input" },
        !valueItem && props.placeholder ? React.createElement(
          "span",
          { className: "rw-placeholder" },
          props.placeholder
        ) : this.props.valueComponent ? React.createElement(ValueComponent, { item: valueItem }) : this._dataText(valueItem)
      ),
      React.createElement(
        Popup,
        babelHelpers._extends({}, _.pick(this.props, Object.keys(compat.type(Popup).propTypes)), {
          onOpen: function () {
            return _this.focus();
          },
          onOpening: function () {
            return _this.refs.list.forceUpdate();
          },
          onRequestClose: this.close }),
        React.createElement(
          "div",
          null,
          this.props.filter && this._renderFilter(),
          renderList && React.createElement(List, babelHelpers._extends({ ref: "list"
          }, _.pick(this.props, Object.keys(compat.type(List).propTypes)), {
            data: data,
            optID: optID,
            "aria-hidden": !this.props.open,
            selected: this.state.selectedItem,
            focused: this.props.open ? this.state.focusedItem : null,
            onSelect: this._onSelect,
            onMove: this._scrollTo,
            messages: {
              emptyList: this.props.data.length ? this.props.messages.emptyFilter : this.props.messages.emptyList
            } }))
        )
      )
    );
  },

  _renderFilter: function () {
    var _this = this;

    return React.createElement(
      "div",
      { ref: "filterWrapper", className: "rw-filter-input" },
      React.createElement(
        "span",
        { className: "rw-select rw-btn" },
        React.createElement("i", { className: "rw-i rw-i-search" })
      ),
      React.createElement("input", { ref: "filter", className: "rw-input",
        placeholder: this.props.messages.filterPlaceholder,
        value: this.props.searchTerm,
        onChange: function (e) {
          return _this.notify("onSearch", e.target.value);
        } })
    );
  },

  _focus: _.ifNotDisabled(true, function (focused, e) {
    var _this = this;

    var type = e.type;

    //focused && (this.focus(), console.log('_focus'))

    this.setTimeout("focus", function () {
      if (!focused) _this.close();

      if (focused !== _this.state.focused) {
        _this.notify(focused ? "onFocus" : "onBlur", e);
        _this.setState({ focused: focused });
      }
    });
  }),

  _onSelect: _.ifNotDisabled(function (data) {
    this.close();
    this.notify("onSelect", data);
    this.change(data);
    this.focus(this);
  }),

  _click: _.ifNotDisabled(function (e) {
    var wrapper = this.refs.filterWrapper;

    if (!this.props.filter || !this.props.open) this.toggle();else if (!$.contains(compat.findDOMNode(wrapper), e.target)) this.close();

    this.notify("onClick", e);
  }),

  _keyDown: _.ifNotDisabled(function (e) {
    var _this = this;

    var self = this,
        key = e.key,
        alt = e.altKey,
        list = this.refs.list,
        focusedItem = this.state.focusedItem,
        selectedItem = this.state.selectedItem,
        isOpen = this.props.open,
        closeWithFocus = function () {
      _this.close(), compat.findDOMNode(_this).focus();
    };

    if (key === "End") {
      if (isOpen) this.setState({ focusedItem: list.last() });else change(list.last());
      e.preventDefault();
    } else if (key === "Home") {
      if (isOpen) this.setState({ focusedItem: list.first() });else change(list.first());
      e.preventDefault();
    } else if (key === "Escape" && isOpen) {
      closeWithFocus();
    } else if ((key === "Enter" || key === " ") && isOpen) {
      change(this.state.focusedItem, true);
    } else if (key === "ArrowDown") {
      if (alt) this.open();else if (isOpen) this.setState({ focusedItem: list.next(focusedItem) });else change(list.next(selectedItem));
      e.preventDefault();
    } else if (key === "ArrowUp") {
      if (alt) closeWithFocus();else if (isOpen) this.setState({ focusedItem: list.prev(focusedItem) });else change(list.prev(selectedItem));
      e.preventDefault();
    } else if (!(this.props.filter && isOpen)) this.search(String.fromCharCode(e.keyCode), function (item) {
      isOpen ? _this.setState({ focusedItem: item }) : change(item);
    });

    this.notify("onKeyDown", [e]);

    function change(item, fromList) {
      if (!item) return;
      fromList ? self._onSelect(item) : self.change(item);
    }
  }),

  change: function (data) {
    if (!_.isShallowEqual(data, this.props.value)) {
      this.notify("onChange", data);
      this.notify("onSearch", "");
      this.close();
    }
  },

  focus: function (target) {
    var inst = target || (this.props.filter && this.props.open ? this.refs.filter : this);

    if (activeElement() !== compat.findDOMNode(inst)) compat.findDOMNode(inst).focus();
  },

  _data: function () {
    return this.state.filteredData || this.props.data;
  },

  search: function (character, cb) {
    var _this = this;

    var word = ((this._searchTerm || "") + character).toLowerCase();

    this._searchTerm = word;

    this.setTimeout("search", function () {
      var list = _this.refs.list,
          key = _this.props.open ? "focusedItem" : "selectedItem",
          item = list.next(_this.state[key], word);

      _this._searchTerm = "";
      if (item) cb(item);
    }, this.props.delay);
  },

  open: function () {
    this.notify("onToggle", true);
  },

  close: function () {
    this.notify("onToggle", false);
  },

  toggle: function () {
    this.props.open ? this.close() : this.open();
  }

});

module.exports = createUncontrolledWidget(DropdownList, { open: "onToggle", value: "onChange", searchTerm: "onSearch" });

module.exports.BaseDropdownList = DropdownList;

},{"./List":12,"./ListGroupable":13,"./Popup":20,"./mixins/DataFilterMixin":28,"./mixins/DataHelpersMixin":29,"./mixins/PopupScrollToMixin":31,"./mixins/PureRenderMixin":32,"./mixins/RtlParentContextMixin":34,"./mixins/TimeoutMixin":35,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/dom":49,"./util/propTypes":55,"./util/validateListInterface":57,"classnames":59,"react":undefined,"react/lib/getActiveElement":67,"uncontrollable":72}],10:[function(require,module,exports){
var React = require("react"),
    Btn = require("./WidgetButton"),
    dates = require("./util/dates");

module.exports = React.createClass({

  displayName: "Footer",

  render: function () {
    var now = this.props.value,
        formatted = dates.format(now, this.props.format, this.props.culture);

    return React.createElement(
      "div",
      { className: "rw-footer" },
      React.createElement(
        Btn,
        { tabIndex: "-1",
          "aria-disabled": !!this.props.disabled,
          "aria-readonly": !!this.props.readOnly,
          disabled: this.props.disabled,
          readOnly: this.props.readOnly,
          onClick: this.props.onClick.bind(null, now)
        },
        formatted
      )
    );
  }

});

},{"./WidgetButton":25,"./util/dates":43,"react":undefined}],11:[function(require,module,exports){
"use strict";
var React = require("react"),
    Btn = require("./WidgetButton");

module.exports = React.createClass({
  displayName: "exports",

  propTypes: {
    label: React.PropTypes.string.isRequired,
    labelId: React.PropTypes.string,

    upDisabled: React.PropTypes.bool.isRequired,
    prevDisabled: React.PropTypes.bool.isRequired,
    nextDisabled: React.PropTypes.bool.isRequired,
    onViewChange: React.PropTypes.func.isRequired,
    onMoveLeft: React.PropTypes.func.isRequired,
    onMoveRight: React.PropTypes.func.isRequired,

    messages: React.PropTypes.shape({
      moveBack: React.PropTypes.string,
      moveForward: React.PropTypes.string
    })
  },

  mixins: [require("./mixins/PureRenderMixin"), require("./mixins/RtlChildContextMixin")],

  getDefaultProps: function () {
    return {
      messages: {
        moveBack: "navigate back",
        moveForward: "navigate forward" }
    };
  },

  render: function () {
    var rtl = this.isRtl();

    return React.createElement(
      "div",
      { className: "rw-header" },
      React.createElement(
        Btn,
        { className: "rw-btn-left",
          tabIndex: "-1",
          onClick: this.props.onMoveLeft,
          disabled: this.props.prevDisabled,
          "aria-disabled": this.props.prevDisabled,
          title: this.props.moveBack },
        React.createElement("i", { className: "rw-i rw-i-caret-" + (rtl ? "right" : "left") }),
        React.createElement(
          "span",
          { className: "rw-sr" },
          this.props.messages.moveBack
        )
      ),
      React.createElement(
        Btn,
        { className: "rw-btn-view",
          id: this.props.labelId,
          tabIndex: "-1",
          onClick: this.props.onViewChange,
          disabled: this.props.upDisabled,
          "aria-disabled": this.props.upDisabled },
        this.props.label
      ),
      React.createElement(
        Btn,
        { className: "rw-btn-right",
          tabIndex: "-1",
          onClick: this.props.onMoveRight,
          disabled: this.props.nextDisabled,
          "aria-disabled": this.props.nextDisabled,
          title: this.props.moveForward },
        React.createElement("i", { className: "rw-i rw-i-caret-" + (rtl ? "left" : "right") }),
        React.createElement(
          "span",
          { className: "rw-sr" },
          this.props.messages.moveForward
        )
      )
    );
  }
});

},{"./WidgetButton":25,"./mixins/PureRenderMixin":32,"./mixins/RtlChildContextMixin":33,"react":undefined}],12:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    CustomPropTypes = require("./util/propTypes"),
    compat = require("./util/compat"),
    cx = require("classnames"),
    _ = require("./util/_"),
    $ = require("./util/dom");

module.exports = React.createClass({

  displayName: "List",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/DataHelpersMixin"), require("./mixins/ListMovementMixin")],

  propTypes: {
    data: React.PropTypes.array,
    onSelect: React.PropTypes.func,
    onMove: React.PropTypes.func,
    itemComponent: CustomPropTypes.elementType,

    selectedIndex: React.PropTypes.number,
    focusedIndex: React.PropTypes.number,
    valueField: React.PropTypes.string,
    textField: CustomPropTypes.accessor,

    optID: React.PropTypes.string,

    messages: React.PropTypes.shape({
      emptyList: React.PropTypes.string
    }) },

  getDefaultProps: function () {
    return {
      optID: "",
      onSelect: function () {},
      data: [],
      messages: {
        emptyList: "There are no items in this list"
      }
    };
  },

  getInitialState: function () {
    return {};
  },

  componentDidMount: function () {
    this.move();
  },

  componentDidUpdate: function (prevProps) {
    this.move();
  },

  render: function () {
    var _this = this;

    var _$omit = _.omit(this.props, ["data"]);

    var className = _$omit.className;
    var props = babelHelpers.objectWithoutProperties(_$omit, ["className"]);
    var ItemComponent = this.props.itemComponent;
    var items;

    items = !this.props.data.length ? React.createElement(
      "li",
      null,
      this.props.messages.emptyList
    ) : this.props.data.map(function (item, idx) {
      var focused = item === _this.props.focused,
          selected = item === _this.props.selected;

      return React.createElement(
        "li",
        {
          tabIndex: "-1",
          key: "item_" + idx,
          role: "option",
          id: focused ? _this.props.optID : undefined,
          "aria-selected": selected,
          className: cx({
            "rw-list-option": true,
            "rw-state-focus": focused,
            "rw-state-selected": selected }),
          onClick: _this.props.onSelect.bind(null, item) },
        ItemComponent ? React.createElement(ItemComponent, { item: item, value: _this._dataValue(item), text: _this._dataText(item) }) : _this._dataText(item)
      );
    });

    return React.createElement(
      "ul",
      babelHelpers._extends({}, props, {
        className: (className || "") + " rw-list",
        ref: "scrollable",
        role: "listbox" }),
      items
    );
  },

  _data: function () {
    return this.props.data;
  },

  move: function () {
    var list = compat.findDOMNode(this),
        idx = this._data().indexOf(this.props.focused),
        selected = list.children[idx];

    if (!selected) return;

    this.notify("onMove", [selected, list, this.props.focused]);
  }

});

},{"./mixins/DataHelpersMixin":29,"./mixins/ListMovementMixin":30,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/dom":49,"./util/propTypes":55,"classnames":59,"react":undefined}],13:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    warning = require("react/lib/warning"),
    CustomPropTypes = require("./util/propTypes"),
    compat = require("./util/compat"),
    cx = require("classnames"),
    _ = require("./util/_");

module.exports = React.createClass({

  displayName: "List",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/DataHelpersMixin"), require("./mixins/ListMovementMixin")],

  propTypes: {
    data: React.PropTypes.array,
    onSelect: React.PropTypes.func,
    onMove: React.PropTypes.func,

    itemComponent: CustomPropTypes.elementType,
    groupComponent: CustomPropTypes.elementType,

    selected: React.PropTypes.any,
    focused: React.PropTypes.any,

    valueField: React.PropTypes.string,
    textField: CustomPropTypes.accessor,

    optID: React.PropTypes.string,

    groupBy: CustomPropTypes.accessor,

    messages: React.PropTypes.shape({
      emptyList: React.PropTypes.string
    }) },

  getDefaultProps: function () {
    return {
      optID: "",
      onSelect: function () {},
      data: [],
      messages: {
        emptyList: "There are no items in this list"
      }
    };
  },

  getInitialState: function () {
    var keys = [];

    return {
      groups: this._group(this.props.groupBy, this.props.data, keys),

      sortedKeys: keys
    };
  },

  componentWillReceiveProps: function (nextProps) {
    var keys = [];

    if (nextProps.data !== this.props.data || nextProps.groupBy !== this.props.groupBy) this.setState({
      groups: this._group(nextProps.groupBy, nextProps.data, keys),
      sortedKeys: keys
    });
  },

  componentDidMount: function (prevProps, prevState) {
    this.move();
  },

  componentDidUpdate: function (prevProps) {
    this.move();
  },

  render: function () {
    var _this = this;

    var _$omit = _.omit(this.props, ["data", "selectedIndex"]);

    var className = _$omit.className;
    var props = babelHelpers.objectWithoutProperties(_$omit, ["className"]);
    var groups = this.state.groups;
    var items = [];
    var idx = -1;
    var group;

    if (this.props.data.length) {
      items = this.state.sortedKeys.reduce(function (items, key) {
        group = groups[key];
        items.push(_this._renderGroupHeader(key));

        for (var itemIdx = 0; itemIdx < group.length; itemIdx++) items.push(_this._renderItem(key, group[itemIdx], ++idx));

        return items;
      }, []);
    } else items = React.createElement(
      "li",
      null,
      this.props.messages.emptyList
    );

    return React.createElement(
      "ul",
      babelHelpers._extends({}, props, {
        className: (className || "") + " rw-list  rw-list-grouped",
        ref: "scrollable",
        role: "listbox" }),
      items
    );
  },

  _renderGroupHeader: function (group) {
    var ItemComponent = this.props.groupComponent;

    return React.createElement(
      "li",
      {
        key: "item_" + group,
        tabIndex: "-1",
        role: "separator",
        className: "rw-list-optgroup" },
      ItemComponent ? React.createElement(ItemComponent, { item: group }) : group
    );
  },

  _renderItem: function (group, item, idx) {
    var focused = this.props.focused === item,
        selected = this.props.selected === item,
        ItemComponent = this.props.itemComponent;

    //console.log('hi')
    return React.createElement(
      "li",
      {
        key: "item_" + group + "_" + idx,
        role: "option",
        id: focused ? this.props.optID : undefined,
        "aria-selected": selected,
        onClick: this.props.onSelect.bind(null, item),
        className: cx({
          "rw-state-focus": focused,
          "rw-state-selected": selected,
          "rw-list-option": true
        }) },
      ItemComponent ? React.createElement(ItemComponent, { item: item, value: this._dataValue(item), text: this._dataText(item) }) : this._dataText(item)
    );
  },

  _isIndexOf: function (idx, item) {
    return this.props.data[idx] === item;
  },

  _group: function (groupBy, data, keys) {
    var iter = typeof groupBy === "function" ? groupBy : function (item) {
      return item[groupBy];
    };

    // the keys array ensures that groups are rendered in the order they came in
    // which means that if you sort the data array it will render sorted,
    // so long as you also sorted by group
    keys = keys || [];

    warning(typeof groupBy !== "string" || !data.length || _.has(data[0], groupBy), "[React Widgets] You are seem to be trying to group this list by a " + ("property `" + groupBy + "` that doesn't exist in the dataset items, this may be a typo"));

    return data.reduce(function (grps, item) {
      var group = iter(item);

      _.has(grps, group) ? grps[group].push(item) : (keys.push(group), grps[group] = [item]);

      return grps;
    }, {});
  },

  _data: function () {
    var groups = this.state.groups;

    return this.state.sortedKeys.reduce(function (flat, grp) {
      return flat.concat(groups[grp]);
    }, []);
  },

  move: function () {
    var selected = this.getItemDOMNode(this.props.focused);

    if (!selected) return;

    this.notify("onMove", [selected, compat.findDOMNode(this), this.props.focused]);
  },

  getItemDOMNode: function (item) {
    var list = compat.findDOMNode(this),
        groups = this.state.groups,
        idx = -1,
        itemIdx,
        child;

    this.state.sortedKeys.some(function (group) {
      itemIdx = groups[group].indexOf(item);
      idx++;

      if (itemIdx !== -1) return !!(child = list.children[idx + itemIdx + 1]);

      idx += groups[group].length;
    });

    return child;
  }

});

},{"./mixins/DataHelpersMixin":29,"./mixins/ListMovementMixin":30,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/propTypes":55,"classnames":59,"react":undefined,"react/lib/warning":71}],14:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    cx = require("classnames"),
    dates = require("./util/dates"),
    CustomPropTypes = require("./util/propTypes"),
    _ = require("./util/_"),
    Btn = require("./WidgetButton");

module.exports = React.createClass({

  displayName: "MonthView",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/RtlChildContextMixin")],

  propTypes: {
    culture: React.PropTypes.string,
    value: React.PropTypes.instanceOf(Date),
    focused: React.PropTypes.instanceOf(Date),
    min: React.PropTypes.instanceOf(Date),
    max: React.PropTypes.instanceOf(Date),

    dayFormat: CustomPropTypes.localeFormat.isRequired,
    dateFormat: CustomPropTypes.localeFormat.isRequired,

    onChange: React.PropTypes.func.isRequired },

  render: function () {
    var props = _.omit(this.props, ["max", "min", "value", "onChange"]),
        month = dates.visibleDays(this.props.focused, this.props.culture),
        rows = _.chunk(month, 7);

    return React.createElement(
      "table",
      babelHelpers._extends({}, props, {
        role: "grid",
        className: "rw-calendar-grid",
        "aria-activedescendant": this._id("_selected_item") }),
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          this._headers(props.dayFormat, props.culture)
        )
      ),
      React.createElement(
        "tbody",
        null,
        rows.map(this._row)
      )
    );
  },

  _row: function (row, i) {
    var _this = this;

    var id = this._id("_selected_item");

    return React.createElement(
      "tr",
      { key: "week_" + i, role: "row" },
      row.map(function (day, idx) {
        var focused = dates.eq(day, _this.props.focused, "day"),
            selected = dates.eq(day, _this.props.value, "day"),
            today = dates.eq(day, _this.props.today, "day");

        return !dates.inRange(day, _this.props.min, _this.props.max) ? React.createElement(
          "td",
          { key: "day_" + idx, role: "gridcell", className: "rw-empty-cell" },
          " "
        ) : React.createElement(
          "td",
          { key: "day_" + idx, role: "gridcell" },
          React.createElement(
            Btn,
            {
              tabIndex: "-1",
              onClick: _this.props.onChange.bind(null, day),
              "aria-pressed": selected,
              "aria-disabled": _this.props.disabled || undefined,
              disabled: _this.props.disabled,
              className: cx({
                "rw-off-range": dates.month(day) !== dates.month(_this.props.focused),
                "rw-state-focus": focused,
                "rw-state-selected": selected,
                "rw-now": today
              }),
              id: focused ? id : undefined },
            dates.format(day, _this.props.dateFormat, _this.props.culture)
          )
        );
      })
    );
  },

  _headers: function (format, culture) {
    return [0, 1, 2, 3, 4, 5, 6].map(function (day) {
      return React.createElement(
        "th",
        { key: "header_" + day },
        dates.format(day, format, culture)
      );
    });
  }

});
//value is chosen

},{"./WidgetButton":25,"./mixins/RtlChildContextMixin":33,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/dates":43,"./util/propTypes":55,"classnames":59,"react":undefined}],15:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    cx = require("classnames"),
    _ = require("./util/_"),
    compat = require("./util/compat"),
    SelectInput = require("./MultiselectInput"),
    TagList = require("./MultiselectTagList"),
    Popup = require("./Popup"),
    PlainList = require("./List"),
    GroupableList = require("./ListGroupable"),
    validateList = require("./util/validateListInterface"),
    createUncontrolledWidget = require("uncontrollable"),
    CustomPropTypes = require("./util/propTypes");

var propTypes = {
  data: React.PropTypes.array,
  //-- controlled props --
  value: React.PropTypes.array,
  onChange: React.PropTypes.func,

  searchTerm: React.PropTypes.string,
  onSearch: React.PropTypes.func,

  open: React.PropTypes.bool,
  onToggle: React.PropTypes.func,
  //-------------------------------------------

  valueField: React.PropTypes.string,
  textField: CustomPropTypes.accessor,

  tagComponent: CustomPropTypes.elementType,
  itemComponent: CustomPropTypes.elementType,
  listComponent: CustomPropTypes.elementType,

  groupComponent: CustomPropTypes.elementType,
  groupBy: CustomPropTypes.accessor,

  onSelect: React.PropTypes.func,
  onCreate: React.PropTypes.oneOfType([React.PropTypes.oneOf([false]), React.PropTypes.func]),

  dropUp: React.PropTypes.bool,
  duration: React.PropTypes.number, //popup

  placeholder: React.PropTypes.string,

  disabled: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.array, React.PropTypes.oneOf(["disabled"])]),

  readOnly: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.array, React.PropTypes.oneOf(["readonly"])]),

  messages: React.PropTypes.shape({
    open: React.PropTypes.string,
    emptyList: React.PropTypes.string,
    emptyFilter: React.PropTypes.string
  })
};

var Multiselect = React.createClass({

  displayName: "Multiselect",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/TimeoutMixin"), require("./mixins/DataFilterMixin"), require("./mixins/DataHelpersMixin"), require("./mixins/PopupScrollToMixin"), require("./mixins/RtlParentContextMixin")],

  propTypes: propTypes,

  getDefaultProps: function () {
    return {
      data: [],
      filter: "startsWith",
      value: [],
      open: false,
      searchTerm: "",
      messages: {
        createNew: "(create new tag)",
        emptyList: "There are no items in this list",
        emptyFilter: "The filter returned no results"
      }
    };
  },

  getInitialState: function () {
    var _this = this;

    var dataItems = _.splat(this.props.value).map(function (item) {
      return _this._dataItem(_this.props.data, item);
    }),
        data = this.process(this.props.data, dataItems, this.props.searchTerm);

    return {
      focusedItem: data[0],
      processedData: data,
      dataItems: dataItems
    };
  },

  componentDidUpdate: function () {
    this.refs.list && validateList(this.refs.list);
  },

  componentWillReceiveProps: function (nextProps) {
    var _this = this;

    var values = _.splat(nextProps.value),
        current = this.state.focusedItem,
        items = this.process(nextProps.data, values, nextProps.searchTerm);

    this.setState({
      processedData: items,
      focusedItem: items.indexOf(current) === -1 ? items[0] : current,
      dataItems: values.map(function (item) {
        return _this._dataItem(nextProps.data, item);
      })
    });
  },

  render: function () {
    var _this = this;

    var _$omit = _.omit(this.props, Object.keys(propTypes));

    var className = _$omit.className;
    var children = _$omit.children;
    var props = babelHelpers.objectWithoutProperties(_$omit, ["className", "children"]);

    var listID = this._id("_listbox");
    var optID = this._id("_option");
    var items = this._data();
    var values = this.state.dataItems;
    var dropUp = this.props.dropUp;
    var renderPopup = _.isFirstFocusedRender(this) || this.props.open;
    var List = this.props.listComponent || this.props.groupBy && GroupableList || PlainList;
    var listProps = _.pick(this.props, Object.keys(compat.type(List).propTypes));

    return React.createElement(
      "div",
      babelHelpers._extends({}, props, {
        ref: "element",
        onKeyDown: this._maybeHandle(this._keyDown),
        onFocus: this._maybeHandle(this._focus.bind(null, true), true),
        onBlur: this._focus.bind(null, false),
        tabIndex: "-1",
        className: cx(className, "rw-multiselect", "rw-widget", (function () {
          var _cx = {};
          _cx["rw-state-focus"] = _this.state.focused;
          _cx["rw-state-disabled"] = _this.props.disabled === true;
          _cx["rw-state-readonly"] = _this.props.readOnly === true;
          _cx["rw-rtl"] = _this.isRtl();
          _cx["rw-open" + (dropUp ? "-up" : "")] = _this.props.open;
          return _cx;
        })()) }),
      React.createElement(
        "div",
        { className: "rw-multiselect-wrapper", ref: "wrapper" },
        this.props.busy && React.createElement("i", { className: "rw-i rw-loading" }),
        !!values.length && React.createElement(TagList, {
          ref: "tagList",
          value: values,
          textField: this.props.textField,
          valueField: this.props.valueField,
          valueComponent: this.props.tagComponent,
          disabled: this.props.disabled,
          readOnly: this.props.readOnly,
          onDelete: this._delete }),
        React.createElement(SelectInput, {
          ref: "input",
          "aria-activedescendent": this.props.open ? optID : undefined,
          "aria-expanded": this.props.open,
          "aria-busy": !!this.props.busy,
          "aria-owns": listID,
          "aria-haspopup": true,
          value: this.props.searchTerm,
          disabled: this.props.disabled === true,
          readOnly: this.props.readOnly === true,
          placeholder: this._placeholder(),
          onKeyDown: this._searchKeyDown,
          onKeyUp: this._searchgKeyUp,
          onChange: this._typing,
          onFocus: this._inputFocus,
          onClick: this._inputFocus,
          maxLength: this.props.maxLength })
      ),
      React.createElement(
        Popup,
        babelHelpers._extends({}, _.pick(this.props, Object.keys(compat.type(Popup).propTypes)), {
          onOpening: function () {
            return _this.refs.list.forceUpdate();
          },
          onRequestClose: this.close }),
        React.createElement(
          "div",
          null,
          renderPopup && [React.createElement(List, babelHelpers._extends({ ref: "list", key: "0"
          }, listProps, {
            readOnly: !!listProps.readOnly,
            disabled: !!listProps.disabled,
            id: listID,
            optID: optID,
            "aria-autocomplete": "list",
            "aria-hidden": !this.props.open,
            data: items,
            focused: this.state.focusedItem,
            onSelect: this._maybeHandle(this._onSelect),
            onMove: this._scrollTo,
            messages: {
              emptyList: this.props.data.length ? this.props.messages.emptyFilter : this.props.messages.emptyList
            } })), this._shouldShowCreate() && React.createElement(
            "ul",
            { className: "rw-list rw-multiselect-create-tag", key: "1" },
            React.createElement(
              "li",
              { onClick: this._onCreate.bind(null, this.props.searchTerm),
                className: cx({
                  "rw-list-option": true,
                  "rw-state-focus": !this._data().length || this.state.focusedItem === null
                }) },
              React.createElement(
                "strong",
                null,
                "\"" + this.props.searchTerm + "\""
              ),
              " ",
              this.props.messages.createNew
            )
          )]
        )
      )
    );
  },

  _data: function () {
    return this.state.processedData;
  },

  _delete: function (value) {
    this._focus(true);
    this.change(this.state.dataItems.filter(function (d) {
      return d !== value;
    }));
  },

  _inputFocus: function (e) {
    this._focus(true);
    !this.props.open && this.open();
  },

  _focus: function (focused, e) {
    var _this = this;

    if (this.props.disabled === true) return;

    if (focused) this.refs.input.focus();

    this.setTimeout("focus", function () {
      if (!focused) _this.refs.tagList && _this.refs.tagList.clear();

      if (focused !== _this.state.focused) {
        focused ? _this.open() : _this.close();

        _this.notify(focused ? "onFocus" : "onBlur", e);
        _this.setState({ focused: focused });
      }
    });
  },

  _searchKeyDown: function (e) {
    if (e.key === "Backspace" && e.target.value && !this._deletingText) this._deletingText = true;
  },

  _searchgKeyUp: function (e) {
    if (e.key === "Backspace" && this._deletingText) this._deletingText = false;
  },

  _typing: function (e) {
    this.notify("onSearch", [e.target.value]);
    this.open();
  },

  _onSelect: function (data) {

    if (data === undefined) {
      if (this.props.onCreate) this._onCreate(this.props.searchTerm);

      return;
    }

    this.notify("onSelect", data);
    this.change(this.state.dataItems.concat(data));

    this.close();
    this._focus(true);
  },

  _onCreate: function (tag) {
    if (tag.trim() === "") return;

    this.notify("onCreate", tag);
    this.props.searchTerm && this.notify("onSearch", [""]);

    this.close();
    this._focus(true);
  },

  _keyDown: function (e) {
    var key = e.key,
        alt = e.altKey,
        ctrl = e.ctrlKey,
        noSearch = !this.props.searchTerm && !this._deletingText,
        isOpen = this.props.open,
        focusedItem = this.state.focusedItem,
        tagList = this.refs.tagList,
        list = this.refs.list;

    if (key === "ArrowDown") {
      var next = list.next(focusedItem),
          creating = this._shouldShowCreate() && focusedItem === next || focusedItem === null;

      next = creating ? null : next;

      e.preventDefault();
      if (isOpen) this.setState({ focusedItem: next });else this.open();
    } else if (key === "ArrowUp") {
      var prev = focusedItem === null ? list.last() : list.prev(focusedItem);

      e.preventDefault();

      if (alt) this.close();else if (isOpen) this.setState({ focusedItem: prev });
    } else if (key === "End") {
      if (isOpen) this.setState({ focusedItem: list.last() });else tagList && tagList.last();
    } else if (key === "Home") {
      if (isOpen) this.setState({ focusedItem: list.first() });else tagList && tagList.first();
    } else if (isOpen && key === "Enter") ctrl && this.props.onCreate || focusedItem === null ? this._onCreate(this.props.searchTerm) : this._onSelect(this.state.focusedItem);else if (key === "Escape") isOpen ? this.close() : tagList && tagList.clear();else if (noSearch && key === "ArrowLeft") tagList && tagList.prev();else if (noSearch && key === "ArrowRight") tagList && tagList.next();else if (noSearch && key === "Delete") tagList && tagList.removeCurrent();else if (noSearch && key === "Backspace") tagList && tagList.removeNext();

    this.notify("onKeyDown", [e]);
  },

  change: function (data) {
    this.notify("onChange", [data]);
    this.props.searchTerm && this.notify("onSearch", [""]);
  },

  open: function () {
    if (!(this.props.disabled === true || this.props.readOnly === true)) this.notify("onToggle", true);
  },

  close: function () {
    this.notify("onToggle", false);
  },

  toggle: function (e) {
    this.props.open ? this.close() : this.open();
  },

  process: function (data, values, searchTerm) {
    var _this = this;

    var items = data.filter(function (i) {
      return !values.some(_this._valueMatcher.bind(null, i), _this);
    }, this);

    if (searchTerm) items = this.filter(items, searchTerm);

    return items;
  },

  _shouldShowCreate: function () {
    var _this = this;

    var text = this.props.searchTerm;

    if (!this.props.onCreate || !text) return false;

    // if there is an exact match on textFields: "john" => { name: "john" }, don't show
    return !this._data().some(function (v) {
      return _this._dataText(v) === text;
    }) && !this.state.dataItems.some(function (v) {
      return _this._dataText(v) === text;
    });
  },

  _placeholder: function () {
    return (this.props.value || []).length ? "" : this.props.placeholder || "";
  }

});

module.exports = createUncontrolledWidget(Multiselect, { open: "onToggle", value: "onChange", searchTerm: "onSearch" });

// function defaultChange(){
//   if ( this.props.searchTerm === undefined )
//     this.setState({ searchTerm: '' })
// }

module.exports.BaseMultiselect = Multiselect;

},{"./List":12,"./ListGroupable":13,"./MultiselectInput":16,"./MultiselectTagList":17,"./Popup":20,"./mixins/DataFilterMixin":28,"./mixins/DataHelpersMixin":29,"./mixins/PopupScrollToMixin":31,"./mixins/RtlParentContextMixin":34,"./mixins/TimeoutMixin":35,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/propTypes":55,"./util/validateListInterface":57,"classnames":59,"react":undefined,"uncontrollable":72}],16:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    compat = require("./util/compat");

module.exports = React.createClass({

  displayName: "MultiselectInput",

  propTypes: {
    value: React.PropTypes.string,
    maxLength: React.PropTypes.number,
    onChange: React.PropTypes.func.isRequired,
    onFocus: React.PropTypes.func,

    disabled: React.PropTypes.bool,
    readOnly: React.PropTypes.bool },

  componentDidUpdate: function () {
    this.props.focused && this.focus();
  },

  render: function () {
    var value = this.props.value,
        placeholder = this.props.placeholder,
        size = Math.max((value || placeholder).length, 1) + 1;

    return React.createElement("input", babelHelpers._extends({}, this.props, {
      type: "text",
      className: "rw-input",
      "aria-disabled": this.props.disabled,
      "aria-readonly": this.props.readOnly,
      disabled: this.props.disabled,
      readOnly: this.props.readOnly,
      size: size }));
  },

  focus: function () {
    compat.findDOMNode(this).focus();
  }

});

},{"./util/babelHelpers.js":38,"./util/compat":40,"react":undefined}],17:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    _ = require("./util/_"),
    cx = require("classnames"),
    Btn = require("./WidgetButton"),
    CustomPropTypes = require("./util/propTypes");

module.exports = React.createClass({

  displayName: "MultiselectTagList",

  mixins: [require("./mixins/DataHelpersMixin"), require("./mixins/PureRenderMixin")],

  propTypes: {
    value: React.PropTypes.array,

    valueField: React.PropTypes.string,
    textField: CustomPropTypes.accessor,

    valueComponent: React.PropTypes.func,

    disabled: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.array, React.PropTypes.oneOf(["disabled"])]),

    readOnly: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.array, React.PropTypes.oneOf(["readonly"])])
  },

  getInitialState: function () {
    return {
      focused: null
    };
  },

  render: function () {
    var _this = this;

    var ValueComponent = this.props.valueComponent,
        props = _.omit(this.props, ["value", "disabled", "readOnly"]),
        focusIdx = this.state.focused,
        value = this.props.value;

    return React.createElement(
      "ul",
      babelHelpers._extends({}, props, {
        className: "rw-multiselect-taglist" }),
      value.map(function (item, i) {
        var disabled = _this.isDisabled(item),
            readonly = _this.isReadOnly(item);

        return React.createElement(
          "li",
          { key: i,
            className: cx({
              "rw-state-focus": !disabled && focusIdx === i,
              "rw-state-disabled": disabled,
              "rw-state-readonly": readonly }) },
          ValueComponent ? React.createElement(ValueComponent, { item: item }) : _this._dataText(item),
          React.createElement(
            Btn,
            { tabIndex: "-1", onClick: !(disabled || readonly) && _this._delete.bind(null, item),
              "aria-disabled": disabled,
              disabled: disabled },
            "×",
            React.createElement(
              "span",
              { className: "rw-sr" },
              "Remove " + _this._dataText(item)
            )
          )
        );
      })
    );
  },

  _delete: function (val, e) {
    this.props.onDelete(val);
  },

  removeCurrent: function () {
    var val = this.props.value[this.state.focused];

    if (val && !(this.isDisabled(val) || this.isReadOnly(val))) this.props.onDelete(val);
  },

  isDisabled: function (val, isIdx) {
    if (isIdx) val = this.props.value[val];

    return this.props.disabled === true || this._dataIndexOf(this.props.disabled || [], val) !== -1;
  },

  isReadOnly: function (val, isIdx) {
    if (isIdx) val = this.props.value[val];

    return this.props.readOnly === true || this._dataIndexOf(this.props.readOnly || [], val) !== -1;
  },

  removeNext: function () {
    var val = this.props.value[this.props.value.length - 1];

    if (val && !(this.isDisabled(val) || this.isReadOnly(val))) this.props.onDelete(val);
  },

  clear: function () {
    this.setState({ focused: null });
  },

  first: function () {
    var idx = 0,
        l = this.props.value.length;

    while (idx < l && this.isDisabled(idx, true)) idx++;

    if (idx !== l) this.setState({ focused: idx });
  },

  last: function () {
    var idx = this.props.value.length - 1;

    while (idx > -1 && this.isDisabled(idx, true)) idx--;

    if (idx >= 0) this.setState({ focused: idx });
  },

  next: function () {
    var nextIdx = this.state.focused + 1,
        l = this.props.value.length;

    while (nextIdx < l && this.isDisabled(nextIdx, true)) nextIdx++;

    if (this.state.focused === null) return;

    if (nextIdx >= l) return this.clear();

    this.setState({ focused: nextIdx });
  },

  prev: function () {
    var nextIdx = this.state.focused;

    if (nextIdx === null) nextIdx = this.props.value.length;

    nextIdx--;

    while (nextIdx > -1 && this.isDisabled(nextIdx, true)) nextIdx--;

    if (nextIdx >= 0) this.setState({ focused: nextIdx });
  }
});

},{"./WidgetButton":25,"./mixins/DataHelpersMixin":29,"./mixins/PureRenderMixin":32,"./util/_":37,"./util/babelHelpers.js":38,"./util/propTypes":55,"classnames":59,"react":undefined}],18:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    CustomPropTypes = require("./util/propTypes"),
    config = require("./util/configuration");

module.exports = React.createClass({

  displayName: "NumberPickerInput",

  propTypes: {
    value: React.PropTypes.number,

    format: CustomPropTypes.localeFormat.isRequired,
    parse: React.PropTypes.func.isRequired,
    culture: React.PropTypes.string,

    min: React.PropTypes.number,

    onChange: React.PropTypes.func.isRequired,
    onKeyDown: React.PropTypes.func },

  getDefaultProps: function () {
    return {
      value: null,
      format: "d",
      editing: false,
      parse: function (number, culture) {
        return config.globalize.parseFloat(number, 10, culture);
      }
    };
  },

  getDefaultState: function (props) {
    var value = props.editing ? props.value : formatNumber(props.value, props.format, props.culture);

    if (value == null || isNaN(props.value)) value = "";

    return {
      stringValue: "" + value
    };
  },

  getInitialState: function () {
    return this.getDefaultState(this.props);
  },

  componentWillReceiveProps: function (nextProps) {
    this.setState(this.getDefaultState(nextProps));
  },

  render: function () {
    var value = this.state.stringValue;

    return React.createElement("input", babelHelpers._extends({}, this.props, {
      type: "text",
      className: "rw-input",
      onChange: this._change,
      onBlur: this._finish,
      "aria-disabled": this.props.disabled,
      "aria-readonly": this.props.readOnly,
      disabled: this.props.disabled,
      readOnly: this.props.readOnly,
      value: value }));
  },

  _change: function (e) {
    var val = e.target.value,
        number = this.props.parse(e.target.value, this.props.culture),
        hasMin = this.props.min && isFinite(this.props.min);

    if (val == null || val.trim() === "") return this.props.onChange(null);

    if (this.isValid(number) && number !== this.props.value && !this.isAtDelimiter(number, val)) return this.props.onChange(number);

    //console.log(val !== 0 && !val)
    this.current(e.target.value);
  },

  _finish: function (e) {
    var str = this.state.stringValue,
        number = this.props.parse(str, this.props.culture);

    // if number is below the min
    // we need to flush low values and decimal stops, onBlur means i'm done inputing
    if (!isNaN(number) && (number < this.props.min || this.isAtDelimiter(number, str))) {
      this.props.onChange(number);
    }
  },

  isAtDelimiter: function (num, str) {
    var next;

    if (str.length <= 1) return false;

    next = this.props.parse(str.substr(0, str.length - 1), this.props.culture);

    return typeof next === "number" && !isNaN(next) && next === num;
  },

  isValid: function (num) {
    if (typeof num !== "number" || isNaN(num)) return false;
    return num >= this.props.min;
  },

  //this intermediate state is for when one runs into the decimal or are typing the number
  current: function (val) {
    this.setState({ stringValue: val });
  }

});

function parseLocaleFloat(number, parser, culture) {
  if (typeof format === "function") return format(number, culture);

  return config.globalize.parseFloat(number, 10, culture);
}

function formatNumber(number, format, culture) {
  if (typeof format === "function") return format(number, culture);

  return config.globalize.format(number, format, culture);
}

},{"./util/babelHelpers.js":38,"./util/configuration":41,"./util/propTypes":55,"react":undefined}],19:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    cx = require("classnames"),
    _ = require("./util/_") //omit
,
    compat = require("./util/compat"),
    CustomPropTypes = require("./util/propTypes"),
    createUncontrolledWidget = require("uncontrollable"),
    directions = require("./util/constants").directions,
    repeater = require("./util/repeater"),
    Input = require("./NumberInput");

var Btn = require("./WidgetButton"),
    propTypes = {

  // -- controlled props -----------
  value: React.PropTypes.number,
  onChange: React.PropTypes.func,
  //------------------------------------

  min: React.PropTypes.number,
  max: React.PropTypes.number,
  step: React.PropTypes.number,

  culture: React.PropTypes.string,

  format: CustomPropTypes.localeFormat,

  name: React.PropTypes.string,

  parse: React.PropTypes.func,

  disabled: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["disabled"])]),

  readOnly: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["readOnly"])]),

  messages: React.PropTypes.shape({
    increment: React.PropTypes.string,
    decrement: React.PropTypes.string
  })
};

var NumberPicker = React.createClass({

  displayName: "NumberPicker",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/TimeoutMixin"), require("./mixins/PureRenderMixin"), require("./mixins/RtlParentContextMixin")],

  propTypes: propTypes,

  getDefaultProps: function () {
    return {
      value: null,
      open: false,

      format: "d",

      min: -Infinity,
      max: Infinity,
      step: 1,

      messages: {
        increment: "increment value",
        decrement: "decrement value"
      }
    };
  },

  getInitialState: function () {
    return {
      focused: false,
      active: false };
  },

  render: function () {
    var _$omit = _.omit(this.props, Object.keys(propTypes));

    var className = _$omit.className;
    var onKeyDown = _$omit.onKeyDown;
    var onKeyPress = _$omit.onKeyPress;
    var onKeyUp = _$omit.onKeyUp;
    var props = babelHelpers.objectWithoutProperties(_$omit, ["className", "onKeyDown", "onKeyPress", "onKeyUp"]);
    var val = this.constrainValue(this.props.value);

    return React.createElement(
      "div",
      babelHelpers._extends({}, props, {
        ref: "element",
        onKeyDown: this._keyDown,
        onFocus: this._focus.bind(null, true),
        onBlur: this._focus.bind(null, false),
        tabIndex: "-1",
        className: cx(className, "rw-numberpicker", "rw-widget", {
          "rw-state-focus": this.state.focused,
          "rw-state-disabled": this.props.disabled,
          "rw-state-readonly": this.props.readOnly,
          "rw-rtl": this.isRtl()
        }) }),
      React.createElement(
        "span",
        { className: "rw-select" },
        React.createElement(
          Btn,
          {
            tabIndex: "-1",
            className: cx({ "rw-state-active": this.state.active === directions.UP }),
            onMouseDown: this._mouseDown.bind(null, directions.UP),
            onMouseUp: this._mouseUp.bind(null, directions.UP),
            onClick: this._focus.bind(null, true),
            disabled: val === this.props.max || this.props.disabled,
            "aria-disabled": val === this.props.max || this.props.disabled },
          React.createElement(
            "i",
            { className: "rw-i rw-i-caret-up" },
            React.createElement(
              "span",
              { className: "rw-sr" },
              this.props.messages.increment
            )
          )
        ),
        React.createElement(
          Btn,
          {
            tabIndex: "-1",
            className: cx({ "rw-state-active": this.state.active === directions.DOWN }),
            onMouseDown: this._mouseDown.bind(null, directions.DOWN),
            onMouseUp: this._mouseUp.bind(null, directions.DOWN),
            onClick: this._focus.bind(null, true),
            disabled: val === this.props.min || this.props.disabled,
            "aria-disabled": val === this.props.min || this.props.disabled },
          React.createElement(
            "i",
            { className: "rw-i rw-i-caret-down" },
            React.createElement(
              "span",
              { className: "rw-sr" },
              this.props.messages.decrement
            )
          )
        )
      ),
      React.createElement(Input, {
        ref: "input",
        value: val,
        editing: this.state.focused,
        format: this.props.format,
        parse: this.props.parse,
        name: this.props.name,
        role: "spinbutton",
        min: this.props.min,
        "aria-valuenow": val,
        "aria-valuemin": isFinite(this.props.min) ? this.props.min : null,
        "aria-valuemax": isFinite(this.props.max) ? this.props.max : null,
        "aria-disabled": this.props.disabled,
        "aria-readonly": this.props.readonly,
        disabled: this.props.disabled,
        readOnly: this.props.readOnly,
        onChange: this.change,
        onKeyDown: onKeyDown,
        onKeyPress: onKeyPress,
        onKeyUp: onKeyUp })
    );
  },

  //allow for styling, focus stealing keeping me from the normal what have you
  _mouseDown: _.ifNotDisabled(function (dir) {
    var val = dir === directions.UP ? (this.props.value || 0) + this.props.step : (this.props.value || 0) - this.props.step;

    val = this.constrainValue(val);

    this.setState({ active: dir });
    this.change(val);

    if (!(dir === directions.UP && val === this.props.max || dir === directions.DOWN && val === this.props.min)) {
      if (!this._cancelRepeater) this._cancelRepeater = repeater(this._mouseDown.bind(null, dir));
    } else this._mouseUp();
  }),

  _mouseUp: _.ifNotDisabled(function (direction, e) {
    this.setState({ active: false });
    this._cancelRepeater && this._cancelRepeater();
    this._cancelRepeater = null;
  }),

  _focus: _.ifNotDisabled(true, function (focused, e) {
    var _this = this;

    focused && compat.findDOMNode(this.refs.input).focus();

    this.setTimeout("focus", function () {
      if (focused !== _this.state.focused) {
        _this.notify(focused ? "onFocus" : "onBlur", e);
        _this.setState({ focused: focused });
      }
    }, 0);
  }),

  _keyDown: _.ifNotDisabled(function (e) {
    var key = e.key;

    if (key === "End" && isFinite(this.props.max)) this.change(this.props.max);else if (key === "Home" && isFinite(this.props.min)) this.change(this.props.min);else if (key === "ArrowDown") {
      e.preventDefault();
      this.decrement();
    } else if (key === "ArrowUp") {
      e.preventDefault();
      this.increment();
    }
  }),

  increment: function () {
    this.change(this.constrainValue((this.props.value || 0) + this.props.step));
  },

  decrement: function () {
    this.change(this.constrainValue((this.props.value || 0) - this.props.step));
  },

  change: function (val) {
    val = this.constrainValue(val);

    if (this.props.value !== val) this.notify("onChange", val);
  },

  constrainValue: function (value) {
    var max = this.props.max == null ? Infinity : this.props.max,
        min = this.props.min == null ? -Infinity : this.props.min;

    if (value == null || value === "") return null;

    return Math.max(Math.min(value, max), min);
  }

});

module.exports = createUncontrolledWidget(NumberPicker, { value: "onChange" });

module.exports.BaseNumberPicker = NumberPicker;

},{"./NumberInput":18,"./WidgetButton":25,"./mixins/PureRenderMixin":32,"./mixins/RtlParentContextMixin":34,"./mixins/TimeoutMixin":35,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/constants":42,"./util/propTypes":55,"./util/repeater":56,"classnames":59,"react":undefined,"uncontrollable":72}],20:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    $ = require("./util/dom"),
    config = require("./util/configuration"),
    cn = require("classnames"),
    compat = require("./util/compat");

var transform = config.animate.transform,
    support = !!config.animate.endEvent;

function properties(prop, value) {
  var TRANSLATION_MAP = config.animate.TRANSLATION_MAP;

  if (TRANSLATION_MAP && TRANSLATION_MAP[prop]) return (function () {
    var _ref = {};
    _ref[transform] = "" + TRANSLATION_MAP[prop] + "(" + value + ")";
    return _ref;
  })();

  return (function () {
    var _ref2 = {};
    _ref2[prop] = value;
    return _ref2;
  })();
}

var PopupContent = React.createClass({
  displayName: "PopupContent",

  render: function () {
    var child = this.props.children;

    if (!child) return React.createElement("span", { className: "rw-popup rw-widget" });

    child = React.Children.only(this.props.children);

    return compat.cloneElement(child, {
      className: cn(child.props.className, "rw-popup rw-widget")
    });
  }
});

module.exports = React.createClass({

  displayName: "Popup",

  propTypes: {
    open: React.PropTypes.bool,
    dropUp: React.PropTypes.bool,
    duration: React.PropTypes.number,

    onRequestClose: React.PropTypes.func.isRequired,
    onClosing: React.PropTypes.func,
    onOpening: React.PropTypes.func,
    onClose: React.PropTypes.func,
    onOpen: React.PropTypes.func
  },

  getInitialState: function () {
    return {};
  },

  getDefaultProps: function () {
    return {
      duration: 200,
      open: false,
      onClosing: function () {},
      onOpening: function () {},
      onClose: function () {},
      onOpen: function () {} };
  },

  // componentDidMount(){
  //   !this.props.open && this.close(0)
  // },
  componentWillMount: function () {
    !this.props.open && (this._initialPosition = true);
  },

  componentWillReceiveProps: function (nextProps) {
    this.setState({
      contentChanged: childKey(nextProps.children) !== childKey(this.props.children)
    });
  },

  componentDidUpdate: function (pvProps, pvState) {
    var closing = pvProps.open && !this.props.open,
        opening = !pvProps.open && this.props.open,
        open = this.props.open;

    if (opening) this.open();else if (closing) this.close();else if (open) this.height();
  },

  render: function () {
    var _props = this.props;
    var className = _props.className;
    var open = _props.open;
    var dropUp = _props.dropUp;
    var props = babelHelpers.objectWithoutProperties(_props, ["className", "open", "dropUp"]);
    var display = open ? "block" : void 0;
    var styles = {};

    if (this._initialPosition) {
      display = "none";
    }

    return React.createElement(
      "div",
      babelHelpers._extends({}, props, {
        style: babelHelpers._extends({
          display: display,
          height: this.state.height }, props.style),
        className: cn(className, "rw-popup-container", { "rw-dropup": dropUp })
      }),
      React.createElement(
        PopupContent,
        { ref: "content" },
        this.props.children
      )
    );
  },

  reset: function () {
    var container = compat.findDOMNode(this),
        content = compat.findDOMNode(this.refs.content),
        style = { display: "block", overflow: "hidden" };

    $.css(container, style);
    this.height();
    $.css(content, properties("top", this.props.dropUp ? "100%" : "-100%"));
  },

  height: function () {
    var el = compat.findDOMNode(this),
        content = compat.findDOMNode(this.refs.content),
        margin = parseInt($.css(content, "margin-top"), 10) + parseInt($.css(content, "margin-bottom"), 10);

    var height = $.height(content) + (isNaN(margin) ? 0 : margin);

    if (this.state.height !== height) {
      el.style.height = height + "px";
      this.setState({ height: height });
    }
  },

  open: function () {
    var self = this,
        anim = compat.findDOMNode(this),
        el = compat.findDOMNode(this.refs.content);

    this.ORGINAL_POSITION = $.css(el, "position");
    this._isOpening = true;

    if (this._initialPosition) {
      this._initialPosition = false;
      this.reset();
    } else this.height();

    this.props.onOpening();

    anim.className += " rw-popup-animating";
    el.style.position = "absolute";

    config.animate(el, { top: 0 }, self.props.duration, "ease", function () {
      if (!self._isOpening) return;

      anim.className = anim.className.replace(/ ?rw-popup-animating/g, "");

      el.style.position = self.ORGINAL_POSITION;
      anim.style.overflow = "visible";
      self.ORGINAL_POSITION = null;

      self.props.onOpen();
    });
  },

  close: function (dur) {
    var self = this,
        el = compat.findDOMNode(this.refs.content),
        anim = compat.findDOMNode(this);

    this.ORGINAL_POSITION = $.css(el, "position");

    this._isOpening = false;
    this.height();
    this.props.onClosing();

    anim.style.overflow = "hidden";
    anim.className += " rw-popup-animating";
    el.style.position = "absolute";

    config.animate(el, { top: this.props.dropUp ? "100%" : "-100%" }, dur === undefined ? this.props.duration : dur, "ease", function () {
      if (self._isOpening) return;

      el.style.position = self.ORGINAL_POSITION;
      anim.className = anim.className.replace(/ ?rw-popup-animating/g, "");

      anim.style.display = "none";
      self.ORGINAL_POSITION = null;
      self.props.onClose();
    });
  }

});

function childKey(children) {
  var nextChildMapping = React.Children.map(children, function (c) {
    return c;
  });
  for (var key in nextChildMapping) return key;
}

},{"./util/babelHelpers.js":38,"./util/compat":40,"./util/configuration":41,"./util/dom":49,"classnames":59,"react":undefined}],21:[function(require,module,exports){
/**
 * A streamlined version of TransitionGroup built for managing at most two active children
 * also provides additional hooks for animation start/end
 * https://github.com/facebook/react/blob/master/src/addons/transitions/ReactTransitionGroup.js
 * relevent code is licensed accordingly 
 */

"use strict";

var React = require("react"),
    $ = require("./util/dom"),
    compat = require("./util/compat"),
    _ = require("./util/_");

module.exports = React.createClass({

  displayName: "ReplaceTransitionGroup",

  propTypes: {
    component: React.PropTypes.oneOfType([React.PropTypes.element, React.PropTypes.string]),
    childFactory: React.PropTypes.func,

    onAnimating: React.PropTypes.func,
    onAnimate: React.PropTypes.func },

  getDefaultProps: function () {
    return {
      component: "span",
      childFactory: function (a) {
        return a;
      },

      onAnimating: _.noop,
      onAnimate: _.noop
    };
  },

  getInitialState: function () {
    return {
      children: _.splat(this.props.children)
    };
  },

  componentWillReceiveProps: function (nextProps) {
    var nextChild = getChild(nextProps.children),
        stack = this.state.children.slice(),
        next = stack[1],
        last = stack[0];

    var isLastChild = last && key(last) === key(nextChild),
        isNextChild = next && key(next) === key(nextChild);

    //no children
    if (!last) {
      stack.push(nextChild);
      this.entering = nextChild;
    } else if (last && !next && !isLastChild) {
      //new child
      stack.push(nextChild);
      this.leaving = last;
      this.entering = nextChild;
    } else if (last && next && !isLastChild && !isNextChild) {
      // the child is not the current one, exit the current one, add the new one
      //  - shift the stack down
      stack.shift();
      stack.push(nextChild);
      this.leaving = next;
      this.entering = nextChild;
    }
    //new child that just needs to be re-rendered
    else if (isLastChild) stack.splice(0, 1, nextChild);else if (isNextChild) stack.splice(1, 1, nextChild);

    if (this.state.children[0] !== stack[0] || this.state.children[1] !== stack[1]) this.setState({ children: stack });
  },

  componentWillMount: function () {
    this.animatingKeys = {};
    this.leaving = null;
    this.entering = null;
  },

  componentDidUpdate: function () {
    var entering = this.entering,
        leaving = this.leaving,
        first = this.refs[key(entering) || key(leaving)],
        node = compat.findDOMNode(this),
        el = first && compat.findDOMNode(first);

    if (el) $.css(node, {
      overflow: "hidden",
      height: $.height(el) + "px",
      width: $.width(el) + "px"
    });

    this.props.onAnimating();

    this.entering = null;
    this.leaving = null;

    if (entering) this.performEnter(key(entering));
    if (leaving) this.performLeave(key(leaving));
  },

  performEnter: function (key) {
    var component = this.refs[key];

    if (!component) return;

    this.animatingKeys[key] = true;

    if (component.componentWillEnter) component.componentWillEnter(this._handleDoneEntering.bind(this, key));else this._handleDoneEntering(key);
  },

  _tryFinish: function () {

    if (this.isTransitioning()) return;

    if (this.isMounted()) $.css(compat.findDOMNode(this), { overflow: "visible", height: "", width: "" });

    this.props.onAnimate();
  },

  _handleDoneEntering: function (enterkey) {
    var component = this.refs[enterkey];

    if (component && component.componentDidEnter) component.componentDidEnter();

    delete this.animatingKeys[enterkey];

    if (key(this.props.children) !== enterkey) this.performLeave(enterkey); // This was removed before it had fully entered. Remove it.

    this._tryFinish();
  },

  isTransitioning: function () {
    return Object.keys(this.animatingKeys).length !== 0;
  },

  performLeave: function (key) {
    var component = this.refs[key];

    if (!component) return;

    this.animatingKeys[key] = true;

    if (component.componentWillLeave) component.componentWillLeave(this._handleDoneLeaving.bind(this, key));else this._handleDoneLeaving(key);
  },

  _handleDoneLeaving: function (leavekey) {
    var component = this.refs[leavekey];

    if (component && component.componentDidLeave) component.componentDidLeave();

    delete this.animatingKeys[leavekey];

    if (key(this.props.children) === leavekey) this.performEnter(leavekey);else if (this.isMounted()) this.setState({
      children: this.state.children.filter(function (c) {
        return key(c) !== leavekey;
      })
    });

    this._tryFinish();
  },

  render: function () {
    var _this = this;

    var Component = this.props.component;
    return React.createElement(
      Component,
      this.props,
      this.state.children.map(function (c) {
        return _this.props.childFactory(c, key(c));
      })
    );
  }
});

function getChild(children) {
  return React.Children.only(children);
}

function key(child) {
  return child && child.key;
}
// This entered again before it fully left. Add it again.

},{"./util/_":37,"./util/compat":40,"./util/dom":49,"react":undefined}],22:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    _ = require("./util/_"),
    cx = require("classnames"),
    createUncontrolledWidget = require("uncontrollable"),
    compat = require("./util/compat"),
    CustomPropTypes = require("./util/propTypes"),
    PlainList = require("./List"),
    GroupableList = require("./ListGroupable"),
    validateList = require("./util/validateListInterface"),
    scrollTo = require("./util/dom/scroll");

var propTypes = {

  data: React.PropTypes.array,
  value: React.PropTypes.oneOfType([React.PropTypes.any, React.PropTypes.array]),
  onChange: React.PropTypes.func,
  onMove: React.PropTypes.func,

  multiple: React.PropTypes.bool,

  itemComponent: CustomPropTypes.elementType,
  listComponent: CustomPropTypes.elementType,

  valueField: React.PropTypes.string,
  textField: CustomPropTypes.accessor,

  busy: React.PropTypes.bool,

  filter: React.PropTypes.string,
  delay: React.PropTypes.number,

  disabled: React.PropTypes.oneOfType([React.PropTypes.array, React.PropTypes.bool, React.PropTypes.oneOf(["disabled"])]),

  readOnly: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.array, React.PropTypes.oneOf(["readonly"])]),

  messages: React.PropTypes.shape({
    emptyList: React.PropTypes.string
  }) };

var SelectList = React.createClass({
  displayName: "SelectList",

  propTypes: propTypes,

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/TimeoutMixin"), require("./mixins/DataHelpersMixin"), require("./mixins/RtlParentContextMixin")],

  getDefaultProps: function () {
    return {
      delay: 250,
      value: [],
      data: [],
      messages: {
        emptyList: "There are no items in this list"
      }
    };
  },

  getDefaultState: function (props) {
    var _this = this;

    var isRadio = !props.multiple,
        values = _.splat(props.value),
        first = isRadio && this._dataItem(props.data, values[0]);

    first = isRadio && first ? first : (this.state || {}).focusedItem || null;

    return {
      focusedItem: first,
      dataItems: !isRadio && values.map(function (item) {
        return _this._dataItem(props.data, item);
      })
    };
  },

  getInitialState: function () {
    var state = this.getDefaultState(this.props);

    state.ListItem = getListItem(this);

    return state;
  },

  componentWillReceiveProps: function (nextProps) {
    return this.setState(this.getDefaultState(nextProps));
  },

  componentDidMount: function () {
    validateList(this.refs.list);
  },

  render: function () {
    var _$omit = _.omit(this.props, Object.keys(propTypes));

    var className = _$omit.className;
    var props = babelHelpers.objectWithoutProperties(_$omit, ["className"]);
    var focus = this._maybeHandle(this._focus.bind(null, true), true);
    var optID = this._id("_selected_option");
    var blur = this._focus.bind(null, false);
    var List = this.props.listComponent || this.props.groupBy && GroupableList || PlainList;
    var focusedItem = this.state.focused && !this.isDisabled() && !this.isReadOnly() && this.state.focusedItem;

    return React.createElement(
      "div",
      babelHelpers._extends({}, props, {
        onKeyDown: this._maybeHandle(this._keyDown),
        onFocus: focus,
        onBlur: blur,
        tabIndex: "0",
        role: "listbox",
        "aria-busy": !!this.props.busy,
        "aria-activedescendent": this.state.focused ? optID : undefined,
        "aria-disabled": this.isDisabled(),
        "aria-readonly": this.isReadOnly(),
        className: cx(className, "rw-widget", "rw-selectlist", {
          "rw-state-focus": this.state.focused,
          "rw-state-disabled": this.isDisabled(),
          "rw-state-readonly": this.isReadOnly(),
          "rw-rtl": this.isRtl(),
          "rw-loading-mask": this.props.busy
        }) }),
      React.createElement(List, babelHelpers._extends({ ref: "list"
      }, _.pick(this.props, Object.keys(compat.type(List).propTypes)), {
        data: this._data(),
        focused: focusedItem,
        optID: optID,
        itemComponent: this.state.ListItem,
        onMove: this._scrollTo }))
    );
  },

  _scrollTo: function (selected, list) {
    var handler = this.props.onMove;

    if (handler) handler(selected, list);else {
      this._scrollCancel && this._scrollCancel();
      // default behavior is to scroll the whole page not just the widget
      this._scrollCancel = scrollTo(selected);
    }
  },

  _keyDown: function (e) {
    var self = this,
        key = e.key,
        multiple = !!this.props.multiple,
        list = this.refs.list,
        focusedItem = this.state.focusedItem;

    if (key === "End") {
      e.preventDefault();

      if (multiple) this.setState({ focusedItem: move("prev", null) });else change(move("prev", null));
    } else if (key === "Home") {
      e.preventDefault();

      if (multiple) this.setState({ focusedItem: move("next", null) });else change(move("next", null));
    } else if (key === "Enter" || key === " ") {
      e.preventDefault();
      change(focusedItem);
    } else if (key === "ArrowDown" || key === "ArrowRight") {
      e.preventDefault();

      if (multiple) this.setState({ focusedItem: move("next", focusedItem) });else change(move("next", focusedItem));
    } else if (key === "ArrowUp" || key === "ArrowLeft") {
      e.preventDefault();

      if (multiple) this.setState({ focusedItem: move("prev", focusedItem) });else change(move("prev", focusedItem));
    } else if (this.props.multiple && e.keyCode === 65 && e.ctrlKey) {
      e.preventDefault();
      this._selectAll();
    } else this.search(String.fromCharCode(e.keyCode));

    function change(item, cked) {
      if (item) {
        self._change(item, multiple ? !self._contains(item, self._values()) // toggle value
        : true);
      }
    }

    function move(dir, item) {
      var isDisabled = function (item) {
        return self.isDisabledItem(item) || self.isReadOnlyItem(item);
      },
          stop = dir === "next" ? list.last() : list.first(),
          next = list[dir](item);

      while (next !== stop && isDisabled(next)) next = list[dir](next);

      return isDisabled(next) ? item : next;
    }
  },

  _selectAll: function () {
    var _this = this;

    var values = this.state.dataItems,
        disabled = this.props.disabled || this.props.readOnly,
        data = this._data(),
        blacklist;

    disabled = Array.isArray(disabled) ? disabled : [];
    //disabled values that are not selected
    blacklist = disabled.filter(function (v) {
      return !_this._contains(v, values);
    });
    data = data.filter(function (v) {
      return !_this._contains(v, blacklist);
    });

    if (data.length === values.length) {
      data = disabled.filter(function (v) {
        return _this._contains(v, values);
      });
      data = data.map(function (v) {
        return _this._dataItem(_this._data(), v);
      });
    }

    this.notify("onChange", [data]);
  },

  _change: function (item, checked) {
    var multiple = !!this.props.multiple,
        blacklist = this.props.disabled || this.props.readOnly,
        values = this.state.dataItems;

    blacklist = Array.isArray(blacklist) ? blacklist : [];

    //if(this._contains(item, blacklist)) return

    if (!multiple) return this.notify("onChange", checked ? item : null);

    values = checked ? values.concat(item) : values.filter(function (v) {
      return v !== item;
    });

    this.notify("onChange", [values || []]);
  },

  _focus: function (focused, e) {
    var _this = this;

    if (focused) compat.findDOMNode(this).focus();

    this.setTimeout("focus", function () {
      if (focused !== _this.state.focused) {
        _this.notify(focused ? "onFocus" : "onBlur", e);
        _this.setState({ focused: focused });
      }
    });
  },

  isDisabledItem: function (item) {
    return this.isDisabled() || this._contains(item, this.props.disabled);
  },

  isReadOnlyItem: function (item) {
    return this.isReadOnly() || this._contains(item, this.props.readOnly);
  },

  search: function (character) {
    var _this = this;

    var word = ((this._searchTerm || "") + character).toLowerCase(),
        list = this.refs.list;

    this._searchTerm = word;

    this.setTimeout("search", function () {
      var focusedItem = list.next(_this.state.focusedItem, word);

      _this._searchTerm = "";

      if (focusedItem) _this.setState({ focusedItem: focusedItem });
    }, this.props.delay);
  },

  _data: function () {
    return this.props.data;
  },

  _contains: function (item, values) {
    return Array.isArray(values) ? values.some(this._valueMatcher.bind(null, item)) : this._valueMatcher(item, values);
  },

  _values: function () {
    return !!this.props.multiple ? this.state.dataItems : this.props.value;
  }

});

function getListItem(parent) {

  return React.createClass({

    displayName: "SelectItem",

    render: function () {
      var item = this.props.item,
          checked = parent._contains(item, parent._values()),
          change = parent._change.bind(null, item),
          disabled = parent.isDisabledItem(item),
          readonly = parent.isReadOnlyItem(item),
          Component = parent.props.itemComponent,
          name = parent.props.name || parent._id("_name");

      return React.createElement(
        "label",
        {
          className: cx({
            "rw-state-disabled": disabled,
            "rw-state-readonly": readonly
          }) },
        React.createElement("input", babelHelpers._extends({}, this.props, {
          tabIndex: "-1",
          name: name,
          type: parent.props.multiple ? "checkbox" : "radio",

          onChange: onChange,
          checked: checked,
          disabled: disabled || readonly,
          "aria-disabled": disabled || readonly })),
        Component ? React.createElement(Component, { item: item }) : parent._dataText(item)
      );

      function onChange(e) {
        if (!disabled && !readonly) change(e.target.checked);
      }
    }
  });
}

module.exports = createUncontrolledWidget(SelectList, { value: "onChange" });

module.exports.BaseSelectList = SelectList;

},{"./List":12,"./ListGroupable":13,"./mixins/DataHelpersMixin":29,"./mixins/RtlParentContextMixin":34,"./mixins/TimeoutMixin":35,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/dom/scroll":51,"./util/propTypes":55,"./util/validateListInterface":57,"classnames":59,"react":undefined,"uncontrollable":72}],23:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    ReplaceTransitionGroup = require("./ReplaceTransitionGroup"),
    _ = require("./util/_"),
    compat = require("./util/compat"),
    $ = require("./util/dom"),
    config = require("./util/configuration");

var SlideChildGroup = React.createClass({
  displayName: "SlideChildGroup",

  propTypes: {
    direction: React.PropTypes.oneOf(["left", "right"]),
    duration: React.PropTypes.number
  },

  componentWillEnter: function (done) {
    var _this = this;

    var node = compat.findDOMNode(this),
        width = $.width(node),
        direction = this.props.direction;

    width = direction === "left" ? width : -width;

    this.ORGINAL_POSITION = node.style.position;

    $.css(node, { position: "absolute", left: width + "px", top: 0 });

    config.animate(node, { left: 0 }, this.props.duration, function () {

      $.css(node, {
        position: _this.ORGINAL_POSITION,
        overflow: "hidden"
      });

      _this.ORGINAL_POSITION = null;
      done && done();
    });
  },

  componentWillLeave: function (done) {
    var _this = this;

    var node = compat.findDOMNode(this),
        width = $.width(node),
        direction = this.props.direction;

    width = direction === "left" ? -width : width;

    this.ORGINAL_POSITION = node.style.position;

    $.css(node, { position: "absolute", top: 0, left: 0 });

    config.animate(node, { left: width + "px" }, this.props.duration, function () {
      $.css(node, {
        position: _this.ORGINAL_POSITION,
        overflow: "hidden"
      });

      _this.ORGINAL_POSITION = null;
      done && done();
    });
  },

  render: function () {
    return React.Children.only(this.props.children);
  }

});

module.exports = React.createClass({
  displayName: "exports",

  propTypes: {
    direction: React.PropTypes.oneOf(["left", "right"]),
    duration: React.PropTypes.number
  },

  getDefaultProps: function () {
    return {
      direction: "left",
      duration: 250
    };
  },

  _wrapChild: function (child, ref) {
    return React.createElement(
      SlideChildGroup,
      { key: child.key, ref: ref,
        direction: this.props.direction,
        duration: this.props.duration },
      child
    );
  },

  render: function () {
    var _props = this.props;
    var style = _props.style;
    var children = _props.children;
    var props = babelHelpers.objectWithoutProperties(_props, ["style", "children"]);

    style = _.assign({}, style, { position: "relative", overflow: "hidden" });

    return React.createElement(
      ReplaceTransitionGroup,
      babelHelpers._extends({}, props, {
        ref: "container",
        childFactory: this._wrapChild,
        style: style,
        component: "div" }),
      children
    );
  },

  isTransitioning: function () {
    return this.isMounted() && this.refs.container.isTransitioning();
  }
});

},{"./ReplaceTransitionGroup":21,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/configuration":41,"./util/dom":49,"react":undefined}],24:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    dates = require("./util/dates"),
    List = require("./List"),
    compat = require("./util/compat"),
    CustomPropTypes = require("./util/propTypes"),
    _ = require("./util/_"); // omit

module.exports = React.createClass({

  displayName: "TimeList",

  propTypes: {
    value: React.PropTypes.instanceOf(Date),
    min: React.PropTypes.instanceOf(Date),
    max: React.PropTypes.instanceOf(Date),
    step: React.PropTypes.number,
    itemComponent: CustomPropTypes.elementType,
    onSelect: React.PropTypes.func,
    preserveDate: React.PropTypes.bool,
    culture: React.PropTypes.string },

  mixins: [require("./mixins/TimeoutMixin")],

  getDefaultProps: function () {
    return {
      step: 30,
      format: "t",
      onSelect: function () {},
      min: new Date(1900, 0, 1),
      max: new Date(2099, 11, 31),
      preserveDate: true,
      delay: 300
    };
  },

  getInitialState: function () {
    var data = this._dates(this.props),
        focusedItem = this._closestDate(data, this.props.value);

    return {
      focusedItem: focusedItem || data[0],
      dates: data
    };
  },

  componentWillReceiveProps: function (nextProps) {
    var data = this._dates(nextProps),
        focusedItem = this._closestDate(data, nextProps.value),
        valChanged = !dates.eq(nextProps.value, this.props.value, "minutes"),
        minChanged = !dates.eq(nextProps.min, this.props.min, "minutes"),
        maxChanged = !dates.eq(nextProps.max, this.props.max, "minutes");

    if (valChanged || minChanged || maxChanged) {
      this.setState({
        focusedItem: focusedItem || data[0],
        dates: data
      });
    }
  },

  render: function () {
    var times = this.state.dates,
        date = this._closestDate(times, this.props.value);

    return React.createElement(List, babelHelpers._extends({}, _.pick(this.props, Object.keys(compat.type(List).propTypes)), {
      ref: "list",
      data: times,
      textField: "label",
      valueField: "date",
      selected: date,
      focused: this.state.focusedItem,
      itemComponent: this.props.itemComponent,
      onSelect: this.props.onSelect }));
  },

  _closestDate: function (times, date) {
    var roundTo = 1000 * 60 * this.props.step,
        inst = null,
        label;

    if (!date) return null;

    date = new Date(Math.floor(date.getTime() / roundTo) * roundTo);
    label = dates.format(date, this.props.format, this.props.culture);

    times.some(function (time) {
      if (time.label === label) return inst = time;
    });

    return inst;
  },

  _data: function () {
    return this.state.dates;
  },

  _dates: function (props) {
    var times = [],
        i = 0,
        values = this._dateValues(props),
        start = values.min,
        startDay = dates.date(start);

    while (i < 100 && (dates.date(start) === startDay && dates.lte(start, values.max))) {
      i++;
      times.push({ date: start, label: dates.format(start, props.format, props.culture) });
      start = dates.add(start, props.step || 30, "minutes");
    }
    return times;
  },

  _dateValues: function (props) {
    var value = props.value || dates.today(),
        useDate = props.preserveDate,
        min = props.min,
        max = props.max,
        start,
        end;

    //compare just the time regradless of whether they fall on the same day
    if (!useDate) {
      start = dates.startOf(dates.merge(new Date(), min), "minutes");
      end = dates.startOf(dates.merge(new Date(), max), "minutes");

      if (dates.lte(end, start) && dates.gt(max, min, "day")) end = dates.tomorrow();

      return {
        min: start,
        max: end
      };
    }

    start = dates.today();
    end = dates.tomorrow();
    //date parts are equal
    return {
      min: dates.eq(value, min, "day") ? dates.merge(start, min) : start,
      max: dates.eq(value, max, "day") ? dates.merge(start, max) : end
    };
  },

  _keyDown: function (e) {
    var _this = this;

    var key = e.key,
        character = String.fromCharCode(e.keyCode),
        focusedItem = this.state.focusedItem,
        list = this.refs.list;

    if (key === "End") this.setState({ focusedItem: list.last() });else if (key === "Home") this.setState({ focusedItem: list.first() });else if (key === "Enter") this.props.onSelect(focusedItem);else if (key === "ArrowDown") {
      e.preventDefault();
      this.setState({ focusedItem: list.next(focusedItem) });
    } else if (key === "ArrowUp") {
      e.preventDefault();
      this.setState({ focusedItem: list.prev(focusedItem) });
    } else {
      e.preventDefault();

      this.search(character, function (item) {
        _this.setState({ focusedItem: item });
      });
    }
  },

  scrollTo: function () {
    this.refs.list.move && this.refs.list.move();
  },

  search: function (character, cb) {
    var _this = this;

    var word = ((this._searchTerm || "") + character).toLowerCase();

    this._searchTerm = word;

    this.setTimeout("search", function () {
      var list = _this.refs.list,
          item = list.next(_this.state.focusedItem, word);

      _this._searchTerm = "";
      if (item) cb(item);
    }, this.props.delay);
  } });

},{"./List":12,"./mixins/TimeoutMixin":35,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/dates":43,"./util/propTypes":55,"react":undefined}],25:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react");
var cn = require("classnames");
module.exports = React.createClass({
  displayName: "exports",

  render: function () {
    var _props = this.props;
    var className = _props.className;
    var children = _props.children;
    var props = babelHelpers.objectWithoutProperties(_props, ["className", "children"]);

    return React.createElement(
      "button",
      babelHelpers._extends({}, props, { type: "button", className: cn(className, "rw-btn") }),
      children
    );
  }
});

},{"./util/babelHelpers.js":38,"classnames":59,"react":undefined}],26:[function(require,module,exports){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react"),
    cx = require("classnames"),
    dates = require("./util/dates"),
    directions = require("./util/constants").directions,
    Btn = require("./WidgetButton"),
    _ = require("./util/_"),
    compat = require("./util/compat"),
    CustomPropTypes = require("./util/propTypes");

module.exports = React.createClass({

  displayName: "YearView",

  mixins: [require("./mixins/WidgetMixin"), require("./mixins/RtlChildContextMixin")],

  propTypes: {
    culture: React.PropTypes.string,
    value: React.PropTypes.instanceOf(Date),
    focused: React.PropTypes.instanceOf(Date),
    min: React.PropTypes.instanceOf(Date),
    max: React.PropTypes.instanceOf(Date),
    onChange: React.PropTypes.func.isRequired,

    monthFormat: CustomPropTypes.localeFormat.isRequired
  },

  render: function () {
    var props = _.omit(this.props, ["max", "min", "value", "onChange"]),
        months = dates.monthsInYear(dates.year(this.props.focused)),
        rows = _.chunk(months, 4);

    return React.createElement(
      "table",
      babelHelpers._extends({}, props, {
        role: "grid",
        className: "rw-calendar-grid rw-nav-view",
        "aria-activedescendant": this._id("_selected_item") }),
      React.createElement(
        "tbody",
        null,
        rows.map(this._row)
      )
    );
  },

  _row: function (row, i) {
    var _this = this;

    var id = this._id("_selected_item");

    return React.createElement(
      "tr",
      { key: i, role: "row" },
      row.map(function (date, i) {
        var focused = dates.eq(date, _this.props.focused, "month"),
            selected = dates.eq(date, _this.props.value, "month"),
            currentMonth = dates.eq(date, _this.props.today, "month");

        return dates.inRange(date, _this.props.min, _this.props.max, "month") ? React.createElement(
          "td",
          { key: i, role: "gridcell" },
          React.createElement(
            Btn,
            { onClick: _this.props.onChange.bind(null, date), tabIndex: "-1",
              id: focused ? id : undefined,
              "aria-pressed": selected,
              "aria-disabled": _this.props.disabled || undefined,
              disabled: _this.props.disabled,
              className: cx({
                "rw-state-focus": focused,
                "rw-state-selected": selected,
                "rw-now": currentMonth
              }) },
            dates.format(date, _this.props.monthFormat, _this.props.culture)
          )
        ) : React.createElement(
          "td",
          { key: i, className: "rw-empty-cell", role: "gridcell" },
          " "
        );
      })
    );
  }

});

},{"./WidgetButton":25,"./mixins/RtlChildContextMixin":33,"./mixins/WidgetMixin":36,"./util/_":37,"./util/babelHelpers.js":38,"./util/compat":40,"./util/constants":42,"./util/dates":43,"./util/propTypes":55,"classnames":59,"react":undefined}],27:[function(require,module,exports){
var configuration = require("./util/configuration");

module.exports = {

  setGlobalizeInstance: function (globalize) {
    configuration.globalize = globalize;
  },

  setAnimate: function (animatefn) {
    configuration.animate = animatefn;
  }

};

},{"./util/configuration":41}],28:[function(require,module,exports){
"use strict";
var React = require("react"),
    filters = require("../util/filter"),
    CustomPropTypes = require("../util/propTypes"),
    helper = require("./DataHelpersMixin");

var dflt = function (f) {
  return f === true ? "startsWith" : f ? f : "eq";
};

module.exports = {

  propTypes: {
    data: React.PropTypes.array,
    value: React.PropTypes.any,
    filter: CustomPropTypes.filter,
    caseSensitive: React.PropTypes.bool,
    minLength: React.PropTypes.number },

  getDefaultProps: function () {
    return {
      caseSensitive: false,
      minLength: 1
    };
  },

  filterIndexOf: function (items, searchTerm) {
    var idx = -1,
        matches = typeof this.props.filter === "function" ? this.props.filter : getFilter(filters[dflt(this.props.filter)], searchTerm, this);

    if (!searchTerm || !searchTerm.trim() || this.props.filter && searchTerm.length < (this.props.minLength || 1)) return -1;

    items.every(function (item, i) {
      if (matches(item, searchTerm, i)) return (idx = i, false);

      return true;
    });

    return idx;
  },

  filter: function (items, searchTerm) {
    var matches = typeof this.props.filter === "string" ? getFilter(filters[this.props.filter], searchTerm, this) : this.props.filter;

    if (!matches || !searchTerm || !searchTerm.trim() || searchTerm.length < (this.props.minLength || 1)) return items;

    return items.filter(function (item, idx) {
      return matches(item, searchTerm, idx);
    });
  }
};

function getFilter(matcher, searchTerm, ctx) {
  searchTerm = !ctx.props.caseSensitive ? searchTerm.toLowerCase() : searchTerm;

  return function (item) {
    var val = helper._dataText.call(ctx, item);

    if (!ctx.props.caseSensitive) val = val.toLowerCase();

    return matcher(val, searchTerm);
  };
}

},{"../util/filter":54,"../util/propTypes":55,"./DataHelpersMixin":29,"react":undefined}],29:[function(require,module,exports){
"use strict";
var React = require("react");
var propTypes = require("../util/propTypes");

var _require = require("../util/_");

var has = _require.has;
var isShallowEqual = _require.isShallowEqual;

function accessor(data, field) {
  var value = data;

  if (typeof field === "function") value = field(data);else if (data == null) value = data;else if (typeof field === "string" && typeof data === "object" && field in data) value = data[field];

  return value;
}

module.exports = {

  propTypes: {
    valueField: React.PropTypes.string,
    textField: propTypes.accessor },

  _dataValue: function (item) {
    var field = this.props.valueField;

    return field && item && has(item, field) ? item[field] : item;
  },

  _dataText: function (item) {
    var field = this.props.textField;

    return accessor(item, field) + "";
  },

  _dataIndexOf: function (data, item) {
    var _this = this;

    var idx = -1,
        len = data.length,
        finder = function (datum) {
      return _this._valueMatcher(item, datum);
    };

    while (++idx < len) if (finder(data[idx])) return idx;

    return -1;
  },

  _valueMatcher: function (a, b) {
    return isShallowEqual(this._dataValue(a), this._dataValue(b));
  },

  _dataItem: function (data, item) {
    var first = data[0],
        field = this.props.valueField,
        idx;

    // make an attempt to see if we were passed in dataItem vs just a valueField value
    // either an object with the right prop, or a primitive
    // { valueField: 5 } || "hello" [ "hello" ]
    if (has(item, field) || typeof first === typeof val) return item;

    idx = this._dataIndexOf(data, this._dataValue(item));

    if (idx !== -1) return data[idx];

    return item;
  }
};

},{"../util/_":37,"../util/propTypes":55,"react":undefined}],30:[function(require,module,exports){
"use strict";
var React = require("react"),
    _ = require("../util/_"),
    filter = require("../util/filter"),
    helper = require("./DataHelpersMixin");

module.exports = {

  propTypes: {
    textField: React.PropTypes.string },

  first: function () {
    return this._data()[0];
  },

  last: function () {
    var data = this._data();
    return data[data.length - 1];
  },

  prev: function (item, word) {
    var data = this._data(),
        idx = data.indexOf(item);

    if (idx === -1) idx = data.length;

    return word ? findPrevInstance(this, data, word, idx) : --idx < 0 ? data[0] : data[idx];
  },

  next: function (item, word) {
    var data = this._data(),
        idx = data.indexOf(item);

    return word ? findNextInstance(this, data, word, idx) : ++idx === data.length ? data[data.length - 1] : data[idx];
  }

};

function findNextInstance(ctx, data, word, startIndex) {
  var matches = filter.startsWith,
      idx = -1,
      len = data.length,
      foundStart,
      itemText;

  word = word.toLowerCase();

  while (++idx < len) {
    foundStart = foundStart || idx > startIndex;
    itemText = foundStart && helper._dataText.call(ctx, data[idx]).toLowerCase();

    if (foundStart && matches(itemText, word)) return data[idx];
  }
}

function findPrevInstance(ctx, data, word, startIndex) {
  var matches = filter.startsWith,
      idx = data.length,
      foundStart,
      itemText;

  word = word.toLowerCase();

  while (--idx >= 0) {
    foundStart = foundStart || idx < startIndex;
    itemText = foundStart && helper._dataText.call(ctx, data[idx]).toLowerCase();

    if (foundStart && matches(itemText, word)) return data[idx];
  }
}

},{"../util/_":37,"../util/filter":54,"./DataHelpersMixin":29,"react":undefined}],31:[function(require,module,exports){
"use strict";
var scrollTo = require("../util/dom/scroll");

module.exports = {

  _scrollTo: function (selected, list, focused) {
    var state = this._scrollState || (this._scrollState = {}),
        handler = this.props.onMove,
        lastVisible = state.visible,
        lastItem = state.focused,
        shown,
        changed;

    state.visible = !(!list.offsetWidth || !list.offsetHeight);
    state.focused = focused;

    changed = lastItem !== focused;
    shown = state.visible && !lastVisible;

    if (shown || state.visible && changed) {
      if (handler) handler(selected, list, focused);else {
        state.scrollCancel && state.scrollCancel();
        state.scrollCancel = scrollTo(selected, list);
      }
    }
  } };

},{"../util/dom/scroll":51}],32:[function(require,module,exports){
"use strict";
var _ = require("../util/_");

//backport PureRenderEqual
module.exports = {

  shouldComponentUpdate: function (nextProps, nextState) {
    return !_.isShallowEqual(this.props, nextProps) || !_.isShallowEqual(this.state, nextState);
  }
};

},{"../util/_":37}],33:[function(require,module,exports){
"use strict";
var React = require("react");

module.exports = {

  contextTypes: {
    isRtl: React.PropTypes.bool
  },

  isRtl: function () {
    return !!this.context.isRtl;
  }

};

},{"react":undefined}],34:[function(require,module,exports){
"use strict";
var React = require("react");

module.exports = {

  propTypes: {
    isRtl: React.PropTypes.bool
  },

  contextTypes: {
    isRtl: React.PropTypes.bool
  },

  childContextTypes: {
    isRtl: React.PropTypes.bool
  },

  getChildContext: function () {
    return {
      isRtl: this.props.isRtl || this.context && this.context.isRtl
    };
  },

  isRtl: function () {
    return !!(this.props.isRtl || this.context && this.context.isRtl);
  }

};

},{"react":undefined}],35:[function(require,module,exports){
"use strict";

var _require = require("../util/_");

var has = _require.has;

module.exports = {

  componentWillUnmount: function () {
    var timers = this._timers || {};

    this._unmounted = true;

    for (var k in timers) if (has(timers, k)) clearTimeout(timers[k]);
  },

  setTimeout: function (key, cb, duration) {
    var timers = this._timers || (this._timers = Object.create(null));

    if (this._unmounted) return;

    clearTimeout(timers[key]);
    timers[key] = setTimeout(cb, duration);
  }

};

},{"../util/_":37}],36:[function(require,module,exports){
"use strict";
var React = require("react"),
    _ = require("../util/_"); //uniqueID

module.exports = {

  propTypes: {

    disabled: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["disabled"])]),

    readOnly: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(["readOnly"])]) },

  isDisabled: function () {
    return this.props.disabled === true || this.props.disabled === "disabled";
  },

  isReadOnly: function () {
    return this.props.readOnly === true || this.props.readOnly === "readonly";
  },

  notify: function (handler, args) {
    this.props[handler] && this.props[handler].apply(null, [].concat(args));
  },

  _id: function (suffix) {
    this._id_ || (this._id_ = _.uniqueId("rw_"));
    return (this.props.id || this._id_) + suffix;
  },

  _maybeHandle: function (handler, disabledOnly) {
    if (!(this.isDisabled() || !disabledOnly && this.isReadOnly())) return handler;
    return function () {};
  } };

},{"../util/_":37,"react":undefined}],37:[function(require,module,exports){
"use strict";
var idCount = 0;

var _ = module.exports = {

  has: has,

  assign: require("react/lib/Object.assign"),

  isShallowEqual: function (a, b) {
    if (a === b) return true;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

    if (typeof a != "object" && typeof b != "object") return a === b;

    if (typeof a != typeof b) return false;

    return shallowEqual(a, b);
  },

  transform: function (obj, cb, seed) {
    _.each(obj, cb.bind(null, seed = seed || (Array.isArray(obj) ? [] : {})));
    return seed;
  },

  each: function (obj, cb, thisArg) {
    if (Array.isArray(obj)) return obj.forEach(cb, thisArg);

    for (var key in obj) if (has(obj, key)) cb.call(thisArg, obj[key], key, obj);
  },

  pick: function (obj, keys) {
    keys = [].concat(keys);
    return _.transform(obj, function (mapped, val, key) {
      if (keys.indexOf(key) !== -1) mapped[key] = val;
    }, {});
  },

  omit: function (obj, keys) {
    keys = [].concat(keys);
    return _.transform(obj, function (mapped, val, key) {
      if (keys.indexOf(key) === -1) mapped[key] = val;
    }, {});
  },

  find: function (arr, cb, thisArg) {
    var result;
    if (Array.isArray(arr)) {
      arr.every(function (val, idx) {
        if (cb.call(thisArg, val, idx, arr)) return (result = val, false);
        return true;
      });
      return result;
    } else for (var key in arr) if (has(arr, key)) if (cb.call(thisArg, arr[key], key, arr)) return arr[key];
  },

  chunk: function (array, chunkSize) {
    var index = 0,
        length = array ? array.length : 0,
        result = [];

    chunkSize = Math.max(+chunkSize || 1, 1);

    while (index < length) result.push(array.slice(index, index += chunkSize));

    return result;
  },

  splat: function (obj) {
    return obj == null ? [] : [].concat(obj);
  },

  noop: function () {},

  uniqueId: function (prefix) {
    return "" + ((prefix == null ? "" : prefix) + ++idCount);
  },

  //-- Really specific Component Utilities --

  isFirstFocusedRender: function (component) {
    return component._firstFocus || component.state.focused && (component._firstFocus = true);
  },

  ifNotDisabled: function (disabledOnly, fn) {
    if (arguments.length === 1) fn = disabledOnly, disabledOnly = false;

    //console.log('create method')
    return function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      //console.log('called', disabledOnly)
      if (!(this.isDisabled() || !disabledOnly && this.isReadOnly())) return fn.apply(this, args);
    };
  }
};

function has(o, k) {
  return o ? Object.prototype.hasOwnProperty.call(o, k) : false;
}

function eql(a, b) {
  return a === b;
}

/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 */
function shallowEqual(objA, objB) {

  if (objA == null || objB == null) return false;

  var keysA = Object.keys(objA),
      keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (var i = 0; i < keysA.length; i++) if (!has(objB, keysA[i]) || !eql(objA[keysA[i]], objB[keysA[i]])) return false;

  return true;
}

},{"react/lib/Object.assign":63}],38:[function(require,module,exports){
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports"], factory);
  } else if (typeof exports === "object") {
    factory(exports);
  } else {
    factory(root.babelHelpers = {});
  }
})(this, function (global) {
  var babelHelpers = global;

  babelHelpers.objectWithoutProperties = function (obj, keys) {
    var target = {};

    for (var i in obj) {
      if (keys.indexOf(i) >= 0) continue;
      if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
      target[i] = obj[i];
    }

    return target;
  };

  babelHelpers._extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };
})

},{}],39:[function(require,module,exports){
"use strict";
module.exports = function caret(el, start, end) {

  if (start === undefined) return get(el);

  set(el, start, end);
};

function get(el) {
  var start, end, rangeEl, clone;

  if (el.selectionStart !== undefined) {
    start = el.selectionStart;
    end = el.selectionEnd;
  } else {
    try {
      el.focus();
      rangeEl = el.createTextRange();
      clone = rangeEl.duplicate();

      rangeEl.moveToBookmark(document.selection.createRange().getBookmark());
      clone.setEndPoint("EndToStart", rangeEl);

      start = clone.text.length;
      end = start + rangeEl.text.length;
    } catch (e) {}
  }

  return { start: start, end: end };
}

function set(el, start, end) {
  var rangeEl;

  try {
    if (el.selectionStart !== undefined) {
      el.focus();
      el.setSelectionRange(start, end);
    } else {
      el.focus();
      rangeEl = el.createTextRange();
      rangeEl.collapse(true);
      rangeEl.moveStart("character", start);
      rangeEl.moveEnd("character", end - start);
      rangeEl.select();
    }
  } catch (e) {}
}
/* not focused or not visible */ /* not focused or not visible */

},{}],40:[function(require,module,exports){
"use strict";
var React = require("react"),
    _ = require("./_"),
    version = React.version.split(".").map(parseFloat);

var compat = module.exports = {

  version: function () {
    return version;
  },

  type: function (component) {
    if (version[0] === 0 && version[1] >= 13) return component;

    return component.type;
  },

  findDOMNode: function (component) {
    if (React.findDOMNode) return React.findDOMNode(component);

    return component.getDOMNode();
  },

  cloneElement: function (child, props) {
    if (React.cloneElement) return React.cloneElement(child, props);

    //just mutate if pre 0.13
    _.each(props, function (value, prop) {
      return child.props[prop] = value;
    });

    return child;
  }
};

},{"./_":37,"react":undefined}],41:[function(require,module,exports){

module.exports = {

  globalize: require("globalize"),

  animate: require("./dom/animate")
};

},{"./dom/animate":44,"globalize":61}],42:[function(require,module,exports){
"use strict";
var _ = require("./_"); //object

var views = {
  MONTH: "month",
  YEAR: "year",
  DECADE: "decade",
  CENTURY: "century"
};

module.exports = {

  directions: {
    LEFT: "LEFT",
    RIGHT: "RIGHT",
    UP: "UP",
    DOWN: "DOWN"
  },

  datePopups: {
    TIME: "time",
    CALENDAR: "calendar"
  },

  calendarViews: views,

  calendarViewHierarchy: (function () {
    var _calendarViewHierarchy = {};
    _calendarViewHierarchy[views.MONTH] = views.YEAR;
    _calendarViewHierarchy[views.YEAR] = views.DECADE;
    _calendarViewHierarchy[views.DECADE] = views.CENTURY;
    return _calendarViewHierarchy;
  })(),

  calendarViewUnits: (function () {
    var _calendarViewUnits = {};
    _calendarViewUnits[views.MONTH] = "day";
    _calendarViewUnits[views.YEAR] = views.MONTH;
    _calendarViewUnits[views.DECADE] = views.YEAR;
    _calendarViewUnits[views.CENTURY] = views.DECADE;
    return _calendarViewUnits;
  })()
};

},{"./_":37}],43:[function(require,module,exports){
"use strict";

var dateMath = require("date-arithmetic");

var _require = require("./constants");

var directions = _require.directions;
var calendarViewUnits = _require.calendarViewUnits;
var config = require("./configuration");
var _ = require("./_"); //extend

var shortNames = {};

var isUpOrDown = function (dir) {
  return dir === directions.UP || dir === directions.DOWN;
};

var dates = module.exports = _.assign(dateMath, {
  // wrapper methods for isolating globalize use throughout the lib
  // looking forward towards the 1.0 release
  culture: function (culture) {
    return culture ? config.globalize.findClosestCulture(culture) : config.globalize.culture();
  },

  startOfWeek: function (culture) {
    culture = dates.culture(culture);

    if (!culture || !culture.calendar) return 0;

    return culture.calendar.firstDay || 0;
  },

  parse: function (date, format, culture) {
    if (typeof format === "function") return format(date, culture);

    return config.globalize.parseDate(date, format, culture);
  },

  format: function (date, format, culture) {
    if (typeof format === "function") return format(date, culture);

    return config.globalize.format(date, format, culture);
  },

  //-------------------------------------

  shortDay: function (dayOfTheWeek) {
    var culture = dates.culture(arguments[1]),
        name = typeof culture === "string" ? culture : culture.name;

    var names = shortNames[name] || (shortNames[name] = dates.shortDaysOfWeek(culture));

    return names[dayOfTheWeek];
  },

  shortDaysOfWeek: function (culture) {
    var start = dates.startOfWeek(culture),
        days,
        front;

    culture = dates.culture(culture);

    if (culture && culture.calendar) {
      days = culture.calendar.days.namesShort.slice();

      if (start === 0) return days;

      front = days.splice(0, start);
      days = days.concat(front);
      return days;
    }
  },

  monthsInYear: function (year) {
    var months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        date = new Date(year, 0, 1);

    return months.map(function (i) {
      return dates.month(date, i);
    });
  },

  firstOfDecade: function (date) {
    var decade = dates.year(date) % 10;

    return dates.subtract(date, decade, "year");
  },

  lastOfDecade: function (date) {
    return dates.add(dates.firstOfDecade(date), 9, "year");
  },

  firstOfCentury: function (date) {
    var decade = dates.year(date) % 100;
    return dates.subtract(date, decade, "year");
  },

  lastOfCentury: function (date) {
    return dates.add(dates.firstOfCentury(date), 99, "year");
  },

  firstVisibleDay: function (date, culture) {
    var firstOfMonth = dates.startOf(date, "month");
    return dates.startOf(firstOfMonth, "week", dates.startOfWeek(culture));
  },

  lastVisibleDay: function (date, culture) {
    var endOfMonth = dates.endOf(date, "month");
    return dates.endOf(endOfMonth, "week", dates.startOfWeek(culture));
  },

  visibleDays: function (date, culture) {
    var current = dates.firstVisibleDay(date, culture),
        last = dates.lastVisibleDay(date, culture),
        days = [];

    while (dates.lte(current, last, "day")) {
      days.push(current);
      current = dates.add(current, 1, "day");
    }

    return days;
  },

  move: function (date, min, max, unit, direction) {
    var isMonth = unit === "month",
        isUpOrDown = direction === directions.UP || direction === directions.DOWN,
        rangeUnit = calendarViewUnits[unit],
        addUnit = isMonth && isUpOrDown ? "week" : calendarViewUnits[unit],
        amount = isMonth || !isUpOrDown ? 1 : 4,
        newDate;

    if (direction === directions.UP || direction === directions.LEFT) amount *= -1;

    newDate = dates.add(date, amount, addUnit);

    return dates.inRange(newDate, min, max, rangeUnit) ? newDate : date;
  },

  merge: function (date, time) {
    if (time == null && date == null) return null;

    if (time == null) time = new Date();
    if (date == null) date = new Date();

    date = dates.startOf(date, "day");
    date = dates.hours(date, dates.hours(time));
    date = dates.minutes(date, dates.minutes(time));
    date = dates.seconds(date, dates.seconds(time));
    return dates.milliseconds(date, dates.milliseconds(time));
  },

  sameMonth: function (dateA, dateB) {
    return dates.eq(dateA, dateB, "month");
  },

  today: function () {
    return this.startOf(new Date(), "day");
  },

  yesterday: function () {
    return this.add(this.startOf(new Date(), "day"), -1, "day");
  },

  tomorrow: function () {
    return this.add(this.startOf(new Date(), "day"), 1, "day");
  },

  formats: {
    DAY_OF_MONTH: "dd",
    DAY_NAME_SHORT: null,
    MONTH_NAME_ABRV: "MMM",
    MONTH_YEAR: "MMMM yyyy",
    YEAR: "yyyy",
    FOOTER: "D"
  }

});

},{"./_":37,"./configuration":41,"./constants":42,"date-arithmetic":60}],44:[function(require,module,exports){
"use strict";
var canUseDOM = require("react/lib/ExecutionEnvironment").canUseDOM;
var hyphenate = require("react/lib/hyphenateStyleName");
var has = Object.prototype.hasOwnProperty;
var css = require("./css");

var _require = require("./events");

var on = _require.on;
var off = _require.off;

var TRANSLATION_MAP = {
  left: "translateX", right: "translateX",
  top: "translateY", bottom: "translateY" };

var reset = {},
    transform = "transform",
    transition = {},
    transitionTiming,
    transitionDuration,
    transitionProperty,
    transitionDelay;

if (canUseDOM) {
  transition = getTransitionProperties();

  transform = transition.prefix + transform;

  reset[transitionProperty = transition.prefix + "transition-property"] = reset[transitionDuration = transition.prefix + "transition-duration"] = reset[transitionDelay = transition.prefix + "transition-delay"] = reset[transitionTiming = transition.prefix + "transition-timing-function"] = "";
}

animate.endEvent = transition.endEvent;
animate.transform = transform;
animate.TRANSLATION_MAP = TRANSLATION_MAP;

module.exports = animate;

/* code in part from: Zepto 1.1.4 | zeptojs.com/license */
// super lean animate function for transitions
// doesn't support all translations to keep it matching the jquery API
function animate(node, properties, duration, easing, callback) {
  var cssProperties = [],
      fakeEvent = { target: node, currentTarget: node },
      cssValues = {},
      transforms = "",
      fired;

  if (typeof easing === "function") callback = easing, easing = null;

  if (!transition.endEvent) duration = 0;
  if (duration === undefined) duration = 200;

  for (var key in properties) if (has.call(properties, key)) {
    if (/(top|bottom)/.test(key)) transforms += TRANSLATION_MAP[key] + "(" + properties[key] + ") ";else {
      cssValues[key] = properties[key];
      cssProperties.push(hyphenate(key));
    }
  }

  if (transforms) {
    cssValues[transform] = transforms;
    cssProperties.push(transform);
  }

  if (duration > 0) {
    cssValues[transitionProperty] = cssProperties.join(", ");
    cssValues[transitionDuration] = duration / 1000 + "s";
    cssValues[transitionDelay] = 0 + "s";
    cssValues[transitionTiming] = easing || "linear";

    on(node, transition.endEvent, done);

    setTimeout(function () {
      if (!fired) done(fakeEvent);
    }, duration + 500);
  }

  // trigger page reflow
  node.clientLeft;
  css(node, cssValues);

  if (duration <= 0) setTimeout(done.bind(null, fakeEvent), 0);

  function done(event) {
    if (event.target !== event.currentTarget) return;

    fired = true;
    off(event.target, transition.endEvent, done);

    css(node, reset);

    callback && callback.call(this);
  }
}

function getTransitionProperties() {
  var endEvent,
      prefix = "",
      transitions = {
    O: "otransitionend",
    Moz: "transitionend",
    Webkit: "webkitTransitionEnd"
  };

  var element = document.createElement("div");

  for (var vendor in transitions) if (has.call(transitions, vendor)) {
    if (element.style[vendor + "TransitionProperty"] !== undefined) {
      prefix = "-" + vendor.toLowerCase() + "-";
      endEvent = transitions[vendor];
      break;
    }
  }

  if (!endEvent && element.style.transitionProperty !== undefined) endEvent = "transitionend";

  return { endEvent: endEvent, prefix: prefix };
}

},{"./css":46,"./events":48,"react/lib/ExecutionEnvironment":62,"react/lib/hyphenateStyleName":69}],45:[function(require,module,exports){
"use strict";
var canUseDOM = require("react/lib/ExecutionEnvironment").canUseDOM;

var contains = (function () {
  var root = canUseDOM && document.documentElement;

  return root && root.contains ? function (context, node) {
    return context.contains(node);
  } : root && root.compareDocumentPosition ? function (context, node) {
    return context === node || !!(context.compareDocumentPosition(node) & 16);
  } : function (context, node) {
    if (node) do {
      if (node === context) return true;
    } while (node = node.parentNode);

    return false;
  };
})();

module.exports = contains;

},{"react/lib/ExecutionEnvironment":62}],46:[function(require,module,exports){
"use strict";

var camelize = require("react/lib/camelizeStyleName"),
    hyphenate = require("react/lib/hyphenateStyleName"),
    has = Object.prototype.hasOwnProperty;

module.exports = function cssFn(node, property, value) {
  var css = "",
      props = property;

  if (typeof property === "string") {
    if (value === undefined) return node.style[camelize(property)] || _getComputedStyle(node).getPropertyValue(property);else (props = {})[property] = value;
  }

  for (var key in props) if (has.call(props, key)) {
    !props[key] && props[key] !== 0 ? removeStyle(node.style, hyphenate(key)) : css += hyphenate(key) + ":" + props[key] + ";";
  }

  node.style.cssText += ";" + css;
};

function removeStyle(styles, key) {
  return "removeProperty" in styles ? styles.removeProperty(key) : styles.removeAttribute(key);
}

function _getComputedStyle(node) {
  if (!node) throw new Error();
  var doc = node.ownerDocument;

  return "defaultView" in doc ? doc.defaultView.opener ? node.ownerDocument.defaultView.getComputedStyle(node, null) : window.getComputedStyle(node, null) : { //ie 8 "magic"
    getPropertyValue: function (prop) {
      var re = /(\-([a-z]){1})/g;
      if (prop == "float") prop = "styleFloat";
      if (re.test(prop)) prop = prop.replace(re, function () {
        return arguments[2].toUpperCase();
      });

      return node.currentStyle[prop] || null;
    }
  };
}

},{"react/lib/camelizeStyleName":65,"react/lib/hyphenateStyleName":69}],47:[function(require,module,exports){
"use strict";
var contains = require("./contains");

function offset(node) {
  var doc = node.ownerDocument,
      docElem = doc && doc.documentElement,
      box = { top: 0, left: 0, height: 0, width: 0 };

  if (!docElem) return;

  if (!contains(docElem, node)) return box;

  if (node.getBoundingClientRect !== undefined) box = node.getBoundingClientRect();

  return {
    top: box.top + window.pageYOffset - docElem.clientTop,
    left: box.left + window.pageXOffset - docElem.clientLeft,
    width: box.width || node.offsetWidth,
    height: box.height || node.offsetHeight };
}

module.exports = {

  width: function (node, client) {
    var win = getWindow(node);
    return win ? win.innerWidth : client ? node.clientWidth : offset(node).width;
  },

  height: function (node, client) {
    var win = getWindow(node);
    return win ? win.innerHeight : client ? node.clientHeight : offset(node).height;
  },

  offset: offset

};

function getWindow(node) {
  return node === node.window ? node : node.nodeType === 9 && node.defaultView;
}

},{"./contains":45}],48:[function(require,module,exports){
"use strict";

module.exports = {

  on: function (node, eventName, handler) {
    if (node.addEventListener) node.addEventListener(eventName, handler, false);else if (node.attachEvent) node.attachEvent("on" + eventName, handler);
  },

  off: function (node, eventName, handler) {
    if (node.addEventListener) node.removeEventListener(eventName, handler, false);else if (node.attachEvent) node.detachEvent("on" + eventName, handler);
  }
};

},{}],49:[function(require,module,exports){
"use strict";

var _require = require("./events");

var on = _require.on;
var off = _require.off;

var _require2 = require("./dimensions");

var height = _require2.height;
var width = _require2.width;
var offset = _require2.offset;

module.exports = {

  height: height,

  width: width,

  offset: offset,

  on: on,

  off: off,

  css: require("./css"),

  contains: require("./contains"),

  scrollParent: require("./scrollParent"),

  scrollTop: require("./scrollTop"),

  raf: require("./requestAnimationFrame"),

  animate: require("./animate") };

},{"./animate":44,"./contains":45,"./css":46,"./dimensions":47,"./events":48,"./requestAnimationFrame":50,"./scrollParent":52,"./scrollTop":53}],50:[function(require,module,exports){
"use strict";

var canUseDOM = require("react/lib/ExecutionEnvironment").canUseDOM,
    cancel = "clearTimeout",
    raf = fallback,
    compatRaf;

var keys = ["cancelAnimationFrame", "webkitCancelAnimationFrame", "mozCancelAnimationFrame", "oCancelAnimationFrame", "msCancelAnimationFrame"];

compatRaf = function (cb) {
  return raf(cb);
};
compatRaf.cancel = function (id) {
  return window[cancel](id);
};

module.exports = compatRaf;

if (canUseDOM) {
  raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || fallback;

  for (var i = 0; i < keys.length; i++) if (keys[i] in window) {
    cancel = keys[i];
    break;
  }
}

/* https://github.com/component/raf */
var prev = new Date().getTime();

function fallback(fn) {
  var curr = new Date().getTime(),
      ms = Math.max(0, 16 - (curr - prev)),
      req = setTimeout(fn, ms);
  prev = curr;
  return req;
}

},{"react/lib/ExecutionEnvironment":62}],51:[function(require,module,exports){
"use strict";

var _require = require("./dimensions");

var getOffset = _require.offset;
var height = _require.height;
var getScrollParent = require("./scrollParent");
var scrollTop = require("./scrollTop");
var raf = require("./requestAnimationFrame");

module.exports = function scrollTo(selected, scrollParent) {
  var offset = getOffset(selected),
      poff = { top: 0, left: 0 },
      list,
      listScrollTop,
      selectedTop,
      isWin,
      selectedHeight,
      listHeight,
      bottom;

  if (!selected) return;

  list = scrollParent || getScrollParent(selected);
  isWin = getWindow(list);
  listScrollTop = scrollTop(list);

  listHeight = height(list, true);
  isWin = getWindow(list);

  if (!isWin) poff = getOffset(list);

  offset = {
    top: offset.top - poff.top,
    left: offset.left - poff.left,
    height: offset.height,
    width: offset.width
  };

  selectedHeight = offset.height;
  selectedTop = offset.top + (isWin ? 0 : listScrollTop);
  bottom = selectedTop + selectedHeight;

  listScrollTop = listScrollTop > selectedTop ? selectedTop : bottom > listScrollTop + listHeight ? bottom - listHeight : listScrollTop;

  var id = raf(function () {
    return scrollTop(list, listScrollTop);
  });

  return function () {
    return raf.cancel(id);
  };
};

function getWindow(node) {
  return node === node.window ? node : node.nodeType === 9 && node.defaultView;
}

},{"./dimensions":47,"./requestAnimationFrame":50,"./scrollParent":52,"./scrollTop":53}],52:[function(require,module,exports){
"use strict";

var css = require("./css");

var _require = require("./dimensions");

var height = _require.height;

module.exports = function scrollPrarent(node) {
  var position = css(node, "position"),
      excludeStatic = position === "absolute",
      ownerDoc = node.ownerDocument;

  if (position === "fixed") return ownerDoc || document;

  while ((node = node.parentNode) && node.nodeType !== 9) {

    var isStatic = excludeStatic && css(node, "position") === "static",
        style = css(node, "overflow") + css(node, "overflow-y") + css(node, "overflow-x");

    if (isStatic) continue;

    if (/(auto|scroll)/.test(style) && height(node) < node.scrollHeight) return node;
  }

  return document;
};

},{"./css":46,"./dimensions":47}],53:[function(require,module,exports){
"use strict";

module.exports = function scrollTop(node, val) {
  var win = node === node.window ? node : node.nodeType === 9 && node.defaultView;

  if (val === undefined) return win ? "pageYOffset" in win ? win.pageYOffset : win.document.documentElement.scrollTop : node.scrollTop;

  if (win) win.scrollTo("pageXOffset" in win ? win.pageXOffset : win.document.documentElement.scrollLeft, val);else node.scrollTop = val;
};

},{}],54:[function(require,module,exports){
"use strict";

var common = {
  eq: function (a, b) {
    return a === b;
  },
  neq: function (a, b) {
    return a !== b;
  },
  gt: function (a, b) {
    return a > b;
  },
  gte: function (a, b) {
    return a >= b;
  },
  lt: function (a, b) {
    return a < b;
  },
  lte: function (a, b) {
    return a <= b;
  },

  contains: function (a, b) {
    return a.indexOf(b) !== -1;
  },

  startsWith: function (a, b) {
    return a.lastIndexOf(b, 0) === 0;
  },

  endsWith: function (a, b) {
    var pos = a.length - b.length,
        lastIndex = a.indexOf(b, pos);

    return lastIndex !== -1 && lastIndex === pos;
  }
};

module.exports = common;

},{}],55:[function(require,module,exports){
"use strict";
var React = require("react"),
    filters = require("./filter");

var filterTypes = Object.keys(filters).filter(function (i) {
  return i !== "filter";
});

module.exports = {

  elementType: createChainableTypeChecker(function (props, propName, componentName, location) {

    if (typeof props[propName] !== "function") {
      if (React.isValidElement(props[propName])) return new Error("Invalid prop `" + propName + "` specified in  `" + componentName + "`." + " Expected an Element `type`, not an actual Element");

      if (typeof props[propName] !== "string") return new Error("Invalid prop `" + propName + "` specified in  `" + componentName + "`." + " Expected an Element `type` such as a tag name or return value of React.createClass(...)");
    }
    return true;
  }),

  localeFormat: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.func]),

  accessor: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.func]),

  filter: React.PropTypes.oneOfType([React.PropTypes.func, React.PropTypes.bool, React.PropTypes.oneOf(filterTypes)]) };

function createChainableTypeChecker(validate) {

  function checkType(isRequired, props, propName, componentName, location) {
    componentName = componentName || "<<anonymous>>";
    if (props[propName] == null) {
      if (isRequired) {
        return new Error("Required prop `" + propName + "` was not specified in  `" + componentName + "`.");
      }
    } else return validate(props, propName, componentName, location);
  }

  var chainedCheckType = checkType.bind(null, false);
  chainedCheckType.isRequired = checkType.bind(null, true);

  return chainedCheckType;
}

},{"./filter":54,"react":undefined}],56:[function(require,module,exports){
// my tests in ie11/chrome/FF indicate that keyDown repeats
// at about 35ms+/- 5ms after an initial 500ms delay. callback fires on the leading edge
function Repeater(callback) {
  var id,
      cancel = function () {
    return clearInterval(id);
  };

  id = setInterval(function () {
    cancel();
    id = setInterval(callback, 35);
    callback();
  }, 500);

  return cancel;
}

module.exports = Repeater;
//fire after everything in case the user cancels on the first call

},{}],57:[function(require,module,exports){
(function (process){
"use strict";
var METHODS = ["next", "prev", "first", "last"];

module.exports = function validateListComponent(list) {

  if ("production" !== process.env.NODE_ENV) {
    METHODS.forEach(function (method) {
      return assert(typeof list[method] === "function", "List components must implement a `" + method + "()` method");
    });
  }
};

function assert(condition, msg) {
  var error;

  if (!condition) {
    error = new Error(msg);
    error.framesToPop = 1;
    throw error;
  }
}

}).call(this,require('_process'))
},{"_process":58}],58:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],59:[function(require,module,exports){
/*!
  Copyright (c) 2015 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/

function classNames() {
	var classes = '';
	var arg;

	for (var i = 0; i < arguments.length; i++) {
		arg = arguments[i];
		if (!arg) {
			continue;
		}

		if ('string' === typeof arg || 'number' === typeof arg) {
			classes += ' ' + arg;
		} else if (Object.prototype.toString.call(arg) === '[object Array]') {
			classes += ' ' + classNames.apply(null, arg);
		} else if ('object' === typeof arg) {
			for (var key in arg) {
				if (!arg.hasOwnProperty(key) || !arg[key]) {
					continue;
				}
				classes += ' ' + key;
			}
		}
	}
	return classes.substr(1);
}

// safely export classNames for node / browserify
if (typeof module !== 'undefined' && module.exports) {
	module.exports = classNames;
}

// safely export classNames for RequireJS
if (typeof define !== 'undefined' && define.amd) {
	define('classnames', [], function() {
		return classNames;
	});
}

},{}],60:[function(require,module,exports){
var MILI    = 'milliseconds'
  , SECONDS = 'seconds'
  , MINUTES = 'minutes'
  , HOURS   = 'hours'
  , DAY     = 'day'
  , WEEK    = 'week'
  , MONTH   = 'month'
  , YEAR    = 'year'
  , DECADE  = 'decade'
  , CENTURY = 'century';

var dates = module.exports = {

  add: function(date, num, unit) {
    date = new Date(date)

    switch (unit){
      case MILI:
      case SECONDS:
      case MINUTES:
      case HOURS:
      case YEAR:
        return dates[unit](date, dates[unit](date) + num)
      case DAY:
        return dates.date(date, dates.date(date) + num)
      case WEEK:
        return dates.date(date, dates.date(date) + (7 * num)) 
      case MONTH:
        return monthMath(date, num)
      case DECADE:
        return dates.year(date, dates.year(date) + (num * 10))
      case CENTURY:
        return dates.year(date, dates.year(date) + (num * 100))
    }

    throw new TypeError('Invalid units: "' + unit + '"')
  },

  subtract: function(date, num, unit) {
    return dates.add(date, -num, unit)
  },

  startOf: function(date, unit, firstOfWeek) {
    date = new Date(date)

    switch (unit) {
      case 'century':
      case 'decade':
      case 'year':
          date = dates.month(date, 0);
      case 'month':
          date = dates.date(date, 1);
      case 'week':
      case 'day':
          date = dates.hours(date, 0);
      case 'hours':
          date = dates.minutes(date, 0);
      case 'minutes':
          date = dates.seconds(date, 0);
      case 'seconds':
          date = dates.milliseconds(date, 0);
    }

    if (unit === DECADE) 
      date = dates.subtract(date, dates.year(date) % 10, 'year')
    
    if (unit === CENTURY) 
      date = dates.subtract(date, dates.year(date) % 100, 'year')

    if (unit === WEEK) 
      date = dates.weekday(date, 0, firstOfWeek);

    return date
  },


  endOf: function(date, unit, firstOfWeek){
    date = new Date(date)
    date = dates.startOf(date, unit, firstOfWeek)
    date = dates.add(date, 1, unit)
    date = dates.subtract(date, 1, MILI)
    return date
  },

  eq:  createComparer(function(a, b){ return a === b }),
  neq: createComparer(function(a, b){ return a !== b }),
  gt:  createComparer(function(a, b){ return a > b }),
  gte: createComparer(function(a, b){ return a >= b }),
  lt:  createComparer(function(a, b){ return a < b }),
  lte: createComparer(function(a, b){ return a <= b }),

  min: function(){
    return new Date(Math.min.apply(Math, arguments))
  },

  max: function(){
    return new Date(Math.max.apply(Math, arguments))
  },
  
  inRange: function(day, min, max, unit){
    unit = unit || 'day'

    return (!min || dates.gte(day, min, unit))
        && (!max || dates.lte(day, max, unit))
  },

  milliseconds:   createAccessor('Milliseconds'),
  seconds:        createAccessor('Seconds'),
  minutes:        createAccessor('Minutes'),
  hours:          createAccessor('Hours'),
  day:            createAccessor('Day'),
  date:           createAccessor('Date'),
  month:          createAccessor('Month'),
  year:           createAccessor('FullYear'),

  decade: function (date, val) {
    return val === undefined 
      ? dates.year(dates.startOf(date, DECADE))
      : dates.add(date, val + 10, YEAR);
  },

  century: function (date, val) {
    return val === undefined 
      ? dates.year(dates.startOf(date, CENTURY))
      : dates.add(date, val + 100, YEAR);
  },

  weekday: function (date, val, firstDay) {
      var weekday = (dates.day(date) + 7 - (firstDay || 0) ) % 7;

      return val === undefined 
        ? weekday 
        : dates.add(date, val - weekday, DAY);
  }
}


function monthMath(date, val){
  var current = dates.month(date)
    , newMonth  = (current + val);

    date = dates.month(date, newMonth)

    if (newMonth < 0 ) newMonth = 12 + val
      
    //month rollover
    if ( dates.month(date) !== ( newMonth % 12))
      date = dates.date(date, 0) //move to last of month

    return date
}

function createAccessor(method){
  return function(date, val){
    if (val === undefined)
      return date['get' + method]()

    date = new Date(date)
    date['set' + method](val)
    return date
  }
}

function createComparer(operator) {
  return function (a, b, unit) {
    return operator(+dates.startOf(a, unit), +dates.startOf(b, unit))
  };
}

},{}],61:[function(require,module,exports){
/*!
 * Globalize
 *
 * http://github.com/jquery/globalize
 *
 * Copyright Software Freedom Conservancy, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */

(function( window, undefined ) {

var Globalize,
	// private variables
	regexHex,
	regexInfinity,
	regexParseFloat,
	regexTrim,
	// private JavaScript utility functions
	arrayIndexOf,
	endsWith,
	extend,
	isArray,
	isFunction,
	isObject,
	startsWith,
	trim,
	truncate,
	zeroPad,
	// private Globalization utility functions
	appendPreOrPostMatch,
	expandFormat,
	formatDate,
	formatNumber,
	getTokenRegExp,
	getEra,
	getEraYear,
	parseExact,
	parseNegativePattern;

// Global variable (Globalize) or CommonJS module (globalize)
Globalize = function( cultureSelector ) {
	return new Globalize.prototype.init( cultureSelector );
};

if ( typeof require !== "undefined" &&
	typeof exports !== "undefined" &&
	typeof module !== "undefined" ) {
	// Assume CommonJS
	module.exports = Globalize;
} else {
	// Export as global variable
	window.Globalize = Globalize;
}

Globalize.cultures = {};

Globalize.prototype = {
	constructor: Globalize,
	init: function( cultureSelector ) {
		this.cultures = Globalize.cultures;
		this.cultureSelector = cultureSelector;

		return this;
	}
};
Globalize.prototype.init.prototype = Globalize.prototype;

// 1. When defining a culture, all fields are required except the ones stated as optional.
// 2. Each culture should have a ".calendars" object with at least one calendar named "standard"
//    which serves as the default calendar in use by that culture.
// 3. Each culture should have a ".calendar" object which is the current calendar being used,
//    it may be dynamically changed at any time to one of the calendars in ".calendars".
Globalize.cultures[ "default" ] = {
	// A unique name for the culture in the form <language code>-<country/region code>
	name: "en",
	// the name of the culture in the english language
	englishName: "English",
	// the name of the culture in its own language
	nativeName: "English",
	// whether the culture uses right-to-left text
	isRTL: false,
	// "language" is used for so-called "specific" cultures.
	// For example, the culture "es-CL" means "Spanish, in Chili".
	// It represents the Spanish-speaking culture as it is in Chili,
	// which might have different formatting rules or even translations
	// than Spanish in Spain. A "neutral" culture is one that is not
	// specific to a region. For example, the culture "es" is the generic
	// Spanish culture, which may be a more generalized version of the language
	// that may or may not be what a specific culture expects.
	// For a specific culture like "es-CL", the "language" field refers to the
	// neutral, generic culture information for the language it is using.
	// This is not always a simple matter of the string before the dash.
	// For example, the "zh-Hans" culture is netural (Simplified Chinese).
	// And the "zh-SG" culture is Simplified Chinese in Singapore, whose lanugage
	// field is "zh-CHS", not "zh".
	// This field should be used to navigate from a specific culture to it's
	// more general, neutral culture. If a culture is already as general as it
	// can get, the language may refer to itself.
	language: "en",
	// numberFormat defines general number formatting rules, like the digits in
	// each grouping, the group separator, and how negative numbers are displayed.
	numberFormat: {
		// [negativePattern]
		// Note, numberFormat.pattern has no "positivePattern" unlike percent and currency,
		// but is still defined as an array for consistency with them.
		//   negativePattern: one of "(n)|-n|- n|n-|n -"
		pattern: [ "-n" ],
		// number of decimal places normally shown
		decimals: 2,
		// string that separates number groups, as in 1,000,000
		",": ",",
		// string that separates a number from the fractional portion, as in 1.99
		".": ".",
		// array of numbers indicating the size of each number group.
		// TODO: more detailed description and example
		groupSizes: [ 3 ],
		// symbol used for positive numbers
		"+": "+",
		// symbol used for negative numbers
		"-": "-",
		// symbol used for NaN (Not-A-Number)
		"NaN": "NaN",
		// symbol used for Negative Infinity
		negativeInfinity: "-Infinity",
		// symbol used for Positive Infinity
		positiveInfinity: "Infinity",
		percent: {
			// [negativePattern, positivePattern]
			//   negativePattern: one of "-n %|-n%|-%n|%-n|%n-|n-%|n%-|-% n|n %-|% n-|% -n|n- %"
			//   positivePattern: one of "n %|n%|%n|% n"
			pattern: [ "-n %", "n %" ],
			// number of decimal places normally shown
			decimals: 2,
			// array of numbers indicating the size of each number group.
			// TODO: more detailed description and example
			groupSizes: [ 3 ],
			// string that separates number groups, as in 1,000,000
			",": ",",
			// string that separates a number from the fractional portion, as in 1.99
			".": ".",
			// symbol used to represent a percentage
			symbol: "%"
		},
		currency: {
			// [negativePattern, positivePattern]
			//   negativePattern: one of "($n)|-$n|$-n|$n-|(n$)|-n$|n-$|n$-|-n $|-$ n|n $-|$ n-|$ -n|n- $|($ n)|(n $)"
			//   positivePattern: one of "$n|n$|$ n|n $"
			pattern: [ "($n)", "$n" ],
			// number of decimal places normally shown
			decimals: 2,
			// array of numbers indicating the size of each number group.
			// TODO: more detailed description and example
			groupSizes: [ 3 ],
			// string that separates number groups, as in 1,000,000
			",": ",",
			// string that separates a number from the fractional portion, as in 1.99
			".": ".",
			// symbol used to represent currency
			symbol: "$"
		}
	},
	// calendars defines all the possible calendars used by this culture.
	// There should be at least one defined with name "standard", and is the default
	// calendar used by the culture.
	// A calendar contains information about how dates are formatted, information about
	// the calendar's eras, a standard set of the date formats,
	// translations for day and month names, and if the calendar is not based on the Gregorian
	// calendar, conversion functions to and from the Gregorian calendar.
	calendars: {
		standard: {
			// name that identifies the type of calendar this is
			name: "Gregorian_USEnglish",
			// separator of parts of a date (e.g. "/" in 11/05/1955)
			"/": "/",
			// separator of parts of a time (e.g. ":" in 05:44 PM)
			":": ":",
			// the first day of the week (0 = Sunday, 1 = Monday, etc)
			firstDay: 0,
			days: {
				// full day names
				names: [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
				// abbreviated day names
				namesAbbr: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
				// shortest day names
				namesShort: [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa" ]
			},
			months: {
				// full month names (13 months for lunar calendards -- 13th month should be "" if not lunar)
				names: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "" ],
				// abbreviated month names
				namesAbbr: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "" ]
			},
			// AM and PM designators in one of these forms:
			// The usual view, and the upper and lower case versions
			//   [ standard, lowercase, uppercase ]
			// The culture does not use AM or PM (likely all standard date formats use 24 hour time)
			//   null
			AM: [ "AM", "am", "AM" ],
			PM: [ "PM", "pm", "PM" ],
			eras: [
				// eras in reverse chronological order.
				// name: the name of the era in this culture (e.g. A.D., C.E.)
				// start: when the era starts in ticks (gregorian, gmt), null if it is the earliest supported era.
				// offset: offset in years from gregorian calendar
				{
					"name": "A.D.",
					"start": null,
					"offset": 0
				}
			],
			// when a two digit year is given, it will never be parsed as a four digit
			// year greater than this year (in the appropriate era for the culture)
			// Set it as a full year (e.g. 2029) or use an offset format starting from
			// the current year: "+19" would correspond to 2029 if the current year 2010.
			twoDigitYearMax: 2029,
			// set of predefined date and time patterns used by the culture
			// these represent the format someone in this culture would expect
			// to see given the portions of the date that are shown.
			patterns: {
				// short date pattern
				d: "M/d/yyyy",
				// long date pattern
				D: "dddd, MMMM dd, yyyy",
				// short time pattern
				t: "h:mm tt",
				// long time pattern
				T: "h:mm:ss tt",
				// long date, short time pattern
				f: "dddd, MMMM dd, yyyy h:mm tt",
				// long date, long time pattern
				F: "dddd, MMMM dd, yyyy h:mm:ss tt",
				// month/day pattern
				M: "MMMM dd",
				// month/year pattern
				Y: "yyyy MMMM",
				// S is a sortable format that does not vary by culture
				S: "yyyy\u0027-\u0027MM\u0027-\u0027dd\u0027T\u0027HH\u0027:\u0027mm\u0027:\u0027ss"
			}
			// optional fields for each calendar:
			/*
			monthsGenitive:
				Same as months but used when the day preceeds the month.
				Omit if the culture has no genitive distinction in month names.
				For an explaination of genitive months, see http://blogs.msdn.com/michkap/archive/2004/12/25/332259.aspx
			convert:
				Allows for the support of non-gregorian based calendars. This convert object is used to
				to convert a date to and from a gregorian calendar date to handle parsing and formatting.
				The two functions:
					fromGregorian( date )
						Given the date as a parameter, return an array with parts [ year, month, day ]
						corresponding to the non-gregorian based year, month, and day for the calendar.
					toGregorian( year, month, day )
						Given the non-gregorian year, month, and day, return a new Date() object
						set to the corresponding date in the gregorian calendar.
			*/
		}
	},
	// For localized strings
	messages: {}
};

Globalize.cultures[ "default" ].calendar = Globalize.cultures[ "default" ].calendars.standard;

Globalize.cultures.en = Globalize.cultures[ "default" ];

Globalize.cultureSelector = "en";

//
// private variables
//

regexHex = /^0x[a-f0-9]+$/i;
regexInfinity = /^[+\-]?infinity$/i;
regexParseFloat = /^[+\-]?\d*\.?\d*(e[+\-]?\d+)?$/;
regexTrim = /^\s+|\s+$/g;

//
// private JavaScript utility functions
//

arrayIndexOf = function( array, item ) {
	if ( array.indexOf ) {
		return array.indexOf( item );
	}
	for ( var i = 0, length = array.length; i < length; i++ ) {
		if ( array[i] === item ) {
			return i;
		}
	}
	return -1;
};

endsWith = function( value, pattern ) {
	return value.substr( value.length - pattern.length ) === pattern;
};

extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !isFunction(target) ) {
		target = {};
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( isObject(copy) || (copyIsArray = isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && isArray(src) ? src : [];

					} else {
						clone = src && isObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

isArray = Array.isArray || function( obj ) {
	return Object.prototype.toString.call( obj ) === "[object Array]";
};

isFunction = function( obj ) {
	return Object.prototype.toString.call( obj ) === "[object Function]";
};

isObject = function( obj ) {
	return Object.prototype.toString.call( obj ) === "[object Object]";
};

startsWith = function( value, pattern ) {
	return value.indexOf( pattern ) === 0;
};

trim = function( value ) {
	return ( value + "" ).replace( regexTrim, "" );
};

truncate = function( value ) {
	if ( isNaN( value ) ) {
		return NaN;
	}
	return Math[ value < 0 ? "ceil" : "floor" ]( value );
};

zeroPad = function( str, count, left ) {
	var l;
	for ( l = str.length; l < count; l += 1 ) {
		str = ( left ? ("0" + str) : (str + "0") );
	}
	return str;
};

//
// private Globalization utility functions
//

appendPreOrPostMatch = function( preMatch, strings ) {
	// appends pre- and post- token match strings while removing escaped characters.
	// Returns a single quote count which is used to determine if the token occurs
	// in a string literal.
	var quoteCount = 0,
		escaped = false;
	for ( var i = 0, il = preMatch.length; i < il; i++ ) {
		var c = preMatch.charAt( i );
		switch ( c ) {
			case "\'":
				if ( escaped ) {
					strings.push( "\'" );
				}
				else {
					quoteCount++;
				}
				escaped = false;
				break;
			case "\\":
				if ( escaped ) {
					strings.push( "\\" );
				}
				escaped = !escaped;
				break;
			default:
				strings.push( c );
				escaped = false;
				break;
		}
	}
	return quoteCount;
};

expandFormat = function( cal, format ) {
	// expands unspecified or single character date formats into the full pattern.
	format = format || "F";
	var pattern,
		patterns = cal.patterns,
		len = format.length;
	if ( len === 1 ) {
		pattern = patterns[ format ];
		if ( !pattern ) {
			throw "Invalid date format string \'" + format + "\'.";
		}
		format = pattern;
	}
	else if ( len === 2 && format.charAt(0) === "%" ) {
		// %X escape format -- intended as a custom format string that is only one character, not a built-in format.
		format = format.charAt( 1 );
	}
	return format;
};

formatDate = function( value, format, culture ) {
	var cal = culture.calendar,
		convert = cal.convert,
		ret;

	if ( !format || !format.length || format === "i" ) {
		if ( culture && culture.name.length ) {
			if ( convert ) {
				// non-gregorian calendar, so we cannot use built-in toLocaleString()
				ret = formatDate( value, cal.patterns.F, culture );
			}
			else {
				var eraDate = new Date( value.getTime() ),
					era = getEra( value, cal.eras );
				eraDate.setFullYear( getEraYear(value, cal, era) );
				ret = eraDate.toLocaleString();
			}
		}
		else {
			ret = value.toString();
		}
		return ret;
	}

	var eras = cal.eras,
		sortable = format === "s";
	format = expandFormat( cal, format );

	// Start with an empty string
	ret = [];
	var hour,
		zeros = [ "0", "00", "000" ],
		foundDay,
		checkedDay,
		dayPartRegExp = /([^d]|^)(d|dd)([^d]|$)/g,
		quoteCount = 0,
		tokenRegExp = getTokenRegExp(),
		converted;

	function padZeros( num, c ) {
		var r, s = num + "";
		if ( c > 1 && s.length < c ) {
			r = ( zeros[c - 2] + s);
			return r.substr( r.length - c, c );
		}
		else {
			r = s;
		}
		return r;
	}

	function hasDay() {
		if ( foundDay || checkedDay ) {
			return foundDay;
		}
		foundDay = dayPartRegExp.test( format );
		checkedDay = true;
		return foundDay;
	}

	function getPart( date, part ) {
		if ( converted ) {
			return converted[ part ];
		}
		switch ( part ) {
			case 0:
				return date.getFullYear();
			case 1:
				return date.getMonth();
			case 2:
				return date.getDate();
			default:
				throw "Invalid part value " + part;
		}
	}

	if ( !sortable && convert ) {
		converted = convert.fromGregorian( value );
	}

	for ( ; ; ) {
		// Save the current index
		var index = tokenRegExp.lastIndex,
			// Look for the next pattern
			ar = tokenRegExp.exec( format );

		// Append the text before the pattern (or the end of the string if not found)
		var preMatch = format.slice( index, ar ? ar.index : format.length );
		quoteCount += appendPreOrPostMatch( preMatch, ret );

		if ( !ar ) {
			break;
		}

		// do not replace any matches that occur inside a string literal.
		if ( quoteCount % 2 ) {
			ret.push( ar[0] );
			continue;
		}

		var current = ar[ 0 ],
			clength = current.length;

		switch ( current ) {
			case "ddd":
				//Day of the week, as a three-letter abbreviation
			case "dddd":
				// Day of the week, using the full name
				var names = ( clength === 3 ) ? cal.days.namesAbbr : cal.days.names;
				ret.push( names[value.getDay()] );
				break;
			case "d":
				// Day of month, without leading zero for single-digit days
			case "dd":
				// Day of month, with leading zero for single-digit days
				foundDay = true;
				ret.push(
					padZeros( getPart(value, 2), clength )
				);
				break;
			case "MMM":
				// Month, as a three-letter abbreviation
			case "MMMM":
				// Month, using the full name
				var part = getPart( value, 1 );
				ret.push(
					( cal.monthsGenitive && hasDay() ) ?
					( cal.monthsGenitive[ clength === 3 ? "namesAbbr" : "names" ][ part ] ) :
					( cal.months[ clength === 3 ? "namesAbbr" : "names" ][ part ] )
				);
				break;
			case "M":
				// Month, as digits, with no leading zero for single-digit months
			case "MM":
				// Month, as digits, with leading zero for single-digit months
				ret.push(
					padZeros( getPart(value, 1) + 1, clength )
				);
				break;
			case "y":
				// Year, as two digits, but with no leading zero for years less than 10
			case "yy":
				// Year, as two digits, with leading zero for years less than 10
			case "yyyy":
				// Year represented by four full digits
				part = converted ? converted[ 0 ] : getEraYear( value, cal, getEra(value, eras), sortable );
				if ( clength < 4 ) {
					part = part % 100;
				}
				ret.push(
					padZeros( part, clength )
				);
				break;
			case "h":
				// Hours with no leading zero for single-digit hours, using 12-hour clock
			case "hh":
				// Hours with leading zero for single-digit hours, using 12-hour clock
				hour = value.getHours() % 12;
				if ( hour === 0 ) hour = 12;
				ret.push(
					padZeros( hour, clength )
				);
				break;
			case "H":
				// Hours with no leading zero for single-digit hours, using 24-hour clock
			case "HH":
				// Hours with leading zero for single-digit hours, using 24-hour clock
				ret.push(
					padZeros( value.getHours(), clength )
				);
				break;
			case "m":
				// Minutes with no leading zero for single-digit minutes
			case "mm":
				// Minutes with leading zero for single-digit minutes
				ret.push(
					padZeros( value.getMinutes(), clength )
				);
				break;
			case "s":
				// Seconds with no leading zero for single-digit seconds
			case "ss":
				// Seconds with leading zero for single-digit seconds
				ret.push(
					padZeros( value.getSeconds(), clength )
				);
				break;
			case "t":
				// One character am/pm indicator ("a" or "p")
			case "tt":
				// Multicharacter am/pm indicator
				part = value.getHours() < 12 ? ( cal.AM ? cal.AM[0] : " " ) : ( cal.PM ? cal.PM[0] : " " );
				ret.push( clength === 1 ? part.charAt(0) : part );
				break;
			case "f":
				// Deciseconds
			case "ff":
				// Centiseconds
			case "fff":
				// Milliseconds
				ret.push(
					padZeros( value.getMilliseconds(), 3 ).substr( 0, clength )
				);
				break;
			case "z":
				// Time zone offset, no leading zero
			case "zz":
				// Time zone offset with leading zero
				hour = value.getTimezoneOffset() / 60;
				ret.push(
					( hour <= 0 ? "+" : "-" ) + padZeros( Math.floor(Math.abs(hour)), clength )
				);
				break;
			case "zzz":
				// Time zone offset with leading zero
				hour = value.getTimezoneOffset() / 60;
				ret.push(
					( hour <= 0 ? "+" : "-" ) + padZeros( Math.floor(Math.abs(hour)), 2 ) +
					// Hard coded ":" separator, rather than using cal.TimeSeparator
					// Repeated here for consistency, plus ":" was already assumed in date parsing.
					":" + padZeros( Math.abs(value.getTimezoneOffset() % 60), 2 )
				);
				break;
			case "g":
			case "gg":
				if ( cal.eras ) {
					ret.push(
						cal.eras[ getEra(value, eras) ].name
					);
				}
				break;
		case "/":
			ret.push( cal["/"] );
			break;
		default:
			throw "Invalid date format pattern \'" + current + "\'.";
		}
	}
	return ret.join( "" );
};

// formatNumber
(function() {
	var expandNumber;

	expandNumber = function( number, precision, formatInfo ) {
		var groupSizes = formatInfo.groupSizes,
			curSize = groupSizes[ 0 ],
			curGroupIndex = 1,
			factor = Math.pow( 10, precision ),
			rounded = Math.round( number * factor ) / factor;

		if ( !isFinite(rounded) ) {
			rounded = number;
		}
		number = rounded;

		var numberString = number+"",
			right = "",
			split = numberString.split( /e/i ),
			exponent = split.length > 1 ? parseInt( split[1], 10 ) : 0;
		numberString = split[ 0 ];
		split = numberString.split( "." );
		numberString = split[ 0 ];
		right = split.length > 1 ? split[ 1 ] : "";

		var l;
		if ( exponent > 0 ) {
			right = zeroPad( right, exponent, false );
			numberString += right.slice( 0, exponent );
			right = right.substr( exponent );
		}
		else if ( exponent < 0 ) {
			exponent = -exponent;
			numberString = zeroPad( numberString, exponent + 1, true );
			right = numberString.slice( -exponent, numberString.length ) + right;
			numberString = numberString.slice( 0, -exponent );
		}

		if ( precision > 0 ) {
			right = formatInfo[ "." ] +
				( (right.length > precision) ? right.slice(0, precision) : zeroPad(right, precision) );
		}
		else {
			right = "";
		}

		var stringIndex = numberString.length - 1,
			sep = formatInfo[ "," ],
			ret = "";

		while ( stringIndex >= 0 ) {
			if ( curSize === 0 || curSize > stringIndex ) {
				return numberString.slice( 0, stringIndex + 1 ) + ( ret.length ? (sep + ret + right) : right );
			}
			ret = numberString.slice( stringIndex - curSize + 1, stringIndex + 1 ) + ( ret.length ? (sep + ret) : "" );

			stringIndex -= curSize;

			if ( curGroupIndex < groupSizes.length ) {
				curSize = groupSizes[ curGroupIndex ];
				curGroupIndex++;
			}
		}

		return numberString.slice( 0, stringIndex + 1 ) + sep + ret + right;
	};

	formatNumber = function( value, format, culture ) {
		if ( !isFinite(value) ) {
			if ( value === Infinity ) {
				return culture.numberFormat.positiveInfinity;
			}
			if ( value === -Infinity ) {
				return culture.numberFormat.negativeInfinity;
			}
			return culture.numberFormat[ "NaN" ];
		}
		if ( !format || format === "i" ) {
			return culture.name.length ? value.toLocaleString() : value.toString();
		}
		format = format || "D";

		var nf = culture.numberFormat,
			number = Math.abs( value ),
			precision = -1,
			pattern;
		if ( format.length > 1 ) precision = parseInt( format.slice(1), 10 );

		var current = format.charAt( 0 ).toUpperCase(),
			formatInfo;

		switch ( current ) {
			case "D":
				pattern = "n";
				number = truncate( number );
				if ( precision !== -1 ) {
					number = zeroPad( "" + number, precision, true );
				}
				if ( value < 0 ) number = "-" + number;
				break;
			case "N":
				formatInfo = nf;
				/* falls through */
			case "C":
				formatInfo = formatInfo || nf.currency;
				/* falls through */
			case "P":
				formatInfo = formatInfo || nf.percent;
				pattern = value < 0 ? formatInfo.pattern[ 0 ] : ( formatInfo.pattern[1] || "n" );
				if ( precision === -1 ) precision = formatInfo.decimals;
				number = expandNumber( number * (current === "P" ? 100 : 1), precision, formatInfo );
				break;
			default:
				throw "Bad number format specifier: " + current;
		}

		var patternParts = /n|\$|-|%/g,
			ret = "";
		for ( ; ; ) {
			var index = patternParts.lastIndex,
				ar = patternParts.exec( pattern );

			ret += pattern.slice( index, ar ? ar.index : pattern.length );

			if ( !ar ) {
				break;
			}

			switch ( ar[0] ) {
				case "n":
					ret += number;
					break;
				case "$":
					ret += nf.currency.symbol;
					break;
				case "-":
					// don't make 0 negative
					if ( /[1-9]/.test(number) ) {
						ret += nf[ "-" ];
					}
					break;
				case "%":
					ret += nf.percent.symbol;
					break;
			}
		}

		return ret;
	};

}());

getTokenRegExp = function() {
	// regular expression for matching date and time tokens in format strings.
	return (/\/|dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|y|hh|h|HH|H|mm|m|ss|s|tt|t|fff|ff|f|zzz|zz|z|gg|g/g);
};

getEra = function( date, eras ) {
	if ( !eras ) return 0;
	var start, ticks = date.getTime();
	for ( var i = 0, l = eras.length; i < l; i++ ) {
		start = eras[ i ].start;
		if ( start === null || ticks >= start ) {
			return i;
		}
	}
	return 0;
};

getEraYear = function( date, cal, era, sortable ) {
	var year = date.getFullYear();
	if ( !sortable && cal.eras ) {
		// convert normal gregorian year to era-shifted gregorian
		// year by subtracting the era offset
		year -= cal.eras[ era ].offset;
	}
	return year;
};

// parseExact
(function() {
	var expandYear,
		getDayIndex,
		getMonthIndex,
		getParseRegExp,
		outOfRange,
		toUpper,
		toUpperArray;

	expandYear = function( cal, year ) {
		// expands 2-digit year into 4 digits.
		if ( year < 100 ) {
			var now = new Date(),
				era = getEra( now ),
				curr = getEraYear( now, cal, era ),
				twoDigitYearMax = cal.twoDigitYearMax;
			twoDigitYearMax = typeof twoDigitYearMax === "string" ? new Date().getFullYear() % 100 + parseInt( twoDigitYearMax, 10 ) : twoDigitYearMax;
			year += curr - ( curr % 100 );
			if ( year > twoDigitYearMax ) {
				year -= 100;
			}
		}
		return year;
	};

	getDayIndex = function	( cal, value, abbr ) {
		var ret,
			days = cal.days,
			upperDays = cal._upperDays;
		if ( !upperDays ) {
			cal._upperDays = upperDays = [
				toUpperArray( days.names ),
				toUpperArray( days.namesAbbr ),
				toUpperArray( days.namesShort )
			];
		}
		value = toUpper( value );
		if ( abbr ) {
			ret = arrayIndexOf( upperDays[1], value );
			if ( ret === -1 ) {
				ret = arrayIndexOf( upperDays[2], value );
			}
		}
		else {
			ret = arrayIndexOf( upperDays[0], value );
		}
		return ret;
	};

	getMonthIndex = function( cal, value, abbr ) {
		var months = cal.months,
			monthsGen = cal.monthsGenitive || cal.months,
			upperMonths = cal._upperMonths,
			upperMonthsGen = cal._upperMonthsGen;
		if ( !upperMonths ) {
			cal._upperMonths = upperMonths = [
				toUpperArray( months.names ),
				toUpperArray( months.namesAbbr )
			];
			cal._upperMonthsGen = upperMonthsGen = [
				toUpperArray( monthsGen.names ),
				toUpperArray( monthsGen.namesAbbr )
			];
		}
		value = toUpper( value );
		var i = arrayIndexOf( abbr ? upperMonths[1] : upperMonths[0], value );
		if ( i < 0 ) {
			i = arrayIndexOf( abbr ? upperMonthsGen[1] : upperMonthsGen[0], value );
		}
		return i;
	};

	getParseRegExp = function( cal, format ) {
		// converts a format string into a regular expression with groups that
		// can be used to extract date fields from a date string.
		// check for a cached parse regex.
		var re = cal._parseRegExp;
		if ( !re ) {
			cal._parseRegExp = re = {};
		}
		else {
			var reFormat = re[ format ];
			if ( reFormat ) {
				return reFormat;
			}
		}

		// expand single digit formats, then escape regular expression characters.
		var expFormat = expandFormat( cal, format ).replace( /([\^\$\.\*\+\?\|\[\]\(\)\{\}])/g, "\\\\$1" ),
			regexp = [ "^" ],
			groups = [],
			index = 0,
			quoteCount = 0,
			tokenRegExp = getTokenRegExp(),
			match;

		// iterate through each date token found.
		while ( (match = tokenRegExp.exec(expFormat)) !== null ) {
			var preMatch = expFormat.slice( index, match.index );
			index = tokenRegExp.lastIndex;

			// don't replace any matches that occur inside a string literal.
			quoteCount += appendPreOrPostMatch( preMatch, regexp );
			if ( quoteCount % 2 ) {
				regexp.push( match[0] );
				continue;
			}

			// add a regex group for the token.
			var m = match[ 0 ],
				len = m.length,
				add;
			switch ( m ) {
				case "dddd": case "ddd":
				case "MMMM": case "MMM":
				case "gg": case "g":
					add = "(\\D+)";
					break;
				case "tt": case "t":
					add = "(\\D*)";
					break;
				case "yyyy":
				case "fff":
				case "ff":
				case "f":
					add = "(\\d{" + len + "})";
					break;
				case "dd": case "d":
				case "MM": case "M":
				case "yy": case "y":
				case "HH": case "H":
				case "hh": case "h":
				case "mm": case "m":
				case "ss": case "s":
					add = "(\\d\\d?)";
					break;
				case "zzz":
					add = "([+-]?\\d\\d?:\\d{2})";
					break;
				case "zz": case "z":
					add = "([+-]?\\d\\d?)";
					break;
				case "/":
					add = "(\\/)";
					break;
				default:
					throw "Invalid date format pattern \'" + m + "\'.";
			}
			if ( add ) {
				regexp.push( add );
			}
			groups.push( match[0] );
		}
		appendPreOrPostMatch( expFormat.slice(index), regexp );
		regexp.push( "$" );

		// allow whitespace to differ when matching formats.
		var regexpStr = regexp.join( "" ).replace( /\s+/g, "\\s+" ),
			parseRegExp = { "regExp": regexpStr, "groups": groups };

		// cache the regex for this format.
		return re[ format ] = parseRegExp;
	};

	outOfRange = function( value, low, high ) {
		return value < low || value > high;
	};

	toUpper = function( value ) {
		// "he-IL" has non-breaking space in weekday names.
		return value.split( "\u00A0" ).join( " " ).toUpperCase();
	};

	toUpperArray = function( arr ) {
		var results = [];
		for ( var i = 0, l = arr.length; i < l; i++ ) {
			results[ i ] = toUpper( arr[i] );
		}
		return results;
	};

	parseExact = function( value, format, culture ) {
		// try to parse the date string by matching against the format string
		// while using the specified culture for date field names.
		value = trim( value );
		var cal = culture.calendar,
			// convert date formats into regular expressions with groupings.
			// use the regexp to determine the input format and extract the date fields.
			parseInfo = getParseRegExp( cal, format ),
			match = new RegExp( parseInfo.regExp ).exec( value );
		if ( match === null ) {
			return null;
		}
		// found a date format that matches the input.
		var groups = parseInfo.groups,
			era = null, year = null, month = null, date = null, weekDay = null,
			hour = 0, hourOffset, min = 0, sec = 0, msec = 0, tzMinOffset = null,
			pmHour = false;
		// iterate the format groups to extract and set the date fields.
		for ( var j = 0, jl = groups.length; j < jl; j++ ) {
			var matchGroup = match[ j + 1 ];
			if ( matchGroup ) {
				var current = groups[ j ],
					clength = current.length,
					matchInt = parseInt( matchGroup, 10 );
				switch ( current ) {
					case "dd": case "d":
						// Day of month.
						date = matchInt;
						// check that date is generally in valid range, also checking overflow below.
						if ( outOfRange(date, 1, 31) ) return null;
						break;
					case "MMM": case "MMMM":
						month = getMonthIndex( cal, matchGroup, clength === 3 );
						if ( outOfRange(month, 0, 11) ) return null;
						break;
					case "M": case "MM":
						// Month.
						month = matchInt - 1;
						if ( outOfRange(month, 0, 11) ) return null;
						break;
					case "y": case "yy":
					case "yyyy":
						year = clength < 4 ? expandYear( cal, matchInt ) : matchInt;
						if ( outOfRange(year, 0, 9999) ) return null;
						break;
					case "h": case "hh":
						// Hours (12-hour clock).
						hour = matchInt;
						if ( hour === 12 ) hour = 0;
						if ( outOfRange(hour, 0, 11) ) return null;
						break;
					case "H": case "HH":
						// Hours (24-hour clock).
						hour = matchInt;
						if ( outOfRange(hour, 0, 23) ) return null;
						break;
					case "m": case "mm":
						// Minutes.
						min = matchInt;
						if ( outOfRange(min, 0, 59) ) return null;
						break;
					case "s": case "ss":
						// Seconds.
						sec = matchInt;
						if ( outOfRange(sec, 0, 59) ) return null;
						break;
					case "tt": case "t":
						// AM/PM designator.
						// see if it is standard, upper, or lower case PM. If not, ensure it is at least one of
						// the AM tokens. If not, fail the parse for this format.
						pmHour = cal.PM && ( matchGroup === cal.PM[0] || matchGroup === cal.PM[1] || matchGroup === cal.PM[2] );
						if (
							!pmHour && (
								!cal.AM || ( matchGroup !== cal.AM[0] && matchGroup !== cal.AM[1] && matchGroup !== cal.AM[2] )
							)
						) return null;
						break;
					case "f":
						// Deciseconds.
					case "ff":
						// Centiseconds.
					case "fff":
						// Milliseconds.
						msec = matchInt * Math.pow( 10, 3 - clength );
						if ( outOfRange(msec, 0, 999) ) return null;
						break;
					case "ddd":
						// Day of week.
					case "dddd":
						// Day of week.
						weekDay = getDayIndex( cal, matchGroup, clength === 3 );
						if ( outOfRange(weekDay, 0, 6) ) return null;
						break;
					case "zzz":
						// Time zone offset in +/- hours:min.
						var offsets = matchGroup.split( /:/ );
						if ( offsets.length !== 2 ) return null;
						hourOffset = parseInt( offsets[0], 10 );
						if ( outOfRange(hourOffset, -12, 13) ) return null;
						var minOffset = parseInt( offsets[1], 10 );
						if ( outOfRange(minOffset, 0, 59) ) return null;
						tzMinOffset = ( hourOffset * 60 ) + ( startsWith(matchGroup, "-") ? -minOffset : minOffset );
						break;
					case "z": case "zz":
						// Time zone offset in +/- hours.
						hourOffset = matchInt;
						if ( outOfRange(hourOffset, -12, 13) ) return null;
						tzMinOffset = hourOffset * 60;
						break;
					case "g": case "gg":
						var eraName = matchGroup;
						if ( !eraName || !cal.eras ) return null;
						eraName = trim( eraName.toLowerCase() );
						for ( var i = 0, l = cal.eras.length; i < l; i++ ) {
							if ( eraName === cal.eras[i].name.toLowerCase() ) {
								era = i;
								break;
							}
						}
						// could not find an era with that name
						if ( era === null ) return null;
						break;
				}
			}
		}
		var result = new Date(), defaultYear, convert = cal.convert;
		defaultYear = convert ? convert.fromGregorian( result )[ 0 ] : result.getFullYear();
		if ( year === null ) {
			year = defaultYear;
		}
		else if ( cal.eras ) {
			// year must be shifted to normal gregorian year
			// but not if year was not specified, its already normal gregorian
			// per the main if clause above.
			year += cal.eras[( era || 0 )].offset;
		}
		// set default day and month to 1 and January, so if unspecified, these are the defaults
		// instead of the current day/month.
		if ( month === null ) {
			month = 0;
		}
		if ( date === null ) {
			date = 1;
		}
		// now have year, month, and date, but in the culture's calendar.
		// convert to gregorian if necessary
		if ( convert ) {
			result = convert.toGregorian( year, month, date );
			// conversion failed, must be an invalid match
			if ( result === null ) return null;
		}
		else {
			// have to set year, month and date together to avoid overflow based on current date.
			result.setFullYear( year, month, date );
			// check to see if date overflowed for specified month (only checked 1-31 above).
			if ( result.getDate() !== date ) return null;
			// invalid day of week.
			if ( weekDay !== null && result.getDay() !== weekDay ) {
				return null;
			}
		}
		// if pm designator token was found make sure the hours fit the 24-hour clock.
		if ( pmHour && hour < 12 ) {
			hour += 12;
		}
		result.setHours( hour, min, sec, msec );
		if ( tzMinOffset !== null ) {
			// adjust timezone to utc before applying local offset.
			var adjustedMin = result.getMinutes() - ( tzMinOffset + result.getTimezoneOffset() );
			// Safari limits hours and minutes to the range of -127 to 127.  We need to use setHours
			// to ensure both these fields will not exceed this range.	adjustedMin will range
			// somewhere between -1440 and 1500, so we only need to split this into hours.
			result.setHours( result.getHours() + parseInt(adjustedMin / 60, 10), adjustedMin % 60 );
		}
		return result;
	};
}());

parseNegativePattern = function( value, nf, negativePattern ) {
	var neg = nf[ "-" ],
		pos = nf[ "+" ],
		ret;
	switch ( negativePattern ) {
		case "n -":
			neg = " " + neg;
			pos = " " + pos;
			/* falls through */
		case "n-":
			if ( endsWith(value, neg) ) {
				ret = [ "-", value.substr(0, value.length - neg.length) ];
			}
			else if ( endsWith(value, pos) ) {
				ret = [ "+", value.substr(0, value.length - pos.length) ];
			}
			break;
		case "- n":
			neg += " ";
			pos += " ";
			/* falls through */
		case "-n":
			if ( startsWith(value, neg) ) {
				ret = [ "-", value.substr(neg.length) ];
			}
			else if ( startsWith(value, pos) ) {
				ret = [ "+", value.substr(pos.length) ];
			}
			break;
		case "(n)":
			if ( startsWith(value, "(") && endsWith(value, ")") ) {
				ret = [ "-", value.substr(1, value.length - 2) ];
			}
			break;
	}
	return ret || [ "", value ];
};

//
// public instance functions
//

Globalize.prototype.findClosestCulture = function( cultureSelector ) {
	return Globalize.findClosestCulture.call( this, cultureSelector );
};

Globalize.prototype.format = function( value, format, cultureSelector ) {
	return Globalize.format.call( this, value, format, cultureSelector );
};

Globalize.prototype.localize = function( key, cultureSelector ) {
	return Globalize.localize.call( this, key, cultureSelector );
};

Globalize.prototype.parseInt = function( value, radix, cultureSelector ) {
	return Globalize.parseInt.call( this, value, radix, cultureSelector );
};

Globalize.prototype.parseFloat = function( value, radix, cultureSelector ) {
	return Globalize.parseFloat.call( this, value, radix, cultureSelector );
};

Globalize.prototype.culture = function( cultureSelector ) {
	return Globalize.culture.call( this, cultureSelector );
};

//
// public singleton functions
//

Globalize.addCultureInfo = function( cultureName, baseCultureName, info ) {

	var base = {},
		isNew = false;

	if ( typeof cultureName !== "string" ) {
		// cultureName argument is optional string. If not specified, assume info is first
		// and only argument. Specified info deep-extends current culture.
		info = cultureName;
		cultureName = this.culture().name;
		base = this.cultures[ cultureName ];
	} else if ( typeof baseCultureName !== "string" ) {
		// baseCultureName argument is optional string. If not specified, assume info is second
		// argument. Specified info deep-extends specified culture.
		// If specified culture does not exist, create by deep-extending default
		info = baseCultureName;
		isNew = ( this.cultures[ cultureName ] == null );
		base = this.cultures[ cultureName ] || this.cultures[ "default" ];
	} else {
		// cultureName and baseCultureName specified. Assume a new culture is being created
		// by deep-extending an specified base culture
		isNew = true;
		base = this.cultures[ baseCultureName ];
	}

	this.cultures[ cultureName ] = extend(true, {},
		base,
		info
	);
	// Make the standard calendar the current culture if it's a new culture
	if ( isNew ) {
		this.cultures[ cultureName ].calendar = this.cultures[ cultureName ].calendars.standard;
	}
};

Globalize.findClosestCulture = function( name ) {
	var match;
	if ( !name ) {
		return this.findClosestCulture( this.cultureSelector ) || this.cultures[ "default" ];
	}
	if ( typeof name === "string" ) {
		name = name.split( "," );
	}
	if ( isArray(name) ) {
		var lang,
			cultures = this.cultures,
			list = name,
			i, l = list.length,
			prioritized = [];
		for ( i = 0; i < l; i++ ) {
			name = trim( list[i] );
			var pri, parts = name.split( ";" );
			lang = trim( parts[0] );
			if ( parts.length === 1 ) {
				pri = 1;
			}
			else {
				name = trim( parts[1] );
				if ( name.indexOf("q=") === 0 ) {
					name = name.substr( 2 );
					pri = parseFloat( name );
					pri = isNaN( pri ) ? 0 : pri;
				}
				else {
					pri = 1;
				}
			}
			prioritized.push({ lang: lang, pri: pri });
		}
		prioritized.sort(function( a, b ) {
			if ( a.pri < b.pri ) {
				return 1;
			} else if ( a.pri > b.pri ) {
				return -1;
			}
			return 0;
		});
		// exact match
		for ( i = 0; i < l; i++ ) {
			lang = prioritized[ i ].lang;
			match = cultures[ lang ];
			if ( match ) {
				return match;
			}
		}

		// neutral language match
		for ( i = 0; i < l; i++ ) {
			lang = prioritized[ i ].lang;
			do {
				var index = lang.lastIndexOf( "-" );
				if ( index === -1 ) {
					break;
				}
				// strip off the last part. e.g. en-US => en
				lang = lang.substr( 0, index );
				match = cultures[ lang ];
				if ( match ) {
					return match;
				}
			}
			while ( 1 );
		}

		// last resort: match first culture using that language
		for ( i = 0; i < l; i++ ) {
			lang = prioritized[ i ].lang;
			for ( var cultureKey in cultures ) {
				var culture = cultures[ cultureKey ];
				if ( culture.language == lang ) {
					return culture;
				}
			}
		}
	}
	else if ( typeof name === "object" ) {
		return name;
	}
	return match || null;
};

Globalize.format = function( value, format, cultureSelector ) {
	var culture = this.findClosestCulture( cultureSelector );
	if ( value instanceof Date ) {
		value = formatDate( value, format, culture );
	}
	else if ( typeof value === "number" ) {
		value = formatNumber( value, format, culture );
	}
	return value;
};

Globalize.localize = function( key, cultureSelector ) {
	return this.findClosestCulture( cultureSelector ).messages[ key ] ||
		this.cultures[ "default" ].messages[ key ];
};

Globalize.parseDate = function( value, formats, culture ) {
	culture = this.findClosestCulture( culture );

	var date, prop, patterns;
	if ( formats ) {
		if ( typeof formats === "string" ) {
			formats = [ formats ];
		}
		if ( formats.length ) {
			for ( var i = 0, l = formats.length; i < l; i++ ) {
				var format = formats[ i ];
				if ( format ) {
					date = parseExact( value, format, culture );
					if ( date ) {
						break;
					}
				}
			}
		}
	} else {
		patterns = culture.calendar.patterns;
		for ( prop in patterns ) {
			date = parseExact( value, patterns[prop], culture );
			if ( date ) {
				break;
			}
		}
	}

	return date || null;
};

Globalize.parseInt = function( value, radix, cultureSelector ) {
	return truncate( Globalize.parseFloat(value, radix, cultureSelector) );
};

Globalize.parseFloat = function( value, radix, cultureSelector ) {
	// radix argument is optional
	if ( typeof radix !== "number" ) {
		cultureSelector = radix;
		radix = 10;
	}

	var culture = this.findClosestCulture( cultureSelector );
	var ret = NaN,
		nf = culture.numberFormat;

	if ( value.indexOf(culture.numberFormat.currency.symbol) > -1 ) {
		// remove currency symbol
		value = value.replace( culture.numberFormat.currency.symbol, "" );
		// replace decimal seperator
		value = value.replace( culture.numberFormat.currency["."], culture.numberFormat["."] );
	}

	//Remove percentage character from number string before parsing
	if ( value.indexOf(culture.numberFormat.percent.symbol) > -1){
		value = value.replace( culture.numberFormat.percent.symbol, "" );
	}

	// remove spaces: leading, trailing and between - and number. Used for negative currency pt-BR
	value = value.replace( / /g, "" );

	// allow infinity or hexidecimal
	if ( regexInfinity.test(value) ) {
		ret = parseFloat( value );
	}
	else if ( !radix && regexHex.test(value) ) {
		ret = parseInt( value, 16 );
	}
	else {

		// determine sign and number
		var signInfo = parseNegativePattern( value, nf, nf.pattern[0] ),
			sign = signInfo[ 0 ],
			num = signInfo[ 1 ];

		// #44 - try parsing as "(n)"
		if ( sign === "" && nf.pattern[0] !== "(n)" ) {
			signInfo = parseNegativePattern( value, nf, "(n)" );
			sign = signInfo[ 0 ];
			num = signInfo[ 1 ];
		}

		// try parsing as "-n"
		if ( sign === "" && nf.pattern[0] !== "-n" ) {
			signInfo = parseNegativePattern( value, nf, "-n" );
			sign = signInfo[ 0 ];
			num = signInfo[ 1 ];
		}

		sign = sign || "+";

		// determine exponent and number
		var exponent,
			intAndFraction,
			exponentPos = num.indexOf( "e" );
		if ( exponentPos < 0 ) exponentPos = num.indexOf( "E" );
		if ( exponentPos < 0 ) {
			intAndFraction = num;
			exponent = null;
		}
		else {
			intAndFraction = num.substr( 0, exponentPos );
			exponent = num.substr( exponentPos + 1 );
		}
		// determine decimal position
		var integer,
			fraction,
			decSep = nf[ "." ],
			decimalPos = intAndFraction.indexOf( decSep );
		if ( decimalPos < 0 ) {
			integer = intAndFraction;
			fraction = null;
		}
		else {
			integer = intAndFraction.substr( 0, decimalPos );
			fraction = intAndFraction.substr( decimalPos + decSep.length );
		}
		// handle groups (e.g. 1,000,000)
		var groupSep = nf[ "," ];
		integer = integer.split( groupSep ).join( "" );
		var altGroupSep = groupSep.replace( /\u00A0/g, " " );
		if ( groupSep !== altGroupSep ) {
			integer = integer.split( altGroupSep ).join( "" );
		}
		// build a natively parsable number string
		var p = sign + integer;
		if ( fraction !== null ) {
			p += "." + fraction;
		}
		if ( exponent !== null ) {
			// exponent itself may have a number patternd
			var expSignInfo = parseNegativePattern( exponent, nf, "-n" );
			p += "e" + ( expSignInfo[0] || "+" ) + expSignInfo[ 1 ];
		}
		if ( regexParseFloat.test(p) ) {
			ret = parseFloat( p );
		}
	}
	return ret;
};

Globalize.culture = function( cultureSelector ) {
	// setter
	if ( typeof cultureSelector !== "undefined" ) {
		this.cultureSelector = cultureSelector;
	}
	// getter
	return this.findClosestCulture( cultureSelector ) || this.cultures[ "default" ];
};

}( this ));

},{}],62:[function(require,module,exports){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ExecutionEnvironment
 */

/*jslint evil: true */

"use strict";

var canUseDOM = !!(
  (typeof window !== 'undefined' &&
  window.document && window.document.createElement)
);

/**
 * Simple, lightweight module assisting with the detection and context of
 * Worker. Helps avoid circular dependencies and allows code to reason about
 * whether or not they are in a Worker, even if they never include the main
 * `ReactWorker` dependency.
 */
var ExecutionEnvironment = {

  canUseDOM: canUseDOM,

  canUseWorkers: typeof Worker !== 'undefined',

  canUseEventListeners:
    canUseDOM && !!(window.addEventListener || window.attachEvent),

  canUseViewport: canUseDOM && !!window.screen,

  isInWorker: !canUseDOM // For now, this is true - might change in the future.

};

module.exports = ExecutionEnvironment;

},{}],63:[function(require,module,exports){
/**
 * Copyright 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Object.assign
 */

// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign

'use strict';

function assign(target, sources) {
  if (target == null) {
    throw new TypeError('Object.assign target cannot be null or undefined');
  }

  var to = Object(target);
  var hasOwnProperty = Object.prototype.hasOwnProperty;

  for (var nextIndex = 1; nextIndex < arguments.length; nextIndex++) {
    var nextSource = arguments[nextIndex];
    if (nextSource == null) {
      continue;
    }

    var from = Object(nextSource);

    // We don't currently support accessors nor proxies. Therefore this
    // copy cannot throw. If we ever supported this then we must handle
    // exceptions and side-effects. We don't support symbols so they won't
    // be transferred.

    for (var key in from) {
      if (hasOwnProperty.call(from, key)) {
        to[key] = from[key];
      }
    }
  }

  return to;
}

module.exports = assign;

},{}],64:[function(require,module,exports){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule camelize
 * @typechecks
 */

var _hyphenPattern = /-(.)/g;

/**
 * Camelcases a hyphenated string, for example:
 *
 *   > camelize('background-color')
 *   < "backgroundColor"
 *
 * @param {string} string
 * @return {string}
 */
function camelize(string) {
  return string.replace(_hyphenPattern, function(_, character) {
    return character.toUpperCase();
  });
}

module.exports = camelize;

},{}],65:[function(require,module,exports){
/**
 * Copyright 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule camelizeStyleName
 * @typechecks
 */

"use strict";

var camelize = require("./camelize");

var msPattern = /^-ms-/;

/**
 * Camelcases a hyphenated CSS property name, for example:
 *
 *   > camelizeStyleName('background-color')
 *   < "backgroundColor"
 *   > camelizeStyleName('-moz-transition')
 *   < "MozTransition"
 *   > camelizeStyleName('-ms-transition')
 *   < "msTransition"
 *
 * As Andi Smith suggests
 * (http://www.andismith.com/blog/2012/02/modernizr-prefixed/), an `-ms` prefix
 * is converted to lowercase `ms`.
 *
 * @param {string} string
 * @return {string}
 */
function camelizeStyleName(string) {
  return camelize(string.replace(msPattern, 'ms-'));
}

module.exports = camelizeStyleName;

},{"./camelize":64}],66:[function(require,module,exports){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule emptyFunction
 */

function makeEmptyFunction(arg) {
  return function() {
    return arg;
  };
}

/**
 * This function accepts and discards inputs; it has no side effects. This is
 * primarily useful idiomatically for overridable function endpoints which
 * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
 */
function emptyFunction() {}

emptyFunction.thatReturns = makeEmptyFunction;
emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
emptyFunction.thatReturnsNull = makeEmptyFunction(null);
emptyFunction.thatReturnsThis = function() { return this; };
emptyFunction.thatReturnsArgument = function(arg) { return arg; };

module.exports = emptyFunction;

},{}],67:[function(require,module,exports){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule getActiveElement
 * @typechecks
 */

/**
 * Same as document.activeElement but wraps in a try-catch block. In IE it is
 * not safe to call document.activeElement if there is nothing focused.
 *
 * The activeElement will be null only if the document body is not yet defined.
 */
function getActiveElement() /*?DOMElement*/ {
  try {
    return document.activeElement || document.body;
  } catch (e) {
    return document.body;
  }
}

module.exports = getActiveElement;

},{}],68:[function(require,module,exports){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule hyphenate
 * @typechecks
 */

var _uppercasePattern = /([A-Z])/g;

/**
 * Hyphenates a camelcased string, for example:
 *
 *   > hyphenate('backgroundColor')
 *   < "background-color"
 *
 * For CSS style names, use `hyphenateStyleName` instead which works properly
 * with all vendor prefixes, including `ms`.
 *
 * @param {string} string
 * @return {string}
 */
function hyphenate(string) {
  return string.replace(_uppercasePattern, '-$1').toLowerCase();
}

module.exports = hyphenate;

},{}],69:[function(require,module,exports){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule hyphenateStyleName
 * @typechecks
 */

"use strict";

var hyphenate = require("./hyphenate");

var msPattern = /^ms-/;

/**
 * Hyphenates a camelcased CSS property name, for example:
 *
 *   > hyphenateStyleName('backgroundColor')
 *   < "background-color"
 *   > hyphenateStyleName('MozTransition')
 *   < "-moz-transition"
 *   > hyphenateStyleName('msTransition')
 *   < "-ms-transition"
 *
 * As Modernizr suggests (http://modernizr.com/docs/#prefixed), an `ms` prefix
 * is converted to `-ms-`.
 *
 * @param {string} string
 * @return {string}
 */
function hyphenateStyleName(string) {
  return hyphenate(string).replace(msPattern, '-ms-');
}

module.exports = hyphenateStyleName;

},{"./hyphenate":68}],70:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if ("production" !== process.env.NODE_ENV) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

}).call(this,require('_process'))
},{"_process":58}],71:[function(require,module,exports){
(function (process){
/**
 * Copyright 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule warning
 */

"use strict";

var emptyFunction = require("./emptyFunction");

/**
 * Similar to invariant but only logs a warning if the condition is not met.
 * This can be used to log issues in development environments in critical
 * paths. Removing the logging code for production environments will keep the
 * same logic and follow the same code paths.
 */

var warning = emptyFunction;

if ("production" !== process.env.NODE_ENV) {
  warning = function(condition, format ) {for (var args=[],$__0=2,$__1=arguments.length;$__0<$__1;$__0++) args.push(arguments[$__0]);
    if (format === undefined) {
      throw new Error(
        '`warning(condition, format, ...args)` requires a warning ' +
        'message argument'
      );
    }

    if (format.length < 10 || /^[s\W]*$/.test(format)) {
      throw new Error(
        'The warning format should be able to uniquely identify this ' +
        'warning. Please, use a more descriptive format than: ' + format
      );
    }

    if (format.indexOf('Failed Composite propType: ') === 0) {
      return; // Ignore CompositeComponent proptype check.
    }

    if (!condition) {
      var argIndex = 0;
      var message = 'Warning: ' + format.replace(/%s/g, function()  {return args[argIndex++];});
      console.warn(message);
      try {
        // --- Welcome to debugging React ---
        // This error was thrown as a convenience so that you can use this stack
        // to find the callsite that caused this warning to fire.
        throw new Error(message);
      } catch(x) {}
    }
  };
}

module.exports = warning;

}).call(this,require('_process'))
},{"./emptyFunction":66,"_process":58}],72:[function(require,module,exports){
(function (process){
"use strict";
var babelHelpers = require("./util/babelHelpers.js");
var React = require("react");
var invariant = require("react/lib/invariant");

function customPropType(handler, propType, name) {

  return function (props, propName, componentName, location) {

    if (props[propName] !== undefined) {
      if (!props[handler]) return new Error("You have provided a `" + propName + "` prop to " + "`" + name + "` without an `" + handler + "` handler. This will render a read-only field. " + "If the field should be mutable use `" + defaultKey(propName) + "`. Otherwise, set `" + handler + "`");

      return propType && propType(props, propName, name, location);
    }
  };
}

var version = React.version.split(".").map(parseFloat);

function getType(component) {
  if (version[0] === 0 && version[1] >= 13) return component;

  return component.type;
}

module.exports = function (Component, controlledValues, taps) {
  var name = Component.displayName || Component.name || "Component",
      types = {};

  if (process.env.NODE_ENV !== "production" && getType(Component).propTypes) {
    types = transform(controlledValues, function (obj, handler, prop) {
      var type = getType(Component).propTypes[prop];

      invariant(typeof handler === "string" && handler.trim().length, "Uncontrollable - [%s]: the prop `%s` needs a valid handler key name in order to make it uncontrollable", Component.displayName, prop);

      obj[prop] = customPropType(handler, type, Component.displayName);
      if (type !== undefined) {
        obj[defaultKey(prop)] = type;
      }
    }, {});
  }

  name = name[0].toUpperCase() + name.substr(1);

  taps = taps || {};

  return React.createClass({

    displayName: "Uncontrolled" + name,

    propTypes: types,

    getInitialState: function () {
      var props = this.props,
          keys = Object.keys(controlledValues);

      return transform(keys, function (state, key) {
        state[key] = props[defaultKey(key)];
      }, {});
    },

    shouldComponentUpdate: function () {
      //let the setState trigger the update
      return !this._notifying;
    },

    render: function () {
      var _this = this;

      var props = {};

      each(controlledValues, function (handle, prop) {

        props[prop] = isProp(_this.props, prop) ? _this.props[prop] : _this.state[prop];

        props[handle] = setAndNotify.bind(_this, prop);
      });

      props = babelHelpers._extends({}, this.props, props);

      each(taps, function (val, key) {
        return props[key] = chain(_this, val, props[key]);
      });

      return React.createElement(Component, props);
    }
  });

  function setAndNotify(prop, value) {
    for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }

    var handler = controlledValues[prop],
        controlled = handler && isProp(this.props, prop),
        args;

    if (this.props[handler]) {
      var _props$handler;

      this._notifying = true;
      (_props$handler = this.props[handler]).call.apply(_props$handler, [this, value].concat(args));
      this._notifying = false;
    }

    this.setState((function () {
      var _setState = {};
      _setState[prop] = value;
      return _setState;
    })());

    return !controlled;
  }

  function isProp(props, prop) {
    return props[prop] !== undefined;
  }
};

function defaultKey(key) {
  return "default" + key.charAt(0).toUpperCase() + key.substr(1);
}

function chain(thisArg, a, b) {
  return function chainedFunction() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    a && a.call.apply(a, [thisArg].concat(args));
    b && b.call.apply(b, [thisArg].concat(args));
  };
}

function transform(obj, cb, seed) {
  each(obj, cb.bind(null, seed = seed || (Array.isArray(obj) ? [] : {})));
  return seed;
}

function each(obj, cb, thisArg) {
  if (Array.isArray(obj)) return obj.forEach(cb, thisArg);

  for (var key in obj) if (has(obj, key)) cb.call(thisArg, obj[key], key, obj);
}

function has(o, k) {
  return o ? Object.prototype.hasOwnProperty.call(o, k) : false;
}
}).call(this,require('_process'))
},{"./util/babelHelpers.js":73,"_process":58,"react":undefined,"react/lib/invariant":70}],73:[function(require,module,exports){
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports"], factory);
  } else if (typeof exports === "object") {
    factory(exports);
  } else {
    factory(root.babelHelpers = {});
  }
})(this, function (global) {
  var babelHelpers = global;

  babelHelpers._extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };
})
},{}]},{},[1])(1)
});