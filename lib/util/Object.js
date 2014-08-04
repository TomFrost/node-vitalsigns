/*
 * VitalSigns
 * Copyright 2014 Tom Frost
 */

/**
 * Recursively flattens a Javascript object literal by combining key names
 * using dot notation.  It turns this:
 *
 * {
 *      hello: {
 *          mistress: 'my baby',
 *          wife: 'my honey',
 *          pianist: 'my ragtime gal'
 *      },
 *      foo: 'bar'
 * }
 *
 * Into this:
 *
 * {
 *      'hello.mistress': 'my baby',
 *      'hello.wife': 'my honey',
 *      'hello.pianist': 'my ragtime gal',
 *      'foo': 'bar'
 * }
 *
 * @param {{}} src The object to be flattened
 * @param {{}} [dest] An object to flatten the source object into.  Omit to
 *      create a new object
 * @param {string} [sep="."] A separator to place between joined key
 *      names
 * @param {string} [prefix=""] A prefix to place before all keys names in the
 *      flattened result.
 * @returns {{}} An object containing flattened key names
 */
exports.flatten = function(src, dest, sep, prefix) {
	if (!dest) dest = {};
	if (!sep) sep = '.';
	if (typeof src === 'object') {
		for (var key in src) {
			if (src.hasOwnProperty(key)) {
				exports.flatten(src[key], dest, sep,
					(prefix ? prefix + sep : '') + key);
			}
		}
	}
	else
		dest[prefix] = src;
	return dest;
};
