/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var VitalSigns = require('../lib/VitalSigns'),
	should = require('should'),
	util = require('util');

var inst,
	sampleData = {
		world: 5
	},
	sampleMon = {
		name: 'hello',
		report: function() { return sampleData; }
	},
	nextTick = setImmediate || process.nextTick;

describe("VitalSigns", function() {
	describe("Monitors", function() {
		afterEach(function() {
			if (inst)
				inst.destroy();
		});
		it('should load an included monitor', function() {
			inst = new VitalSigns();
			inst.monitor('cpu');
			var report = inst.getReport();
			report.should.have.property('cpu');
			report.cpu.should.have.property('usage');
		});
		it('should load a plain object monitor into default group', function() {
			inst = new VitalSigns();
			inst.monitor({hello: 'world'});
			var report = inst.getReport();
			report.should.have.property('default');
			report.default.should.have.property('hello');
			report.default.hello.should.eql('world');
		});
		it('should load a plain object monitor into a named group', function() {
			inst = new VitalSigns();
			inst.monitor({hello: 'world'}, {name: 'foo'});
			var report = inst.getReport();
			report.should.have.property('foo');
			report.foo.should.have.property('hello');
			report.foo.hello.should.eql('world');
		});
		it('should load a monitor using the report function', function() {
			inst = new VitalSigns();
			inst.monitor({
				name: 'test',
				report: function() {
					return {hello: 'world'};
				}
			});
			var report = inst.getReport();
			report.should.have.property('test');
			report.test.should.have.property('hello');
			report.test.hello.should.eql('world');
		});
		it('should execute functions embedded in a report', function() {
			inst = new VitalSigns();
			inst.monitor({
				hello: function() {
					return 'wor' + 'ld';
				}
			});
			var report = inst.getReport();
			report.should.have.property('default');
			report.default.should.have.property('hello');
			report.default.hello.should.eql('world');
		});
		it('should load functions that return reports', function() {
			inst = new VitalSigns();
			inst.monitor(function() {
				return {
					hello: function() {
						return 'wor' + 'ld'
					}
				};
			});
			var report = inst.getReport();
			report.should.have.property('default');
			report.default.should.have.property('hello');
			report.default.hello.should.eql('world');
		});
		it('should return flattened reports', function() {
			inst = new VitalSigns();
			inst.monitor({
				foo: 'bar'
			});
			var report = inst.getReport({flatten: true});
			report.should.have.property('default.foo').equal('bar');
			report.should.have.property('healthy').equal(true);
		});
		it('should return custom flattened reports', function() {
			inst = new VitalSigns();
			inst.monitor({
				foo: 'bar'
			});
			var report = inst.getReport({flatten: true, separator: '_'});
			report.should.have.property('default_foo').equal('bar');
			report.should.have.property('healthy').equal(true);
		});
	});
	describe("Constraints", function() {
		afterEach(function() {
			if (inst)
				inst.destroy();
		});
		it('should be healthy when constraints pass', function() {
			inst = new VitalSigns();
			inst.monitor({ num: 5 });
			inst.unhealthyWhen('default', 'num').greaterThan(10);
			inst.isHealthy().should.be.true;
		});
		it('should be unhealthy when constraints fail', function() {
			inst = new VitalSigns();
			inst.monitor({ num: 5 });
			inst.unhealthyWhen('default', 'num').lessThan(10);
			inst.isHealthy().should.be.false;
		});
		it('should negate a constraint', function() {
			inst = new VitalSigns();
			inst.monitor({ num: 5 });
			inst.unhealthyWhen('default', 'num').not.lessThan(3);
			inst.isHealthy().should.be.false;
		});
		it('should report failures', function() {
			inst = new VitalSigns();
			inst.monitor({ num: 5 });
			inst.unhealthyWhen('default', 'num').not.lessThan(3);
			inst.isHealthy();
			var failures = inst.getFailed();
			util.isArray(failures).should.be.true;
			failures.length.should.eql(1);
			failures[0].should.eql('default.num less than 3');
		});
	});
	describe("Events", function() {
		before(function() {
			inst = new VitalSigns();
			inst.monitor(sampleMon);
			inst.unhealthyWhen('hello', 'world').equals(0);
		});
		after(function() {
			inst.destroy();
		});
		afterEach(function() {
			inst.removeAllListeners();
		});
		it("should not fire when remaining healthy", function(done) {
			inst.on('healthChange', function() {
				throw new Error('healthChange should not fire');
			});
			nextTick(done);
			inst.isHealthy().should.be.true;
		});
		it("should fire healthChange when switching to unhealthy", function(done) {
			inst.on('healthChange', function(healthy, report, fails) {
				healthy.should.be.false;
				fails.length.should.eql(1);
				done();
			});
			sampleData.world = 0;
			inst.isHealthy().should.be.false;
		});
		it("should not fire when remaining unhealthy", function (done) {
			inst.on('healthChange', function () {
				throw new Error('healthChange should not fire');
			});
			nextTick(done);
			inst.isHealthy().should.be.false;
		});
		it("should fire healthChange when switching back to healthy", function(done) {
			inst.on('healthChange', function(healthy, report, fails) {
				healthy.should.be.true;
				fails.length.should.eql(0);
				done();
			});
			sampleData.world = 5;
			inst.isHealthy().should.be.true;
		});
	});
	describe('Utilities', function() {
		before(function() {
			inst = new VitalSigns();
		});
		it('should have express middleware that responds with json report', function(done) {
			var mockResponse = {
				json: function(code, body) {
					body.should.have.property('healthy');
					code.should.be.type('number');
					done();
				}
			};
			inst.express({}, mockResponse);
		});
		it('should have hapi route handler that responds with json report', function(done) {
			var mockReply = function(body) {
				body.should.have.property('healthy');
				return {
					code: function(code) {
						code.should.be.type('number');
						done();
					}
				};
			};
			inst.hapi({}, mockReply);
		});
	});
});
