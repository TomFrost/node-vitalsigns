/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var should = require('should'),
	cpu = require('../../lib/monitors/cpu'),
	inst;

describe("CPU monitor", function() {
	afterEach(function() {
		if (inst && inst.destroy) {
			inst.destroy();
			inst = null;
		}
	});
	it("should return all parameters", function() {
		inst = cpu();
		var report = inst.report();
		report.should.have.property('usage');
		report.should.have.property('loadAvg1');
		report.should.have.property('loadAvg5');
		report.should.have.property('loadAvg15');
	});
	it("should calculate CPU usage as a percentage", function(done) {
		inst = cpu({
			sampleTime: 10,
			updateTime: 10
		});
		setTimeout(function() {
			var report = inst.report();
			report.usage.should.not.be.below(0);
			report.usage.should.not.be.above(100);
			done();
		}, 20);
	});
	it("should provide positive load averages", function() {
		inst = cpu();
		var report = inst.report();
		report.loadAvg1.should.not.be.below(0);
		report.loadAvg5.should.not.be.below(0);
		report.loadAvg15.should.not.be.below(0);
	});
});
