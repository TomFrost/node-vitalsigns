/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

const DEFAULT_AUTOCHECK = 5000;
const DEFAULT_HTTP_HEALTHY = 200;
const DEFAULT_HTTP_UNHEALTHY = 503;

var builtIn = require('./monitors'),
	ConstraintWrapper = require('./ConstraintWrapper'),
	Comparators = require('./Comparators'),
	util = require('util'),
	events = require('events'),
	objUtil = require('./util/Object');

/**
 * Constructs a new instance of VitalSigns
 * @param {Object} options An optional mapping of options to values
 * @param {boolean|number} [options.autoCheck=false] The number of milliseconds
 *      to wait between automatic health checks, or false to disable.
 *      Alternatively, true can be specified to auto-check every 5 seconds.
 * @param {number} [options.httpHealthy=200] The HTTP response code to send
 *      back in the HTTP endpoints when the server is healthy
 * @param {number} [options.httpUnhealthy=503] The HTTP response code to send
 *      back in the HTTP endpoints when the server is unhealthy
 * @constructor
 */
var VitalSigns = function(options) {
	if (!options)
		options = {};
	this._opts = options;
	this._monitors = {};
	this._constraints = [];
	this._failed = [];
	this._autoCheck = null;
	this._lastCheckHealthy = true;
	if (options.autoCheck) {
		this._autoCheck = setInterval(this.isHealthy.bind(this),
			options.autoCheck === true ? DEFAULT_AUTOCHECK :
				options.autoCheck);
	}

	this.express = expressEndpoint.bind(this);
	this.hapi = hapiEndpoint.bind(this);
};
util.inherits(VitalSigns, events.EventEmitter);

/**
 * Pushes a health constraint onto this instance's constraint array. Health
 * constraints define scenarios in which VitalSigns will consider the
 * application to be in an unhealthy state.
 * @param {{monitor: string, field: string, comparator: string, value: *,
 *      [negate]: boolean}} constraint A constraint object
 * @param {string} constraint.monitor The name of the monitor containing the
 *      field to be constrained
 * @param {string} constraint.field The name of the field to be constrained
 * @param {string} constraint.comparator The comparator to use when comparing
 *      the field's value with the constraint value.  Valid comparators are:
 *      'equal', 'greater', and 'less'.
 * @param {*} constraint.value The value against which the field should be
 *      compared
 * @param {boolean} [constraint.negate=false] true to negate the outcome of
 *      the comparison; false or omitted to use the comparison result
 */
VitalSigns.prototype.addConstraint = function(constraint) {
	this._constraints.push(constraint);
};

/**
 * Destroys this VitalSigns instance. Instances can not be re-activated after
 * being destroyed.  This will halt the 'autoCheck' timer (if specified in the
 * constructor options), remove all event listeners, and call the destroy
 * method for any added monitors.
 */
VitalSigns.prototype.destroy = function() {
	if (this._autoCheck) {
		clearInterval(this._autoCheck);
		this._autoCheck = null;
	}
	this.removeAllListeners();
	for (var modName in this._monitors) {
		if (this._monitors.hasOwnProperty(modName) &&
				this._monitors[modName].destroy)
			this._monitors[modName].destroy();
	}
};

/**
 * Retrieves an array of human-readable messages that define the specific
 * health constraints that failed when running the last health check.
 * @returns {Array<string>} An array of failure messages
 */
VitalSigns.prototype.getFailed = function() {
	return this._failed;
};

/**
 * Gets a report of all monitors, their fields, and the values of those fields,
 * compiled into Javascript object form.  Additionally, a 'healthy' field is
 * attached. This field will be boolean true if all health constraints passed;
 * false otherwise.
 * @param {Object} [opts] A mapping of options to customize this report
 * @param {boolean} [opts.flatten=false] true to flatten the report object down
 *      to a single level by concatenating nested key names; false to keep the
 *      default hierarchical format.
 * @param {string} [opts.separator="."] If flatten is true, this string will be
 *      used to separate key names when they are concatenated together.
 * @returns {{}} A full health report
 */
VitalSigns.prototype.getReport = function(opts) {
	if (!opts) opts = {};
	var report = this._getRawReport();
	report.healthy = this.isHealthy(report);
	if (opts.flatten)
		report = objUtil.flatten(report, null, opts.separator);
	return report;
};

/**
 * Generates a health report and checks each health constraint against it.
 * Any constraints that fail will be added to the 'failed' array in the form of
 * a human-readable failure message, which can be retrieved with
 * {@link #getFailed}.
 * @param {{}} [report] A report object on which to run the health constraints.
 *      If omitted, this function will generate a health report automatically.
 * @returns {boolean} true if all health constraints passed; false otherwise.
 */
VitalSigns.prototype.isHealthy = function(report) {
	if (!report)
		report = this._getRawReport();
	var fails = [],
		failMsg = '%s.%s %s %s',
		_this = this;
	this._constraints.forEach(function(constraint) {
		if (_this._constraintHit(constraint, report)) {
			var msg = util.format(failMsg, constraint.monitor, constraint.field,
				Comparators[constraint.comparator].text,
				constraint.value + '');
			fails.push(msg);
		}
	});
	this._failed = fails;
	var healthy = !fails.length;
	this.emit('healthCheck', healthy, report, fails);
	if (healthy != this._lastCheckHealthy) {
		this.emit('healthChange', healthy, report, fails);
		this._lastCheckHealthy = healthy;
	}
	return healthy;
};

/**
 * Defines a new health constraint in a chainable, more easily readable format.
 * When called with the monitor name and field name of concern, a wrapper is
 * returned that allows the constraint to be built out with function calls.
 * For example:
 *
 *      vitals.unhealthyWhen('cpu', 'usage').greaterThan(90);
 *
 * The constraint can be negated by adding 'not' to the chain as well:
 *
 *      vitals.unhealthyWhen('app', 'uncaughtErrors').not.equals(0);
 *
 * Valid comparison functions are greaterThan(number), lessThan(number), and
 * equals(*).
 * @param {string} monitorName The name of the monitor containing the field to
 *      be checked
 * @param {string} fieldName The name of the field to be checked in this health
 *      constraint
 * @returns {ConstraintWrapper} A wrapper object containing chainable functions
 *      that define the constraint to be added.
 */
VitalSigns.prototype.unhealthyWhen = function(monitorName, fieldName) {
	if (!this._monitors.hasOwnProperty(monitorName))
		throw new Error('Monitor "' + monitorName + '" is not loaded.');
	return new ConstraintWrapper(this, monitorName, fieldName);
};

/**
 * Instructs VitalSigns to monitor some value or set of values.  Monitors can
 * take on various forms:
 *
 *      Built-in: VitalSigns contains a set of built-in monitors (see the
 *          'monitors' folder) which can be added by name.  For example,
 *          vitals.monitor('cpu').  Additionally, any health monitor that can
 *          be require()d by name can also be passed.  For example, 'appHealth'
 *          would trigger vitalSigns to call this.monitor(require('appHealth'))
 *
 *      Object with report function: An object containing a function called
 *          'report' that, when run, returns an object containing the fields
 *          and values to be added to the health report.  Optionally, a default
 *          monitor name can be specified in the 'name' field.  For example:
 *
 *              {
 *                  name: 'app',
 *                  report: function() {
 *                      return {
 *                          connections: myApp.connections.length,
 *                          shuttingDown: myApp.isShuttingDown()
 *                      };
 *                  }
 *              }
 *
 *          The 'report' function will be called every time a health report
 *          needs to be generated.
 *
 *      Object with included fields: A object containing all the fields to be
 *          monitored.  Fields can be mapped to either static values, or
 *          functions that will be called to generate that field's value every
 *          time a report is run.  For example:
 *
 *              {
 *                  connections: function() { return myApp.connections.length },
 *                  host: os.hostname()
 *              }
 *
 *      Generated: A function that returns one of the monitor object types
 *          defined above. The provided 'options' object will be passed to it
 *          when it's called. This function will be called only once.
 * @param {string|{[name]: string}|function} monitor A string, object, or
 *      function as defined above
 * @param {Object} options An options mapping to be considered when adding the
 *      given monitor.  If the given monitor is a function, this object will
 *      be passed to it as its first argument when the function is called.
 * @param {string} [options.name=default] The name under which to store this
 *      monitor.  If not specified, module.name will be used (if present).  If
 *      that does not exist, 'default' will be used.
 */
VitalSigns.prototype.monitor = function(monitor, options) {
	if (!options)
		options = {};
	if (typeof monitor == 'string')
		monitor = this._getModuleByName(monitor);
	if (typeof monitor == 'function')
		monitor = monitor(options);
	if (typeof monitor != 'object')
		throw new Error("Monitor must be either a function or object.");
	var name = options.name || monitor.name || 'default';
	if (!this._monitors[name])
		this._monitors[name] = {};
	for (var i in monitor) {
		if (monitor.hasOwnProperty(i))
			this._monitors[name][i] = monitor[i];
	}
};

/**
 * Determines whether the provided health report violates a set health
 * constraint.
 * @param {{monitor: string, field: string, comparator: string, value: *,
 *      [negate]: boolean}} constraint The constraint object to check against
 *      the provided report
 * @param {Object} report A health report
 * @returns {boolean} true if the constraint is violated; false otherwise
 * @private
 */
VitalSigns.prototype._constraintHit = function(constraint, report) {
	var value,
		comparator,
		result;

	if (!report[constraint.monitor])
		return false;
	if (!report[constraint.monitor].hasOwnProperty(constraint.field)) {
		if (typeof report[constraint.monitor] === 'object')
			return false;
		else
			value = report[constraint.monitor];
	}
	else
		value = report[constraint.monitor][constraint.field];

	comparator = Comparators[constraint.comparator].func;
	result = comparator(value, constraint.value);

	return constraint.negate ? !result : result;
};

/**
 * Loads a monitor by first checking to see whether the name matches a built-in
 * module, or, if not, attempting to require() that monitor name.
 * @param {string} name The name of the module to be loaded
 * @returns {Object} The loaded monitor
 * @private
 */
VitalSigns.prototype._getModuleByName = function(name) {
	var mod;
	if (builtIn.hasOwnProperty(name))
		mod = builtIn[name];
	else
		mod = require(name);
	if (!mod.name)
		mod.name = name;
	return mod;
};

/**
 * Generates the report for an individual health monitor.
 * @param {{[report]: function}|function} monitor The health monitor from which
 *      the report should be generated
 * @returns {Object} The generated report
 * @private
 */
VitalSigns.prototype._getModuleReport = function(monitor) {
	var report;
	if (typeof monitor == 'function')
		return this._getModuleReport(monitor());
	if (monitor.report && typeof monitor.report == 'function')
		report = monitor.report();
	else
		report = shallowClone(monitor);
	for (var field in report) {
		if (report.hasOwnProperty(field)) {
			if (typeof report[field] == 'function')
				report[field] = report[field]();
		}
	}
	return report;
};

/**
 * Generates a health report by getting the report of each individual monitor
 * and adding each to a parent object, using their monitor name as the key
 * name.  Note that this function does not invoke a health check; it simply
 * generates a report.
 * @returns {{}} The raw health report
 * @private
 */
VitalSigns.prototype._getRawReport = function() {
	var report = {};
	for (var modName in this._monitors) {
		if (this._monitors.hasOwnProperty(modName))
			report[modName] = this._getModuleReport(this._monitors[modName]);
	}
	return report;
};

/**
 * An endpoint suitable to attach to an Express route.  Note that this function
 * must be bound to a VitalSigns instance before being called.
 * @param req
 * @param res
 */
function expressEndpoint(req, res) {
	var report = this.getReport(),
		status = report.healthy ?
			(this._opts.httpHealthy || DEFAULT_HTTP_HEALTHY) :
			(this._opts.httpUnhealthy || DEFAULT_HTTP_UNHEALTHY);
	if (res.status)
		res.status(status).json(report);
	else
		res.json(status, report);
}

/**
 * An endpoint suitable to attach to a Hapi route.  Note that this function
 * must be bound to a VitalSigns instance before being called.
 * @param req
 * @param reply
 */
function hapiEndpoint(req, reply) {
	var report = this.getReport();
	reply(report).code(report.healthy ?
		(this._opts.httpHealthy || DEFAULT_HTTP_HEALTHY) :
		(this._opts.httpUnhealthy || DEFAULT_HTTP_UNHEALTHY));
}

/**
 * Generates a shallow, top-level clone of the given object.  Note that only
 * javascript natives will be cloned; for all others, the object reference will
 * be copied.
 * @param {Object} obj The object to be shallow-cloned
 * @returns {Object} The cloned object
 */
function shallowClone(obj) {
	var cloned = {};
	if (typeof obj == 'object') {
		for (var key in obj) {
			if (obj.hasOwnProperty(key))
				cloned[key] = obj[key];
		}
		return cloned;
	}
	return obj;
}

module.exports = VitalSigns;
