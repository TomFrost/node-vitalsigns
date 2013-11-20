/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var os = require('os');

/**
 * Gets the total server CPU usage (not just the usage of this process) as the
 * number of ticks since the server started.  If multiple CPUs are present,
 * they will be added together.  The response is an object as follows:
 *
 * {
 *   active: [Number]
 *   idle: [Number]
 * }
 *
 * @return {Object} The active and idle ticks since the server booted.
 */
function getCPUTimes() {
	var cpus = os.cpus(),
		activeTicks = 0,
		idleTicks = 0;
	cpus.forEach(function(cpu) {
		for (var key in cpu.times) {
			if (cpu.times.hasOwnProperty(key) && key != 'idle')
				activeTicks += cpu.times[key];
			idleTicks += cpu.times.idle;
		}
	});
	return {
		active: activeTicks,
		idle: idleTicks
	};
}

function getReport(usage) {
	var loadAvg = os.loadavg();
	return {
		usage: usage,
		loadAvg1: Math.floor(loadAvg[0] * 100) / 100,
		loadAvg5: Math.floor(loadAvg[1] * 100) / 100,
		loadAvg15: Math.floor(loadAvg[2] * 100) / 100
	};
}

/**
 * Starts an ongoing process that measures the CPU usage percentage.  By
 * default, it will updates every 5 seconds and sample the CPU usage over the
 * span of 1 second.  This can be changed by passing the following options:
 *
 * {
 *     sampleTime: 1000, // The milliseconds over which to sample CPU usage
 *     updateTime: 5000  // The milliseconds to wait between samples
 * }
 *
 * @param {{sampleTime, updateTime}} options Optionally customize the timing
 *      of the CPU monitor (see above).
 * @returns {{usage, loadAvg1, loadAvg5, loadAvg15}} An object parameters
 *      showing the CPU usage % and load averages.
 */
module.exports = function(options) {
	if (!options)
		options = {};
	var usage = 0;

	var interval = setInterval(function() {
		var startTimes = getCPUTimes();
		setTimeout(function() {
			var endTimes = getCPUTimes(),
				diff = {
					active: endTimes.active - startTimes.active,
					idle: endTimes.idle - startTimes.idle
				},
				ratioIdle = diff.idle / (diff.active + diff.idle);
			usage = Math.floor((1 - ratioIdle) * 10000) / 100;
		}, options.sampleTime || 1000)
	}, options.updateTime || 5000);

	return {
		name: 'cpu',
		report: function() { return getReport(usage); },
		destroy: function() { clearInterval(interval); }
	};
}
