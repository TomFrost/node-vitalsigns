/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

module.exports = {
	equal: {
		text: 'equal to',
		func: function(a, b) {
			return a == b;
		}
	},
	greater: {
		text: 'greater than',
		func: function(a, b) {
			return a > b;
		}
	},
	less: {
		text: 'less than',
		func: function(a, b) {
			return a < b;
		}
	}
};
