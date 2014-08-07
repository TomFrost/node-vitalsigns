# VitalSigns [![Build Status](https://travis-ci.org/TomFrost/node-vitalsigns.svg?branch=master)](https://travis-ci.org/TomFrost/node-vitalsigns)
Powerful and customizable application health monitoring

Sponsored by [Leadnomics](http://www.leadnomics.com).

## Installation
In your project folder, type:

	npm install vitalsigns

## Basic Usage
Load up VitalSigns and include a few of the built-in monitors:

	var VitalSigns = require('vitalsigns'),
		vitals = new VitalSigns();

	vitals.monitor('cpu');
	vitals.monitor('mem', {units: 'MB'});
	vitals.monitor('tick');

We know the CPU hitting 100% is bad news. So is the tick.maxMs clearing 500.

	vitals.unhealthyWhen('cpu', 'usage').equals(100);
	vitals.unhealthyWhen('tick', 'maxMs').greaterThan(500);

Let's get application-specific.  We'll monitor connections to a game and go
unhealthy when they cross 200.

	vitals.monitor({
		connections: function() { return Game.getConnections(); }
	}, {name: 'game'});

	vitals.unhealthyWhen('game', 'connections').greaterThan(200);

We need to know when we go unhealthy...

	vitals.on('healthChange', function(healthy, failedChecks) {
		console.log("Server is " + (healthy ? 'healthy' : 'unhealthy') +
			".  Failed checks:", failedChecks);
	});

And we have a load balancer hitting /health and looking for a non-200
response from express.

	app.get('/health', vitals.express);


## The API
### Constructor
VitalSigns must be instantiated to use, and can optionally receive a set of
options:

	var vitals = new VitalSigns({
		autoCheck: 5000,
		httpHealthy: 200,
		httpUnhealthy: 503
	});

#### autoCheck
*Default: false.* The number of milliseconds to wait between automatic health
checks, or boolean false to disable.  Alternatively, 'true' can be specified to
auto-check every 5 seconds.

#### httpHealthy
*Default: 200.* The HTTP response code to send back in the VitalSigns.express
HTTP endpoint when the server is healthy.

#### httpUnhealthy
*Default: 503.* The HTTP response code to send back in the VitalSigns.express
HTTP endpoint when the server is unhealthy.

### Monitors
Without stats to monitor, VitalSigns does nothing!  In order for it to be
useful, VitalSigns must be told what monitors to use.  These can be the name
of a built in monitor (cpu, mem, tick, and uptime), the name of a library in
your project's node_modules folder, an object, or a function.  See the "Kinds
of Monitors" section below for more details.

Monitors are registered with:

**instance.monitor({string|object|function} monitor, [{object} options])**

Options are optional.  If specified, they should be a Javascript object of
key/value pairs specific to the monitor being loaded.  In addition, a *name*
field can be specified to override the default name for the module.  For
example, the following will cause CPU reports to be grouped under 'foo' instead
of 'cpu':

	instance.monitor('cpu', {name: 'foo'});

### Health constraints
Before or after monitors are loaded, VitalSigns can be told what values are
considered unhealthy.  The syntax starts with:

	instance.unhealthyWhen(<monitor>, <field>)

and the following can be added to the end to complete the definition:

	.equals(<value>)
	.greaterThan(<value>)
	.lessThan(<value>)
	.not // chainable with one of the above

For example, to mark the instance as unhealthy if monitor "foo" has a field
named "bar" that's equal to or less than 5, use:

	instance.unhealthyWhen('foo', 'bar').not.greaterThan(5);

Many constraints can be defined on one instance of VitalSigns.

### Function calls
Besides the above, the following calls are available on VitalSigns instances:

#### destroy()
Destructs the instance, terminating autoChecks and any intervals set by any
of the attached monitors.  Also removes all event listeners.  This is handy
to do before shutdown to eliminate any ongoing process that might prevent
the process from exiting.

#### express
A function to be passed to Express as the endpoint for a route.  This function
will return HTTP 200 or 503 by default to represent healthy and unhealthy,
respectively.  It will also provide the full health report returned by
`getReport()` as a JSON string with *Content-type: application/json*.  Example:

	app.get('/ping', instance.express);

#### hapi
A function to be passed to Hapi as the handler for a route.  This function
will return HTTP 200 or 503 by default to represent healthy and unhealthy,
respectively.  It will also provide the full health report returned by
`getReport()` as a JSON string with *Content-type: application/json*.  Example:

	server.route({method: 'GET', path: '/ping', handler: instance.hapi});

#### {array} getFailed()
Returns an array of strings describing the constraints that failed the last
time `isHealthy()` was called.  Array will be empty if the instance was
healthy as of the last check.

#### {object} getReport(options)
Returns a Javascript object with the health report: each monitor name as keys,
with the value being another Javascript object mapping each monitor's fields to
their values.  This function also attaches a 'healthy' field at the root level
with a boolean true or false representing whether the instance is healthy based
on this report.

Sample report:

	{
		cpu: {
			usage: 50,
			loadAvg1: 0.09,
			loadAvg5: 0.80,
			loadAvg15: 1.29
		},
		healthy: true
	}

##### {boolean} options.flatten (default: false)
Set to true to flatten the report object to a single level of keys by
concatenating nested key names.  Example:

	{
		"cpu.usage": 50,
		"cpu.loadAvg1": 0.09,
		"cpu.loadAvg5": 0.80,
		"cpu.loadAvg15": 1.29,
		"healthy": true
	}

##### {string} options.separator (default: ".")
If flatten is true, this is the string used to separate joined key names. 

#### {boolean} isHealthy()
Returns true or false based on whether the instance is healthy.  Also fires up
to two events; see "Events" section below.

### Events
VitalSigns fires up to two events when the health is checked:

#### healthCheck (healthy, report, failures)
Fires every time `isHealthy()` is called, which includes autoChecks and calls
to `getReport()`.

- **healthy** *boolean:* true if healthy; false if not
- **report** *object:* The raw monitor reports in a Javascript object, grouped
by monitor name
- **fails** *array:* An array of strings describing the individual constraints
that failed and caused the unhealthy status.  Array has length=0 if healthy.

#### healthChange (healthy, report, failures)
Fires when a health check is performed that causes the instance to switch from
healthy to unhealthy, or vice versa.  Provides the same arguments as the
healthCheck event.

## Kinds of Monitors
VitalSigns-compatible monitors come in all shapes and sizes.  For distributed
monitors, an object with 'name' and 'report' fields is highly recommended. Here
are a few of the configurations:

### Object with static fields

	module.exports = {
		appName: "My Awesome App",
		hostname: os.hostname()
	};

### Object with dynamic fields

	module.exports = {
		connections: function() {
			return myApp.getConnections();
		}
	};

### Named monitor with report function

	module.exports = {
		name: 'MyMonitor',
		report: function() {
			return {
				connections: myApp.getConnections();
				lastConnection: myApp.getLastConnectionTime();
			};
		}
	};

### Function returning one of the above objects

	module.exports = function(options) {
		if (!options)
			options = {};
		return {
            name: 'MyMonitor',
            report: function() {
                return {
                    connections: myApp.getConnections();
                    lastConnection: myApp.getLastConnectionTime(options.dateFormat);
                };
            }
        };
	}

## Built-in monitors
VitalSigns comes with a small number of application-unspecific monitors to
report on general server and process health.  They are:

### cpu
Monitors CPU usage and load.  Provides fields:

- **usage:** Percent of CPU being used at this moment
- **loadAvg1:** The 1-minute load average
- **loadAvg5:** The 5-minute load average
- **loadAvg15:** The 15-minute load average

Options:

- **sampleTime** *default 1000:* The milliseconds over which to sample CPU
usage
- **updateTime** *default 5000:* The milliseconds to wait between samples

### mem
Monitors memory usage.  Provides fields:

- **free:** Amount of memory currently available
- **process:** Amount of memory currently being used by this node process.

Options:

- **units** *default B:* The units in which to display RAM sizes.  Legal
options are B, KB, MB, GB, TB, and PB.  If you can measure your RAM in PB,
I accept RAM donations.

### tick
Monitors the speed of the event loop.  For a Node.js app, this is the single
most important set of statistics available.  Provides fields:

- **avgMs:** Average number of milliseconds required to loop through the
specified number of ticks
- **maxMs:** For the last batch of samples, the milliseconds required to loop
through the slowest batch of ticks
- **perSec:** An estimate of how many individual ticks are being completed per
second.

Options:

- **window** *default 10000:* The number of milliseconds for which to collect
batches of tick measurements before they are averaged.
- **batch** *default 1000:* The number of ticks to be timed in a single batch.
Batches of this size are what get processed to create `avgMs` and `maxMs`.
- **freq** *default 50:* The number of milliseconds to pause between collecting
batches of ticks.

### uptime
Monitors application uptime.  Provides fields:

- **sys:** The number of seconds for which the server has been online
- **proc:** The number of seconds for which this node process has been running

## License
VitalSigns is distributed under the MIT license.

## Credits
VitalSigns was created by Tom Frost at Leadnomics in 2013.
