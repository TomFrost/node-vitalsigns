/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var os = require('os');

function formatSize(num, units) {
	var sizes = {
		KB: 1,
		MB: 2,
		GB: 3,
		TB: 4,
		PB: 5
	};
	var size = sizes[units] || 0;
	for (; size > 0; size--)
		num = Math.floor(num) / 1000;
	return num;
}

function getReport(units) {
	return {
		free: formatSize(os.freemem(), units),
		process: formatSize(process.memoryUsage().heapTotal, units)
	};
}

/**
 * Gets an object containing functions to be called for memory stats.
 *
 * @param options
 * @returns {{name: string, report: function}}
 */
module.exports = function(options) {
	if (!options)
		options = {};
	return {
		name: 'mem',
		report: getReport.bind(null, options.units)
	};
}
