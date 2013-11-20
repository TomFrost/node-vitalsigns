/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var should = require('should'),
	ConstraintWrapper = require('../lib/ConstraintWrapper');

var nextTick = setImmediate || process.nextTick;

var VitalSignsNock = function(cb) {
	this.addConstraint = function(constraint) {
		nextTick(cb.bind(null, constraint));
	};
};

describe('ConstraintWrapper', function() {
	it("should add a simple constraint", function(done) {
		var nock = new VitalSignsNock(function(constraint) {
			should.exist(constraint);
			constraint.should.have.property('monitor');
			constraint.monitor.should.eql('foo');
			constraint.should.have.property('field');
			constraint.field.should.eql('bar');
			constraint.should.have.property('comparator');
			constraint.comparator.should.eql('greater');
			constraint.should.have.property('value');
			constraint.value.should.eql(4);
			done();
		});
		var inst = new ConstraintWrapper(nock, 'foo', 'bar');
		inst.greaterThan(4);
	});
	it("should negate constraint with 'not'", function(done) {
		var nock = new VitalSignsNock(function(constraint) {
			should.exist(constraint);
			constraint.should.have.property('negate');
			constraint.negate.should.be.true;
			done();
		});
		var inst = new ConstraintWrapper(nock, 'foo', 'bar');
		inst.not.greaterThan(4);
	});
});
