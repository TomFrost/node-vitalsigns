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
	events = require('events');

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

VitalSigns.prototype.addConstraint = function(constraint) {
	this._constraints.push(constraint);
};

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

VitalSigns.prototype.getFailed = function() {
	return this._failed;
};

VitalSigns.prototype.getReport = function() {
	var report = this._getRawReport();
	report.healthy = this.isHealthy();
	return report;
};

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

VitalSigns.prototype.unhealthyWhen = function(monitorName, fieldName) {
	if (!this._monitors.hasOwnProperty(monitorName))
		throw new Error('Monitor "' + monitorName + '" is not loaded.');
	return new ConstraintWrapper(this, monitorName, fieldName);
};

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

VitalSigns.prototype._constraintHit = function(constraint, report) {
	var value,
		comparator,
		result;

	if (!report[constraint.monitor])
		return false;
	if (!report[constraint.monitor].hasOwnProperty(constraint.field))
		if (typeof report[constraint.monitor] === 'object')
			return false;
		else
			value = report[constraint.monitor];	
	else 
		value = report[constraint.monitor][constraint.field];		
	
	comparator = Comparators[constraint.comparator].func;
	result = comparator(value, constraint.value);	

	return constraint.negate ? !result : result;
};

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

VitalSigns.prototype._getModuleReport = function(monitor) {
	var report;
	if (typeof monitor == 'function')
		return this._getModuleReport(monitor());
	if (monitor.report && typeof monitor.report == 'function')
		report = monitor.report();
	else if (monitor.report)
		report = monitor.report;
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

VitalSigns.prototype._getRawReport = function() {
	var report = {};
	for (var modName in this._monitors) {
		if (this._monitors.hasOwnProperty(modName))
			report[modName] = this._getModuleReport(this._monitors[modName]);
	}
	return report;
};

function expressEndpoint(req, res) {
	var report = this.getReport();
	res.json(report, report.healthy ?
		(this._opts.httpHealthy || DEFAULT_HTTP_HEALTHY) :
		(this._opts.httpUnhealthy || DEFAULT_HTTP_UNHEALTHY));
}

function hapiEndpoint(req, reply) {
	var report = this.getReport();
	reply(report).code(report.healthy ?
		(this._opts.httpHealthy || DEFAULT_HTTP_HEALTHY) :
		(this._opts.httpUnhealthy || DEFAULT_HTTP_UNHEALTHY));
}

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
