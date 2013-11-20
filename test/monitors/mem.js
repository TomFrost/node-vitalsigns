/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var should = require('should'),
	mem = require('../../lib/monitors/mem');

describe("Memory monitor", function() {
	it("should return free memory and process memory", function() {
		var mod = mem().report();
		mod.should.have.property('free');
		mod.should.have.property('process');
	});
	it("should return positive non-zero values", function() {
		var mod = mem().report();
		mod.free.should.be.above(0);
		mod.process.should.be.above(0);
	});
	it("should support different units", function() {
		var modKB = mem({units: 'KB'}).report(),
			modMB = mem({units: 'MB'}).report(),
			modGB = mem({units: 'GB'}).report();
		modGB.free.should.be.below(modMB.free);
		modMB.free.should.be.below(modKB.free);
	});
});
