(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _underscore = require('underscore');

var _ = _interopRequireWildcard(_underscore);

var _index = require('./index');

var _util = require('./util');

var registeredApps = 0;
var getNewAppId = function getNewAppId() {
    return ++registeredApps;
};
// var PublicAPIURL = 'https://api.scrmhub.com/v1';
var PublicAPIURL = 'https://scrmhub.com/api/activity';
// var ActivityEndpoint = '/activity/create/';
var ActivityEndpoint = '';

function findParentModule(targetElement) {
    var parent = targetElement.parentElement;
    while (parent) {
        if (parent.dataset && parent.dataset.moduleId) return parent;
        parent = parent.parentElement;
    }

    return undefined;
}

var clickListener = null;
function listenToDom(appInstance) {
    clickListener = new _index.DOMListener(document.body, 'click', '[data-module-id] [data-event]');

    clickListener.listen(function (event) {
        return appInstance.dispatch(findParentModule(event.target).dataset.moduleId, event.target.dataset.event, event.target.dataset);
    });
}

function findModuleElements(domLink) {
    var id = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    var selector = '';
    _.each(domLink, function (value, key) {
        return selector += '[data-module-' + key + '="' + value + '"]';
    });

    if (id) selector += '[data-module-id="' + id + '"]';

    var el = (0, _util.toArray)(document.querySelectorAll(selector));
    return el;
}

var App = (function () {
    function App() {
        var _this = this;

        var params = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        _classCallCheck(this, App);

        var id = params.id || 'app_' + getNewAppId();

        this._id = id;
        this._state = new _index.UserState();
        this._modules = [];
        this._unloadRequests = [];
        // Ensure _usePublicApi is always a boolean
        this._usePublicApi = !!params.publicApi;

        this.__DEV__ = params.__DEV__;

        this._baseUrl = window.baseUrl;
        if (!this._baseUrl) this.warn('No base URL set - outbound event tracking may not work as intended');

        this.userId = window.puuid ? this.setUserId(window.puuid) : localStorage && localStorage.getItem('puuid') ? localStorage.getItem('puuid') : this.getUserIdFromCookie();

        this.responseHandlers = new _index.ResponseHandler(this);

        if (params.dataBinding) listenToDom(this);

        if (params.modules) {
            this.buildModules(params);
        }

        if (['complete', 'interactive'].indexOf(document.readyState) !== -1) {
            this.pageLoaded();
        } else {
            document.addEventListener("DOMContentLoaded", function () {
                return _this.pageLoaded;
            });
        }
    }

    _createClass(App, [{
        key: 'warn',
        value: function warn() {
            if (this.__DEV__) console.warn.apply(console, arguments);
        }
    }, {
        key: 'getUserIdFromCookie',
        value: function getUserIdFromCookie() {
            var allValues = document.cookie.split(';'),
                map = {};
            allValues.forEach(function (value) {
                var kvp = value.split('='),
                    key = kvp.shift();
                map[key] = kvp.join('=');
            });
            if (map.puuid) return map.puuid;
            return null;
        }
    }, {
        key: 'setUserId',
        value: function setUserId(puuid) {
            this.userId = puuid;
            if (localStorage) localStorage.setItem('puuid', puuid);
            document.cookie = 'puuid=' + puuid + '; expires=Fri, 31 Dec 9999 23:59:59 GMT';
            return puuid;
        }
    }, {
        key: 'pageLoaded',
        value: function pageLoaded() {
            var _this2 = this;

            this.dispatchActivity('page', 'view', undefined, document.location.toString(), document.referrer.toString());
            this.dispatch(undefined, 'pageLoaded').then(function () {}, function (err) {
                return console.log('Error emitting page loaded event');
            });
            window.addEventListener('click', function (event) {
                if (event.target.tagName == 'A') _this2._trackLinkClick(event);
            });
            window.addEventListener('beforeunload', this._handleUnload.bind(this));
        }
    }, {
        key: '_trackLinkClick',
        value: function _trackLinkClick(event) {
            var link = event.target,
                href = link.href,
                target = link.target ? link.target.value : null,
                isLocalPage = (0, _util.isInternalUrl)(this._baseUrl, href),
                doNotTrack = typeof link.dataset == 'object' && typeof link.dataset.noTrack !== 'undefined' ? !!link.dataset.noTrack : false;

            if (!href || href.match(/^javascript/)) return;

            // If there is a target set, and it doesn't affect the current frame, then emit the event asyncronously
            // Otherwise we need to emit the event as part of the unload event, preventing the browser from navigating away before it completes
            if (target && ['_self', '_top', '_parent'].indexOf(target)) {
                this.dispatch(undefined, 'click', { href: href });
                if (!isLocalPage && !doNotTrack) this.dispatchActivity('page', 'outbound', undefined, href, document.location.toString());

                return;
            }

            var publicApiCall = this.buildActivityRequest('page', href, 'outbound', undefined, document.location.toString());
            publicApiCall.response = false;

            if (this.usePublicApi && !isLocalPage && !doNotTrack) {
                this._unloadRequests.push({
                    url: this.publicApiUrl,
                    contentType: 'multipart/form-data',
                    data: publicApiCall
                });
            }

            this._unloadRequests.push({
                url: this.apiUrl + '/click',
                data: this.buildApiRequest({ href: href })
            });
        }
    }, {
        key: '_handleUnload',
        value: function _handleUnload() {
            if (!this._unloadRequests.length) return;

            this._unloadRequests.forEach(function (request) {
                var reqObj = new _index.RemoteRequest(request.url);
                if (request.contentType) reqObj.setContentType(request.contentType);

                reqObj.addData(request.data).isAsync(false).post().then(function () {
                    return console.log('Request done');
                })['catch'](function (err) {
                    return console.error('Unloading post failed');
                });
            });
        }

        /**
         * Loops through all declared modules (passed in via the modules attribute when constructing the app)
         * and uses them to construct modules declared on the page using the domLink attribute, which usually will
         * define a link using the data-module-class attribute
         * @param {Object} params A parameter hash containing a modules array
         */
    }, {
        key: 'buildModules',
        value: function buildModules(params) {
            var _this3 = this;

            _.each(params.modules, function (moduleSpec) {
                // Check for a valid domLink attribute on the module spec, as it's used to identify modules on the page
                if (!moduleSpec.domLink || !_.isObject(moduleSpec.domLink)) return _this3.warn('Unable to construct module, definition has no domLink', moduleSpec);

                // Get all of the module instances on the page, and group them by module id
                var moduleEl = findModuleElements(moduleSpec.domLink),
                    modules = _.chain(moduleEl).map(function (el) {
                    return el.dataset.moduleId;
                }).uniq().value();

                // If no modules present on the page, kick on to the next one
                if (modules.length == 0) return;

                _.each(modules, function (moduleId) {
                    // Use Object.create so that only the domLink is unique for this module config, allowing prototypal inheritance from the original module spec
                    var mySpec = Object.create(moduleSpec);
                    _this3._modules.push(new _index.Module(mySpec, _this3, moduleId));
                });
            });
        }
    }, {
        key: 'buildApiRequest',
        value: function buildApiRequest(data) {
            return {
                page_id: window.pageId,
                data: data,
                state: this._state.toJSON()
            };
        }

        /**
         * Dispatch an event to the server-side event handler
         * @param {String} moduleId The name of the module emitting the event, or undefined for a page-level event
         * @param {String} eventName The name of the event, which is appended to the request url (using /api/handle/eventName)
         * @param {Object} data Any additional data to send to the server, for example a JSON-encoded form
         * @param {Boolean} showLoading (Not yet implimented) show a page-level spinner and pevent page interaction until the request completes
         */
    }, {
        key: 'dispatch',
        value: function dispatch(moduleId, eventName) {
            var _this4 = this;

            var data = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
            var showLoading = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

            if (!_.isString(eventName)) {
                console.warn('Event name not specified');
                return;
            }

            if (showLoading) this.showLoading(true);

            var url = this.apiUrl + '/' + eventName,
                params = this.buildApiRequest(data),
                request = new _index.RemoteRequest(url);

            // Add the module Id if one was specified   
            if (_.isString(moduleId)) params.module_id = moduleId;

            return new Promise(function (resolve, reject) {
                request.addData(params).post().then(function (response) {
                    if (_.isArray(response.scripts)) {
                        response.scripts.forEach(function (script) {
                            return _this4.handleServerResponse(script);
                        });
                    } else if (_.isObject(response.scripts)) {
                        _this4.handleServerResponse(response.scripts);
                    }

                    if (showLoading) _this4.showLoading(false);

                    resolve();
                })['catch'](function () {
                    if (showLoading) _this4.showLoading(false);
                    reject();
                });
            });
        }
    }, {
        key: 'buildActivityRequest',
        value: function buildActivityRequest(type, identifier, action, target, referrer) {
            var request = {
                action: 'create',
                appkey: this._id,
                response: true,
                type: type,
                useraction: action || null,
                target: target || null,
                id: identifier || null,
                referrer: referrer || null,
                agent: navigator.userAgent
            };
            if (this.userId) request.puuid = this.userId;

            return (0, _util.deNull)(request);
        }

        /**
         * Sends an API request to the scrmhub public API
         * @param {String} type The type of action being emitted, eg video, audio, page
         * @param {String} action The action being performed, eg play, update, view
         * @param {String} target The social network on/to which the activity is being performed
         * @param {String} identifier A page url/video id/filename/id which identifies the object this action is being performed on
         * @param {String} referrrer The referring page, or the current page url (usually this one) 
         */
    }, {
        key: 'dispatchActivity',
        value: function dispatchActivity(type, action, target, identifier, referrer) {
            if (!this.usePublicApi) return;

            if (!type || !action) throw new Error('A type and action are required');
            if (typeof referrer == 'undefined') referrer = document.location.toString();

            var request = new _index.RemoteRequest(this.publicApiUrl),
                params = this.buildActivityRequest(type, identifier, action, target, referrer);
            request.setContentType('multipart/form-data').addData(params).post().then(this.handlePublicApiResponse.bind(this), this.handlePublicApiError.bind(this));
        }
    }, {
        key: 'handleServerResponse',
        value: function handleServerResponse(scriptDefinition) {
            var _responseHandlers;

            var funcName = scriptDefinition['function'],
                funcArgs = scriptDefinition.arguments;

            if (this.responseHandlers.has(funcName)) (_responseHandlers = this.responseHandlers).handle.apply(_responseHandlers, [this, funcName].concat(_toConsumableArray(funcArgs)));else console.warn('Invalid function requested by server response: ' + funcName);
        }
    }, {
        key: 'handlePublicApiResponse',
        value: function handlePublicApiResponse(response) {
            if (!response.ok) return this.warn('Public API response not ok');
        }
    }, {
        key: 'handlePublicApiError',
        value: function handlePublicApiError(err) {}
    }, {
        key: 'showLoading',
        value: function showLoading() {
            var visible = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

            var loadingEl = document.querySelector('.loader');
            if (!loadingEl) {
                loadingEl = document.createElement('div');
                loadingEl.classList.add('loader');
                document.body.appendChild(loadingEl);
            }

            var display = visible ? 'block' : 'hidden';
            loadingEl.style.display = display;
        }

        /**
         * Get a handle to the module with the specified moduleId
         * @return {Module} The module instance
         */
    }, {
        key: 'getModule',
        value: function getModule(moduleName) {
            return _.findWhere(this._modules, { moduleId: moduleName });
        }
    }, {
        key: 'id',
        get: function get() {
            return this._id;
        }
    }, {
        key: 'apiUrl',
        get: function get() {
            return 'api/handle';
        }
    }, {
        key: 'publicApiUrl',
        get: function get() {
            return PublicAPIURL + ActivityEndpoint;
        }
    }, {
        key: 'usePublicApi',
        get: function get() {
            if (typeof this._usePublicApi == 'undefined') this._usePublicApi = true;

            return this._usePublicApi;
        }
    }]);

    return App;
})();

window.App = App;

exports.App = App;

},{"./index":4,"./util":9,"underscore":14}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _underscore = require('underscore');

var _ = _interopRequireWildcard(_underscore);

var _prefix = require('prefix');

var prefix = _interopRequireWildcard(_prefix);

function applyToAll(selector, handler) {
    var elements = document.querySelectorAll(selector),
        affectedElements = 0;
    _.each(elements, function (element) {
        try {
            handler(element);
            affectedElements++;
        } catch (e) {}
    });

    return affectedElements;
}

/**
 * Clones all children in a parent node and calls the handler for each new clone
 * @param {Element|Node} parentElement The element to clone all children of
 * @param {Function} handler A handler function to be called for each new clone
 */
function cloneChildren(parentElement, handler) {
    for (var i = 0; i < parentElement.children.length; i++) {
        var newNode = parentElement.children[i].cloneNode(true);
        handler(newNode);
    }
}

function applyPrefixedStyle(element, property, value) {
    var prefixed = prefix.prefix(property);
    element.style[property] = value;
    if (property !== prefixed) element.style[prefixed] = value;
}

function rotateTo(element, amount) {
    var transform = element.style.transform,
        rotateStr = ' rotate(' + amount + 'deg)';

    if (transform.indexOf('rotate') !== -1) {
        transform = transform.replace(/\s?rotate\(.*?\)/ig, rotateStr);
    } else {
        transform += rotateStr;
    }

    applyPrefixedStyle(element, 'transform', transform.trim());
};

/**
 * Check whether a HTML element already has a class applied to it
 * Primarily used by internal functions
 */
function hasClass(element, className) {
    if (element.classList) return element.classList.contains(className);
    var regex = new RegExp('(?:^|s)' + className + '(?:s|$)');
    return regex.test(element.className);
}
/**
 * Add a class to a HTML element
 * @param {Element} element The HTML element to be affected
 * @param {String} className The class name to add
 */
function addClass(element, className) {
    if (element.classList) element.classList.add(className);
    if (!hasClass(element, className)) element.className += ' ' + className;
}

/**
 * Remove a class from a HTML element
 * @param {Element} element The HTML element to remove the class from
 * @param {String} className The class to be removed
 */
function removeClass(element, className) {
    if (element.classList) element.classList.remove(className);
    if (hasClass(element, className)) {
        var classList = element.className.split(''),
            idx = classList.indexOf(className),
            newList = classList.splice(idx, 1).join(' ');
        element.className = newList;
    }
}

/**
 * Toggles a class on a HTML element
 * @param {Element} element The HTML element to remove the class from
 * @param {String} className The class to be toggled
 */
function toggleClass(element, className) {
    if (hasClass(element, className)) removeClass(element, className);else addClass(element, className);
}

/**
 * Searches up the Element tree looking for the specified attribute, returning the first instance found
 */
function parentAttribute(child, attribute) {
    var defaultValue = arguments.length <= 2 || arguments[2] === undefined ? undefined : arguments[2];

    var parent = child.parentElement;
    while (parent) {
        if (parent.attributes[attribute]) return parent.attributes[attribute].value;
        parent = parent.parentElement;
    }
    return defaultValue;
}

var DOM = {
    applyToAll: applyToAll,
    cloneChildren: cloneChildren,
    applyPrefixedStyle: applyPrefixedStyle,
    parentAttribute: parentAttribute,

    // Class functions
    addClass: addClass,
    removeClass: removeClass,
    toggleClass: toggleClass,

    rotateTo: rotateTo
};

exports.DOM = DOM;

},{"prefix":13,"underscore":14}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _underscore = require('underscore');

var _ = _interopRequireWildcard(_underscore);

function wrapSelector(selectorString) {
    return function (element) {
        var matchingElements = document.querySelectorAll(selectorString);
        if (Array.prototype.indexOf.call(matchingElements, element) !== -1) return true;

        return false;
    };
}

var DOMListener = (function () {
    function DOMListener(domTarget, event, childSelector) {
        _classCallCheck(this, DOMListener);

        this.listening = false;
        this._listenTarget = domTarget;
        this._eventName = event;
        this._childSelector = _.isFunction(childSelector) ? childSelector : wrapSelector(childSelector);

        this.handle = this._handle.bind(this);
        this._callbacks = [];
    }

    _createClass(DOMListener, [{
        key: 'listen',
        value: function listen(callback) {
            if (_.isFunction(callback)) this._callbacks.push(callback);
            if (this.listening) return this;

            this.listening = true;
            this._listenTarget.addEventListener(this._eventName, this.handle);
            return this;
        }
    }, {
        key: 'stopListening',
        value: function stopListening() {
            this.listening = false;
            this._listenTarget.removeEventListener(this._eventName, this.handle);
        }
    }, {
        key: 'removeCallback',
        value: function removeCallback(callback) {
            this._callbacks = _.without(this._callbacks, callback);
        }
    }, {
        key: '_handle',
        value: function _handle(event) {
            var _this = this;

            if (!this._childSelector(event.target) || !this.listening) return;

            this._callbacks.forEach(function (listener) {
                try {
                    listener(event);
                } catch (e) {
                    console.warn('Caught an error handling the callback for event ' + _this._eventName + ': err.stack');
                }
            });
        }
    }]);

    return DOMListener;
})();

exports.DOMListener = DOMListener;

},{"underscore":14}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _app = require('./app');

var _state = require('./state');

var _response = require('./response');

var _request = require('./request');

var _domlistener = require('./domlistener');

var _module2 = require('./module');

exports.App = _app.App;
exports.UserState = _state.UserState;
exports.ResponseHandler = _response.ResponseHandler;
exports.RemoteRequest = _request.RemoteRequest;
exports.DOMListener = _domlistener.DOMListener;
exports.Module = _module2.Module;

},{"./app":1,"./domlistener":3,"./module":5,"./request":6,"./response":7,"./state":8}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _underscore = require('underscore');

var _ = _interopRequireWildcard(_underscore);

var _domfunctions = require('./domfunctions');

var _util = require('./util');

function createEventHandler(context) {
	return (function (event) {
		var _this = this;

		var eventType = event.type,
		    target = event.target;

		// Attempt to lift the moduleId attributre from this element's parent for events where a module name has not been set
		this._handlingModule = _domfunctions.DOM.parentAttribute(target, 'data-module-id');

		// Filter the event list down to only events handling the currently fired type of event
		_.chain(this.events).map(function (handler, selector) {
			return [selector, handler];
		}).filter(function (handler) {
			// Check if this event handler shoulod handle this event type by slicing the event name off the front of the definition
			var split = handler[0].split(' '),
			    targetType = split.shift().toLowerCase(),
			    selector = split.join(' ');

			// Checks whether the event type matches, and whether the selector, if supplied, matches the currently emitting element
			return targetType == eventType && (selector.length == 0 || (0, _util.toArray)(_this.querySelectorAll(selector)).indexOf(target) !== -1);
		})
		// And then fire the handler if it's appropriate
		.each(function (handler) {
			try {
				_this[handler[1]](event);
			} catch (e) {
				_this.app.warn('Caught an error in an event handler (' + handler[1] + '): ' + e.stack);
			}
		});

		// Once event triggering is complete, remove the _handlingModule attribute to ensure it doesn't bleed into other events
		delete this._handlingEvent;
	}).bind(context);
}

function forAllEvents(context, toDo) {
	_.chain(Object.keys(context.events)).map(function (val) {
		return val.substr(0, val.indexOf(' ')).toLowerCase();
	}).uniq().each(function () {
		return toDo.apply(undefined, arguments);
	});
}

var Module = (function () {
	function Module(props, app, moduleId) {
		var _this2 = this;

		_classCallCheck(this, Module);

		_.chain(props).allKeys().each(function (propName) {
			return _this2[propName] = props[propName];
		});

		// Create a pointer to the containing App so that we can trigger events on it
		this._app = app;
		this.moduleId = moduleId;
		// Construct a single event handler to attach to all event types, so that we can easily remove them as need be
		this._handle = createEventHandler(this);

		// If an initialize function exists then attempt to run it, catching any potential errors
		if (typeof this.initialize == 'function') try {
			this.initialize();
		} catch (e) {
			this.app.warn('Caught an error initializing module: ' + e.stack);
		}

		// If any event listeners were defined, then start listening to them now
		// This happens after initialize, in case there are any dynamic events that need listening to
		if (_.isObject(this.events) && Object.keys(this.events).length >= 1) this.listen();
	}

	// Getter for the app instance - returns the constructing App object for emitting events and so forth

	_createClass(Module, [{
		key: 'querySelector',
		value: function querySelector(selector) {
			var el = this.el;
			if (Array.isArray(el)) {
				for (var i = 0; i < el.length; i++) {
					var result = el[i].querySelector(selector);
					if (result) return result;
				}
			} else {
				return el.querySelectorAll(selector);
			}
		}
	}, {
		key: 'querySelectorAll',
		value: function querySelectorAll(selector) {
			var el = this.el;
			if (Array.isArray(el)) {
				var childElements = [];
				for (var i = 0; i < el.length; i++) {
					childElements = childElements.concat((0, _util.toArray)(el[i].querySelectorAll(selector)));
				}
				return childElements;
			} else {
				return el.querySelectorAll();
			}
		}
	}, {
		key: 'emit',
		value: function emit(eventType, props) {
			var showLoading = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

			var moduleName = this.moduleId;
			if (!moduleName && this._handlingModule) {
				moduleName = this._handlingModule;
			} else if (!moduleName) {
				return this.app.warn('Attempting to emit an event from a module that has no moduleId set');
			}

			return this._app.dispatch(moduleName, eventType, props, showLoading);
		}
	}, {
		key: 'listen',
		value: function listen() {
			var _this3 = this;

			if (!_.isObject(this.events)) return;

			if (this.isListening) this.stopListening();

			forAllEvents(this, function (eventType) {
				return _.each(_this3.el, function (element) {
					return element.addEventListener(eventType, _this3._handle, ['focus', 'blur', 'change'].indexOf(eventType) !== -1);
				});
			});
			this.isListening = true;
		}

		/**
   * Unbinds all previously set event listeners on this Module
   */
	}, {
		key: 'stopListening',
		value: function stopListening() {
			var _this4 = this;

			forAllEvents(this, function (eventType) {
				return _.each(_this4.el, function (element) {
					return element.el.removeEventListener(eventType, _this4._handle);
				});
			});
			this.isListening = false;
		}
	}, {
		key: 'app',
		get: function get() {
			return this._app;
		}

		// Redirect gets on isListening to _listening, creating it if it hasn't already been created
	}, {
		key: 'isListening',
		get: function get() {
			if (!_.isBoolean(this._listening)) this._listening = false;
			return this._listening;
		},

		// Redirect values on isListening to _listening
		set: function set(value) {
			this._listening = value;
		}

		/**
   * Get this modules controlling Element instance - if it has not already been located it will search for and save the Element
   * If it cannot find any instance (using the selector [data-module-id="module name"]) then it will emit an error
   */
	}, {
		key: 'el',
		get: function get() {
			if (!(this._el instanceof Element)) {
				var selector = '';
				_.each(this.domLink, function (value, key) {
					return selector += '[data-module-' + key + '="' + value + '"]';
				});
				if (this.moduleId) selector += '[data-module-id="' + this.moduleId + '"]';

				var el = (0, _util.toArray)(document.querySelectorAll(selector));
				if (!el || el.length == 0) throw new Error('Unable to find Element for this Module: ' + this.moduleId);
				this._el = el;
			}

			// If no name has been implicitly set, attempt to resolve one by checking the modules on the page
			// If only one moduleId is found in the element list, automagically set it for this module
			if (!this.moduleId) {
				var names = _.chain(this._el).map(function (el) {
					return el.dataset.moduleId;
				}).uniq().value();
				if (names.length == 1) this.moduleId = names[0];
			}

			return this._el;
		}
	}]);

	return Module;
})();

exports.Module = Module;

},{"./domfunctions":2,"./util":9,"underscore":14}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _querystring = require('querystring');

var querystring = _interopRequireWildcard(_querystring);

var _underscore = require('underscore');

var _ = _interopRequireWildcard(_underscore);

function getContentType(contentHeader) {
    var types = contentHeader.split(';'),
        optimism = types.shift().toLowerCase();

    if (optimism.indexOf('json') !== -1) return 'json';else if (optimism.indexOf('html') !== -1) return 'html';else if (optimism.indexOf('xml') !== -1) return 'xml';else if (optimism.indexOf('javascript') !== -1) return 'script';

    return 'text';
}

var RemoteRequest = (function () {
    function RemoteRequest(url) {
        _classCallCheck(this, RemoteRequest);

        this._url = url;
        this._data = {};
        this._headers = {};
        this._isAsync = true;
    }

    _createClass(RemoteRequest, [{
        key: 'addData',
        value: function addData(data) {
            if (!_.isObject(data)) {
                if (_.isString(data) && data.indexOf('=') !== -1) {
                    data = querystring.parse(data);
                } else if (_.isArray(data)) {
                    data = _.zipObject(data);
                } else {
                    return this;
                }
            }

            _.assign(this._data, data);

            return this;
        }
    }, {
        key: 'setContentType',
        value: function setContentType() {
            var contentType = arguments.length <= 0 || arguments[0] === undefined ? 'application/json' : arguments[0];

            return this.addHeader('Content-Type', contentType);
        }
    }, {
        key: 'addHeader',
        value: function addHeader(headerName, headerValue) {
            this._headers[headerName] = headerValue;
            return this;
        }
    }, {
        key: 'isAsync',
        value: function isAsync(async) {
            if (typeof async == 'undefined') async = !this._isAsync;
            this._isAsync = async;
            return this;
        }
    }, {
        key: 'get',
        value: function get() {
            return this._doRequest('GET', querystring.stringify(this._data));
        }
    }, {
        key: 'post',
        value: function post() {
            var _this = this;

            var data = undefined;
            try {
                data = JSON.stringify(this._data);
                if (!this._headers['Content-Type']) {
                    this.setContentType('application/json');
                } else if (this._headers['Content-Type'] && this._headers['Content-Type'] == 'multipart/form-data') {
                    data = new FormData();
                    var keys = Object.keys(this._data);
                    keys.forEach(function (key) {
                        return data.append(key, _this._data[key]);
                    });
                    delete this._headers['Content-Type'];
                }
            } catch (e) {
                console.warn('Unable to convert data to JSON structure: ' + e.stack);
                return new Promise(function (resolve, reject) {
                    return reject();
                });
            }

            return this._doRequest('POST', data);
        }
    }, {
        key: '_doRequest',
        value: function _doRequest(method, data) {
            var _this2 = this;

            var xhr = this._xhr = new XMLHttpRequest(),
                originalArgs = arguments;

            xhr.open(method.toUpperCase(), this._url, this._isAsync);

            _.each(this._headers, function (value, key) {
                return xhr.setRequestHeader(key, value);
            });

            return new Promise(function (resolve, reject) {
                xhr.onload = function () {
                    return _this2._complete(resolve, reject);
                };
                xhr.onerror = function () {
                    return _this2._error(resolve, reject);
                };
                xhr.onabort = function () {
                    return _this2._aborted(resolve, reject);
                };
                xhr.ontimeout = function () {
                    return _this2._timedOut(resolve, reject, originalArgs);
                };

                xhr.send(data);
            });
        }
    }, {
        key: '_complete',
        value: function _complete(resolve, reject) {
            var xhr = this._xhr,
                data = xhr.responseText;

            if (xhr.status !== 200) return this._error(resolve, reject);

            var contentType = getContentType(xhr.getResponseHeader('Content-Type'));
            if (contentType == 'json') {
                try {
                    data = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.warn('Unable to parse response text from server');
                }
            }

            resolve(data);
        }
    }, {
        key: '_error',
        value: function _error(resolve, reject) {
            var xhr = this._xhr;

            reject(xhr.status, xhr.responseText);
        }
    }, {
        key: '_aborted',
        value: function _aborted(resolve, reject) {}
    }, {
        key: '_timedOut',
        value: function _timedOut(resolve, reject, originalArgs) {
            this._doRequest.apply(this, _toConsumableArray(originalArgs)).then(function () {
                return resolve.apply(undefined, arguments);
            })['catch'](function () {
                return reject.apply(undefined, arguments);
            });
        }
    }]);

    return RemoteRequest;
})();

exports.RemoteRequest = RemoteRequest;

},{"querystring":12,"underscore":14}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _underscore = require('underscore');

var _ = _interopRequireWildcard(_underscore);

var _domfunctions = require('./domfunctions');

var _app = require('./app');

var ResponseHandler = (function () {
    function ResponseHandler(handlingApp) {
        _classCallCheck(this, ResponseHandler);

        this.handlingApp = handlingApp;
    }

    /**
     * The following two functions are internal, and cannot be called by server responses
     */

    _createClass(ResponseHandler, [{
        key: 'has',
        value: function has(funcName) {
            if (['has', 'handle'].indexOf(funcName) !== -1) return false;

            return _.isFunction(this[funcName]);
        }
    }, {
        key: 'handle',
        value: function handle(callingApp, funcName) {
            if (!this.has(funcName)) return;

            try {
                for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
                    args[_key - 2] = arguments[_key];
                }

                this[funcName].apply(this, args);
            } catch (e) {
                this.handlingApp.warn('Caught an error handling response in \'' + funcName + '\': ' + e.stack);
            }
        }

        /**
         * Response handlers are below
         */

        /**
         * Replaces the contents of a DOM element with the provided HTML
         * @param  {string} selector  A CSS selector to specify the target container
         * @param  {string} innerHtml The new HTML
         */
    }, {
        key: 'replaceWith',
        value: function replaceWith(selector, innerHtml) {
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                return element.innerHTML = innerHtml;
            });
            if (affected < 1) this.handlingApp.warn('CSS selector for replaceWith matched no DOM elements: ' + selector);
        }

        /**
         * Insert a HTML block inside a parent, before it's existing content
         * @param {String} selector A CSS selector to specify the target that will have new content appended inside it
         * @param {String} innerHtml The new HTML to be inserted
         */
    }, {
        key: 'prependTo',
        value: function prependTo(selector, innerHtml) {
            var container = document.createElement('div');
            container.innerHTML = innerHtml;
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                for (var i = container.children.length; i; i--) {
                    var newNode = container.children[i - 1].cloneNode(true);
                    if (element.children.length) element.insertBefore(newNode, element.firstChild);else element.appendChild(newNode);
                }
            });

            if (!affected) this.handlingApp.warn('CSS selector for prependTo matched no DOM elements: ' + selector);
        }

        /**
         * Insert a HTML block inside a parent, after it's existing content
         * @param {String} selector A CSS selector to specify the target that will have new content appended inside it
         * @param {String} innerHtml The new HTML to be inserted
         */
    }, {
        key: 'appendTo',
        value: function appendTo(selector, innerHtml) {
            var container = document.createElement('div');
            container.innerHTML = innerHtml;
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                _domfunctions.DOM.cloneChildren(container, function (newNode) {
                    return element.appendChild(newNode);
                });
            });

            if (!affected) this.handlingApp.warn('CSS selector for appendTo matched no DOM elements: ' + selector);
        }

        /**
         * Insert a HTML block before the specified sibling
         * @param {String} selector A CSS selector to specify the target that will have new content appended inside it
         * @param {String} newContent The new HTML to be inserted
         */
    }, {
        key: 'insertBefore',
        value: function insertBefore(selector, newContent) {
            var container = document.createElement('div');
            container.innerHTML = newContent;
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                _domfunctions.DOM.cloneChildren(container, function (newNode) {
                    return element.parentElement.insertBefore(newNode, element);
                });
            });

            if (!affected) this.handlingApp.warn('CSS selector for appendTo matched no DOM elements: ' + selector);
        }

        /**
         * Insert a HTML block inside a parent, before it's existing content
         * @param {String} selector A CSS selector to specify the target that will have new content appended inside it
         * @param {String} newContent The new HTML to be inserted
         */
    }, {
        key: 'insertAfter',
        value: function insertAfter(selector, newContent) {
            var container = document.createElement('div');
            container.innerHTML = newContent;
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                var insertMethod = element.nextSibling ? 'nextSibling' : 'appendChild',
                    insertSibling = insertMethod == 'nextSibling' ? element.nextSibling : null;
                _domfunctions.DOM.cloneChildren(container, function (newNode) {
                    if (insertMethod == 'nextSibling') element.parentElement.insertBefore(newNode, insertSibling);else element.parentElement.appendChild(newNode);
                });
            });

            if (!affected) this.handlingApp.warn('CSS selector for appendTo matched no DOM elements: ' + selector);
        }

        /**
         * Forward the user's browser to a new url
         * @param  {string} url The new target url
         */
    }, {
        key: 'goTo',
        value: function goTo(url) {
            document.location = url;
        }

        /**
         * Forward the user's browser to a new page within this app
         * @param  {String} pageName The new page to navigate to
         */
    }, {
        key: 'goToPage',
        value: function goToPage(pageName) {
            if ( document.location.pathname !== '/' ) {
                var currentPath = document.location.pathname.split('/');
                if (currentPath[currentPath.length - 1] !== '')
                    currentPath.pop();

                currentPath.push(pageName);
            } else {
                currentPath = [pageName];
            }

            var newPath = currentPath.join('/');
            document.location = newPath;
        }

        /**
         * Alias method for goTo
         */
    }, {
        key: 'forward',
        value: function forward() {
            this.goToPage.apply(this, arguments);
        }

        /**
         * Rotate an element, because why not
         */
    }, {
        key: 'rotate',
        value: function rotate(selector, amount) {
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                return _domfunctions.DOM.rotateTo(element, amount);
            });

            if (affected < 1) this.handlingApp.warn('CSS selector for rotate matched no DOM elements: ' + selector);
        }

        /**
         * Add a class to a specified HTML block
         */
    }, {
        key: 'addClass',
        value: function addClass(selector, className) {
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                return _domfunctions.DOM.addClass(element, className);
            });

            if (affected < 1) this.handlingApp.warn('CSS selector for addClass matched no DOM elements: ' + selector);
        }

        /**
         * Strip a class from a specified HTML block
         */
    }, {
        key: 'removeClass',
        value: function removeClass(selector, className) {
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                return _domfunctions.DOM.removeClass(element, className);
            });

            if (affected < 1) this.handlingApp.warn('CSS selector for removeClass matched no DOM elements: ' + selector);
        }

        /**
         * Toggle a class on a specified HTML block
         * This will remove the class if it's present, or add it if it isn't
         */
    }, {
        key: 'toggleClass',
        value: function toggleClass(selector, className) {
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                return _domfunctions.DOM.toggleClass(element, className);
            });

            if (affected < 1) this.handlingApp.warn('CSS selector for toggleClass matched no DOM elements: ' + selector);
        }

        /**
         * Show a HTML element by removing the hide class
         */
    }, {
        key: 'show',
        value: function show(selector) {
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                return _domfunctions.DOM.removeClass(element, 'hide');
            });

            if (affected < 1) this.handlingApp.warn('CSS selector for show matched no DOM elements: ' + selector);
        }

        /**
         * Hide a HTML element by adding the hide class
         */
    }, {
        key: 'hide',
        value: function hide(selector) {
            var affected = _domfunctions.DOM.applyToAll(selector, function (element) {
                return _domfunctions.DOM.addClass(element, 'hide');
            });

            if (affected < 1) this.handlingApp.warn('CSS selector for hide matched no DOM elements: ' + selector);
        }

        /**
         * Reveals an existing module that was previously hidden on the page
         */
    }, {
        key: 'showModule',
        value: function showModule(moduleId) {
            var module = this.handlingApp.getModule(moduleId);
            if (module) module.el.forEach(function (element) {
                return _domfunctions.DOM.removeClass(element, 'hide');
            });else this.handlingApp.warn('Module ' + moduleId + ' not found to show it');
        }

        /**
         * Hide an existing module by adding the 'hide' class to it's element
         */
    }, {
        key: 'hideModule',
        value: function hideModule(moduleId) {
            var module = this.handlingApp.getModule(moduleId);
            if (module) module.el.forEach(function (element) {
                return _domfunctions.DOM.addClass(element, 'hide');
            });else this.handlingApp.warn('Module ' + moduleId + ' not found to hide it');
        }

        /**
         * Call a method contained within the named module, with the provided arguments
         * @param {String} moduleName The name of the module to be called
         * @param {String} method The method to be called
         */
    }, {
        key: 'module',
        value: function module(moduleName, method) {
            var module = this.handlingApp.getModule(moduleName);
            if (!module) return this.handlingApp.warn('Module method requested but module "' + moduleName + '" not known');
            if (!_.isFunction(module[method])) return this.handlingApp.warn('Module method requested but module "' + moduleName + '" has no method "' + method + '()"');

            try {
                for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
                    args[_key2 - 2] = arguments[_key2];
                }

                module[method].apply(module, args);
            } catch (e) {
                this.handlingApp.warn('Caught an error handling method "' + method + '()" in module "' + moduleName + '"');
            }
        }

        /**
         * Syncronise the timer on the server with the timer on the client
         * @param {String} timerName The name of the timer being syncronised
         * @param {String} syncTime The time the timer should be syncronised to
         * @param {String} duration The overall running time for the timer
         */
    }, {
        key: 'timerSync',
        value: function timerSync(timerName) {
            for (var _len3 = arguments.length, syncArgs = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
                syncArgs[_key3 - 1] = arguments[_key3];
            }

            this.module.apply(this, [timerName, 'sync'].concat(syncArgs));
        }

        /**
         * Start a timer
         * @param {String} timerName The name of the timer that should be started
         * @param {String} startTime The time at which the timer will be started
         */
    }, {
        key: 'timerStart',
        value: function timerStart(timerName, startTime) {
            this.module(timerName, 'start', startTime);
        }

        /**
         * Tell a timer to complete
         * @param {String} timerName The name of the timer that should be finishing
         */
    }, {
        key: 'timerFinish',
        value: function timerFinish(timerName) {
            this.module(timerName, 'finish');
        }

        /**
         * Modify user state, which is stored internally and (in theory) only adjustable via the API
         * State is sent with every user request
         */
    }, {
        key: 'state',
        value: function state(key, value) {
            this.handlingApp._state.setValue(key, value);
        }
    }]);

    return ResponseHandler;
})();

exports.ResponseHandler = ResponseHandler;

},{"./app":1,"./domfunctions":2,"underscore":14}],8:[function(require,module,exports){
/**
 * This library stores the current application state
 * State is sent to the server with every AJAX request
 * 
 * State may be read by any module at any time, but may only be modified by responses from the server
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var stateStore = {},
    stateStoreIds = 0;

var UserState = (function () {
	function UserState() {
		_classCallCheck(this, UserState);

		this._id = stateStoreIds++;
		stateStore[this._id] = {};
	}

	_createClass(UserState, [{
		key: "getValue",
		value: function getValue(key) {
			return stateStore[this._id][key];
		}
	}, {
		key: "setValue",
		value: function setValue(key, value) {
			stateStore[this._id][key] = value;
		}
	}, {
		key: "toJSON",
		value: function toJSON() {
			return JSON.parse(JSON.stringify(stateStore[this._id]));
		}
	}]);

	return UserState;
})();

exports.UserState = UserState;

},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _underscore = require('underscore');

var _ = _interopRequireWildcard(_underscore);

/**
 * Convert an Array-like object (such as a NodeList) to a true Array, with forEach and concat properties
 * @param {mixed} arrayLike An Array-like object such as a NodeList or AttributeList
 * @returns {Array} A true Array copy of the Array-like object
 */
function toArray(arrayLike) {
	if (!_.isNumber(arrayLike.length)) throw Error('Trying to convert non-Array-like value to Array');
	return Array.prototype.slice.call(arrayLike);
}

/**
 * Remove all null values from an object
 */
function deNull(object) {
	var keys = Object.keys(object);
	keys.forEach(function (key) {
		if (object[key] == null) delete object[key];
	});

	return object;
}

function isInternalUrl(baseUrl, targetUrl) {
	var base = document.createElement('a'),
	    target = document.createElement('a');

	base.href = baseUrl;
	target.href = targetUrl;

	if (base.hostname !== target.hostname) return false;

	// If the base URL has no pathname then every URL is internal to it
	if (base.pathname == '/') return true;
	// Use the pathname of the base URL as a regular expression to match on the target URL - if it matches then the target is a sub-folder of the base
	if (new RegExp('^base.pathname', 'i').test(target.pathname)) return true;
}

exports.toArray = toArray;
exports.deNull = deNull;
exports.isInternalUrl = isInternalUrl;

},{"underscore":14}],10:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],11:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],12:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":10,"./encode":11}],13:[function(require,module,exports){

var style = document.createElement('p').style
var prefixes = 'O ms Moz Webkit'.split(' ')
var upper = /([A-Z])/g

var memo = {}

/**
 * memoized `prefix`
 *
 * @param {String} key
 * @return {String}
 * @api public
 */

module.exports = exports = function(key){
  return key in memo
    ? memo[key]
    : memo[key] = prefix(key)
}

exports.prefix = prefix
exports.dash = dashedPrefix

/**
 * prefix `key`
 *
 *   prefix('transform') // => WebkitTransform
 *
 * @param {String} key
 * @return {String}
 * @api public
 */

function prefix(key){
  // camel case
  key = key.replace(/-([a-z])/g, function(_, char){
    return char.toUpperCase()
  })

  // without prefix
  if (style[key] !== undefined) return key

  // with prefix
  var Key = capitalize(key)
  var i = prefixes.length
  while (i--) {
    var name = prefixes[i] + Key
    if (style[name] !== undefined) return name
  }

  throw new Error('unable to prefix ' + key)
}

function capitalize(str){
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * create a dasherized prefix
 *
 * @param {String} key
 * @return {String}
 * @api public
 */

function dashedPrefix(key){
  key = prefix(key)
  if (upper.test(key)) {
    key = '-' + key.replace(upper, '-$1')
    upper.lastIndex = 0 // fix #1
  }
  return key.toLowerCase()
}

},{}],14:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}]},{},[1]);
