/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var should = require('should'),
	uptime = require('../../lib/monitors/uptime');

describe("Uptime monitor", function() {
	it("should return sys and proc uptime", function() {
		var mod = uptime.report();
		mod.should.have.property('sys');
		mod.should.have.property('proc');
	});
	it("should return positive values", function() {
		var mod = uptime.report();
		mod.sys.should.not.be.below(0);
		mod.proc.should.not.be.below(0);
	});
});
