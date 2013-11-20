/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var os = require('os');

module.exports = {
	name: 'uptime',
	report: function() {
		return {
			sys: Math.floor(os.uptime()),
			proc: Math.floor(process.uptime())
		};
	}
};
