# VitalSigns
Powerful and customizable application health monitoring

##ChangeLog

### v0.4.3
- Fixed: Support the official Express 4 API

### v0.4.2
- Added: Travis CI integration
- Fixed: Express endpoint now sends (statusCode, body) instead of
(body, statusCode). This avoids a warning in Express 4.x, and is
backward-compatible. 

### v0.4.1
- Fixed: Calling getReport() no longer generates a second report to run the
health check
- Fixed: Various documentation improvements, especially for IDEs that enforce
JSDoc declared types

### v0.4.0
- Added: JSDoc on all functions in the core
- Added: Ability to get flattened reports

### v0.3.0
- Added: Hapi route handler, alongside the existing express option. Credits
to [mrlannigan](https://github.com/mrlannigan).

### v0.2.2
- Fixed: Reports overwrite function values in monitors

### v0.2.1
- Fixed: Eliminate missing repository warning from NPM

### v0.2.0
- README clarifications
- Feature: Allow 'report' to link to a static value so that non-namespaced
keys can be attached to a report
- Feature: Allow constraints to be built around non-namespaced keys
- Fixed: Error in express endpoint when accessing the unhealthy HTTP code.
- Fixed: uptime monitor was not in the index

### v0.1.0
- **Initial Release**
