/*
 * VitalSigns
 * Copyright 2013 Tom Frost
 */

var should = require('should'),
	Comparators = require('../lib/Comparators');

describe('Comparators', function() {
	it('should support greater than', function() {
		Comparators.greater.func(0, 1).should.be.false;
		Comparators.greater.func(1, 1).should.be.false;
		Comparators.greater.func(2, 1).should.be.true;
	});
	it('should support less than', function() {
		Comparators.less.func(0, 1).should.be.true;
		Comparators.less.func(2, 1).should.be.false;
		Comparators.less.func(3, 1).should.be.false;
	});
	it('should support equality', function() {
		Comparators.equal.func(0, 0).should.be.true;
		Comparators.equal.func(1, 1).should.be.true;
		Comparators.equal.func(2, 1).should.be.false;
	});
});
