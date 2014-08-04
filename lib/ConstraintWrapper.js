/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var ConstraintWrapper = function(inst, monitor, field) {
	this._inst = inst;
	this._constraint = {
		monitor: monitor,
		field: field
	};
};

ConstraintWrapper.prototype.equals = function(val) {
	this._pushRule('equal', val);
};

ConstraintWrapper.prototype.greaterThan = function(num) {
	this._pushRule('greater', num);
};

ConstraintWrapper.prototype.lessThan = function(num) {
	this._pushRule('less', num);
};

ConstraintWrapper.prototype._pushRule = function(comparator, value) {
	this._constraint.comparator = comparator;
	this._constraint.value = value;
	this._inst.addConstraint(this._constraint);
};

ConstraintWrapper.prototype.__defineGetter__('not', function() {
	this._constraint.negate = !this._constraint.negate;
	return this;
});

module.exports = ConstraintWrapper;
