define(['exports', 'module'], function (exports, module) {
	'use strict';

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var Headers = undefined;
	var Response = undefined;
	var stream = undefined;
	var Blob = undefined;
	var theGlobal = undefined;
	var debug = undefined;

	function mockResponse(url, config) {
		debug('mocking response for ' + url);
		// allow just body to be passed in as this is the commonest use case
		if (typeof config === 'number') {
			debug('status response detected for ' + url);
			config = {
				status: config
			};
		} else if (typeof config === 'string' || !(config.body || config.headers || config.throws || config.status)) {
			debug('body response detected for ' + url);
			config = {
				body: config
			};
		} else {
			debug('full config response detected for ' + url);
		}

		if (config.throws) {
			debug('mocking failed request for ' + url);
			return Promise.reject(config.throws);
		}

		var opts = config.opts || {};
		opts.url = url;
		opts.status = config.status || 200;
		// the ternary oprator is to cope with new Headers(undefined) throwing in chrome
		// (unclear to me if this is a bug or if the specification says this is correct behaviour)
		opts.headers = config.headers ? new Headers(config.headers) : new Headers();

		var body = config.body;

		if (config.body != null && typeof body === 'object') {
			body = JSON.stringify(body);
		}

		debug('sending body "' + body + '"" for ' + url);

		if (stream) {
			var s = new stream.Readable();
			if (body != null) {
				s.push(body, 'utf-8');
			}
			s.push(null);
			body = s;
		}

		return Promise.resolve(new Response(body, opts));
	}

	function compileRoute(route) {

		var method = route.method;
		var matchMethod;
		if (method) {
			method = method.toLowerCase();
			matchMethod = function (options) {
				var m = options && options.method ? options.method.toLowerCase() : 'get';
				return m === method;
			};
		} else {
			matchMethod = function () {
				return true;
			};
		}

		debug('compiling route: ' + route.name);

		if (!route.name) {
			throw 'each route must be named';
		}

		if (!route.matcher) {
			throw 'each route must specify a string, regex or function to match calls to fetch';
		}

		if (typeof route.response === 'undefined') {
			throw 'each route must define a response';
		}

		if (typeof route.matcher === 'string') {
			(function () {
				var expectedUrl = route.matcher;
				if (route.matcher.indexOf('^') === 0) {
					debug('constructing starts with string matcher for route: ' + route.name);
					expectedUrl = expectedUrl.substr(1);
					route.matcher = function (url, options) {
						return matchMethod(options) && url.indexOf(expectedUrl) === 0;
					};
				} else {
					debug('constructing string matcher for route: ' + route.name);
					route.matcher = function (url, options) {
						return matchMethod(options) && url === expectedUrl;
					};
				}
			})();
		} else if (route.matcher instanceof RegExp) {
			(function () {
				debug('constructing regex matcher for route: ' + route.name);
				var urlRX = route.matcher;
				route.matcher = function (url, options) {
					return matchMethod(options) && urlRX.test(url);
				};
			})();
		}
		return route;
	}

	var FetchMock = (function () {
		function FetchMock(opts) {
			_classCallCheck(this, FetchMock);

			Headers = opts.Headers;
			Response = opts.Response;
			stream = opts.stream;
			Blob = opts.Blob;
			theGlobal = opts.theGlobal;
			debug = opts.debug;
			this.routes = [];
			this._calls = {};
			this.mockedContext = theGlobal;
			this.realFetch = theGlobal.fetch;
		}

		_createClass(FetchMock, [{
			key: 'useNonGlobalFetch',
			value: function useNonGlobalFetch(func) {
				this.mockedContext = this;
				this.realFetch = func;
			}
		}, {
			key: 'registerRoute',
			value: function registerRoute(name, matcher, response) {
				debug('registering routes');
				var routes = undefined;
				if (name instanceof Array) {
					routes = name;
				} else if (arguments.length === 3) {
					routes = [{
						name: name,
						matcher: matcher,
						response: response
					}];
				} else {
					routes = [name];
				}

				debug('registering routes: ' + routes.map(function (r) {
					return r.name;
				}));

				this.routes = this.routes.concat(routes.map(compileRoute));
			}
		}, {
			key: 'unregisterRoute',
			value: function unregisterRoute(names) {

				if (!names) {
					debug('unregistering all routes');
					this.routes = [];
					return;
				}
				if (!(names instanceof Array)) {
					names = [names];
				}

				debug('unregistering routes: ' + names);

				this.routes = this.routes.filter(function (route) {
					var keep = names.indexOf(route.name) === -1;
					if (!keep) {
						debug('unregistering route ' + route.name);
					}
					return keep;
				});
			}
		}, {
			key: 'getRouter',
			value: function getRouter(config) {
				var _this = this;

				debug('building router');

				var routes = undefined;

				if (config.routes) {
					(function () {
						debug('applying one time only routes');
						if (!(config.routes instanceof Array)) {
							config.routes = [config.routes];
						}

						var preRegisteredRoutes = {};
						_this.routes.forEach(function (route) {
							preRegisteredRoutes[route.name] = route;
						});
						routes = config.routes.map(function (route) {
							if (typeof route === 'string') {
								debug('applying preregistered route ' + route);
								return preRegisteredRoutes[route];
							} else {
								debug('applying one time route ' + route.name);
								return compileRoute(route);
							}
						});
					})();
				} else {
					debug('no one time only routes defined. Using preregistered routes only');
					routes = this.routes;
				}

				var routeNames = {};
				routes.forEach(function (route) {
					if (routeNames[route.name]) {
						throw 'Route names must be unique';
					}
					routeNames[route.name] = true;
				});

				config.responses = config.responses || {};

				return function (url, opts) {
					var response = undefined;
					debug('searching for matching route for ' + url);
					routes.some(function (route) {

						if (route.matcher(url, opts)) {
							debug('Found matching route (' + route.name + ') for ' + url);
							_this.push(route.name, [url, opts]);

							if (config.responses[route.name]) {
								debug('Overriding response for ' + route.name);
								response = config.responses[route.name];
							} else {
								debug('Using default response for ' + route.name);
								response = route.response;
							}

							if (typeof response === 'function') {
								debug('Constructing dynamic response for ' + route.name);
								response = response(url, opts);
							}
							return true;
						}
					});

					debug('returning response for ' + url);
					return response;
				};
			}
		}, {
			key: 'push',
			value: function push(name, call) {
				this._calls[name] = this._calls[name] || [];
				this._calls[name].push(call);
			}
		}, {
			key: 'mock',
			value: function mock(config) {
				debug('mocking fetch');

				if (this.isMocking) {
					throw 'fetch-mock is already mocking routes. Call .restore() before mocking again or use .reMock() if this is intentional';
				}

				this.isMocking = true;

				return this.mockedContext.fetch = this.constructMock(config);
			}
		}, {
			key: 'constructMock',
			value: function constructMock(config) {
				var _this2 = this;

				debug('constructing mock function');
				config = config || {};
				var router = this.getRouter(config);
				config.greed = config.greed || 'none';

				return function (url, opts) {
					var response = router(url, opts);
					if (response) {
						debug('response found for ' + url);
						return mockResponse(url, response);
					} else {
						debug('response not found for ' + url);
						_this2.push('__unmatched', [url, opts]);
						if (config.greed === 'good') {
							debug('sending default good response');
							return mockResponse(url, { body: 'unmocked url: ' + url });
						} else if (config.greed === 'bad') {
							debug('sending default bad response');
							return mockResponse(url, { throws: 'unmocked url: ' + url });
						} else {
							debug('forwarding to default fetch');
							return _this2.realFetch(url, opts);
						}
					}
				};
			}
		}, {
			key: 'restore',
			value: function restore() {
				debug('restoring fetch');
				this.isMocking = false;
				this.mockedContext.fetch = this.realFetch;
				this.reset();
				debug('fetch restored');
			}
		}, {
			key: 'reMock',
			value: function reMock(config) {
				this.restore();
				this.mock(config);
			}
		}, {
			key: 'reset',
			value: function reset() {
				debug('resetting call logs');
				this._calls = {};
			}
		}, {
			key: 'calls',
			value: function calls(name) {
				return this._calls[name] || [];
			}
		}, {
			key: 'called',
			value: function called(name) {
				if (!name) {
					return !!Object.keys(this._calls).length;
				}
				return !!(this._calls[name] && this._calls[name].length);
			}
		}]);

		return FetchMock;
	})();

	module.exports = FetchMock;
});
