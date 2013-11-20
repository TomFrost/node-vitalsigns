/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

/**
 * Creates a new TimeCalcQueue, set to retain data for the specified number of
 * seconds.
 *
 * @param {Number} milliseconds The number of milliseconds for which values
 *      should be retained.
 * @constructor
 */
var TimeCalcQueue = function(milliseconds) {
	this.queue = [];
	this.limit = milliseconds;
};

/**
 * Gets the average of all values in the queue within the time frame.
 * @return {*} The average value of the queue, or null if the queue is
 *      empty.
 */
TimeCalcQueue.prototype.getAverage = function() {
	this.scrub();
	var sum = this.queue.reduce(function(sum, node) {
		return sum + node.value;
	}, 0);
	return this.queue.length ? sum / this.queue.length : null;
};

/**
 * Gets the number of values in the queue that were submitted within the set
 * time frame.
 * @return {Number} The number of items in the queue.
 */
TimeCalcQueue.prototype.getLength = function() {
	this.scrub();
	return this.queue.length;
};

/**
 * Gets the maximum of the values in the queue that were submitted within the
 * set time frame.
 * @return {*} The maximum value in the queue, or null if the queue is
 *      empty.
 */
TimeCalcQueue.prototype.getMaximum = function() {
	this.scrub();
	var max = this.queue.reduce(function(max, node) {
		return node.value > max ? node.value : max;
	}, -Infinity);
	return this.queue.length ? max : null;
};

/**
 * Gets the minimum of the values in the queue that were submitted within the
 * set time frame.
 * @return {*} The minimum value in the queue, or null if the queue is
 *      empty.
 */
TimeCalcQueue.prototype.getMinimum = function() {
	this.scrub();
	var min = this.queue.reduce(function(min, node) {
		return node.value < min ? node.value : min;
	}, Infinity);
	return this.queue.length ? min : null;
};

/**
 * Pushes a value onto the queue.  The value will be factored into any
 * calculations that happen until the value expires.
 * @param {Number} value A value to add to the queue.
 */
TimeCalcQueue.prototype.push = function(value) {
	this.scrub();
	this.queue.push({
		time: new Date().getTime(),
		value: value
	});
};

/**
 * Removes expired values from the queue.  This is called automatically before
 * any calculations are performed.
 */
TimeCalcQueue.prototype.scrub = function() {
	var floor = new Date().getTime() - this.limit;
	while (this.queue.length && this.queue[0].time < floor)
		this.queue.shift();
};

// Support for Node.js
if (module && module.hasOwnProperty('exports'))
	module.exports = TimeCalcQueue;
