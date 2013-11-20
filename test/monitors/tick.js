/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var should = require('should'),
	tick = require('../../lib/monitors/tick'),
	inst;

describe("Tick monitor", function() {
	afterEach(function() {
		if (inst && inst.destroy) {
			inst.destroy();
			inst = null;
		}
	});
	it("should return all parameters", function() {
		inst = tick();
		var report = inst.report();
		report.should.have.property('avgMs');
		report.should.have.property('maxMs');
		report.should.have.property('perSec');
	});
	it("should provide positive tick numbers", function(done) {
		inst = tick();
		setTimeout(function() {
			var report = inst.report();
			report.avgMs.should.be.above(0);
			report.maxMs.should.be.above(0);
			report.perSec.should.be.above(0);
			done();
		}, 100);
	});
});
