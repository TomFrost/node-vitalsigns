/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var TimeCalcQueue = require('../util/TimeCalcQueue');

const DEFAULT_SAMPLE_FREQ = 50;
const DEFAULT_TIME_WINDOW = 10000;
const DEFAULT_TICK_BATCH = 1000;

function getReport(calcQueue, tickBatch) {
	var loopAvg = calcQueue.getAverage();
	return {
		avgMs: Math.floor(loopAvg * 1000) / 1000 || 0,
		maxMs: calcQueue.getMaximum() || 0,
		perSec: loopAvg ? Math.floor(1000 / (loopAvg / tickBatch)) : 0
	};
}

/**
 * Schedules a callback to be executed in a certain number of ticks.
 *
 * @param {Number} ticks The number of ticks that should execute before the
 *      callback is fired.
 * @param {Function} cb A callback argument to be fired after waiting the
 *      specified number of ticks.
 */
function inTicks(ticks, cb) {
	if (ticks > 0) {
		// As of Node.js v0.10.0, setImmediate fires on the next tick, while
		// process.nextTick executes immediately.  This is not a joke.
		var nextTick = setImmediate || process.nextTick;
		nextTick(function() {
			inTicks(ticks - 1, cb);
		});
	}
	else
		cb();
}

/**
 * Initialize the VitalSigns module.
 *
 * @param {{window, batch, freq}} options
 * @returns {{name: string, report: Function, destroy: Function}}
 */
module.exports = function(options) {
	if (!options)
		options = {};
	var running = true,
		loopTimes = new TimeCalcQueue(options.window || DEFAULT_TIME_WINDOW),
		tickBatch = options.batch || DEFAULT_TICK_BATCH;

	/**
	 * Starts an ongoing process that measures the amount of time the event
	 * loop takes to complete a full circuit.
	 */
	function startLoopMonitor() {
		setTimeout(function() {
			var loopStart = new Date().getTime();
			inTicks(tickBatch, function() {
				loopTimes.push(new Date().getTime() - loopStart);
				if (running)
					startLoopMonitor();
			});
		}, options.freq || DEFAULT_SAMPLE_FREQ);
	}
	startLoopMonitor();

	return {
		name: 'tick',
		report: getReport.bind(null, loopTimes, tickBatch),
		destroy: function() { running = false; }
	};
};
