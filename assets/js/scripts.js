$(document).on('ready', function() {
    defineModule({
        domLink: {
            class: 'carousel'
        },

        initialize: function() {
            var _CaptionTransitions = [];
            _CaptionTransitions["FADE"] = { $Duration: 600, $Opacity: 2 };
            _CaptionTransitions["CLIP|LR"] = { $Duration: 900, $Clip: 3, $Easing: { $Clip: $JssorEasing$.$EaseInOutCubic }, $Opacity: 2 };

            var el = this.querySelector('.slider_container'),
                id = el.id,
                data = el.dataset,
                options = {
                    $AutoPlay: data.autoplay || false,
                    $AutoPlayInterval: data.interval * 1000,
                    $PlayOrientation: data.vertical ? 2 : 1,
                    $DragOrientation: data.vertical ? 2 : 1,
                    $FillMode: 1,
                    $SlideDuration: 1000,
                    $CaptionSliderOptions: {
                        $Class: $JssorCaptionSlider$,
                        $CaptionTransitions: _CaptionTransitions,
                        $PlayInMode: 1,
                        $PlayOutMode: 1
                    },
                    $BulletNavigatorOptions: {
                        $Class: $JssorBulletNavigator$,
                        $ChanceToShow: 2,
                        $AutoCenter: data.vertical ? 2 : 1,
                        $Steps: 1,
                        $Lanes: 1,
                        $SpacingX: 10,
                        $SpacingY: 10,
                        $Orientation: data.vertical ? 2 : 1
                    },
                    $ArrowNavigatorOptions: {
                        $Class: $JssorArrowNavigator$,
                        $ChanceToShow: 2,
                        $AutoCenter: data.vertical ? 1 : 2,
                    }
                };

            var slider  = new $JssorSlider$(id, options);
            this.slider = slider;
            this.slider.emit = this.emit.bind(this);
            var sliderWidth = $('#' + id).width();

            function ScaleSlider() {
                var parentWidth = $('#' + id).parent().width();
                if (parentWidth) {
                    if(sliderWidth >= parentWidth)
                        slider.$ScaleWidth(parentWidth);
                }
                else
                    window.setTimeout(ScaleSlider, 30);
            }

            ScaleSlider();

            $(window).bind("load", ScaleSlider);
            $(window).bind("resize", ScaleSlider);
            $(window).bind("orientationchange", ScaleSlider);
        }
    });
});
(function() {
	var regexValidator = {
		email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}/i, // While this apparently doesn't match EVERY email (some email servers accept addresses that should otherwise be invalid) it's as close as one can reasonably get
	};
	
	/**
	 * Calculates a field's value, taking into consideration whether it's a checkbox/radio button, and whether these items are selected
	 * @param {Element} fieldEl The field whos value we are calculating
	 */
	function getFieldValue(fieldEl) {
		if ( fieldEl.tagName.toLowerCase() == 'input' && ['checkbox', 'radio'].indexOf(fieldEl.type.toLowerCase()) !== -1 )
			return fieldEl.checked ? fieldEl.value : undefined;
		if ( fieldEl.value.length == 0 )
			return undefined;
		if ( parseFloat(fieldEl.value) == fieldEl.value )
			return parseFloat(fieldEl.value);
		return fieldEl.value;
	}
	
	/**
	 * Find the first ancestor walking up the DOM that matches a given selector
	 * @param {Element} fieldEl The element whose ancestor we are looking for
	 * @param {String} selector A valid CSS selector to match ancestors against
	 * @param {Element} namespace An ancestor at which we should stop looking
	 */
	function closestParent(fieldEl, selector, namespace) {
		if ( !namespace ) namespace = document;
		// Find all elements on the page that match the selector, and convert it from a NodeList to a regular array
		var allMatches = [].slice.call(namespace.querySelectorAll(selector)),
			parent = fieldEl.parentElement;
			
		while ( parent && parent !== namespace ) {
			if ( allMatches.indexOf(parent) !== -1 ) return parent;
			parent = parent.parentElement;
		}
		return null;
	}
	
	/**
	 * Check if a field is valid using a series of validators
	 * @param {Element} field The field to be checked
	 * @param {String} requiredStr The string to display if the field is required but has no valid value
	 * @param {String} invalidStr The string to display if the field has a value but the value is invalid (eg an invalid email format)
	 */
	function validate(field, requiredStr, invalidStr) {
		var required = (field.attributes.getNamedItem('required') !== null),
			fieldType = field.tagName.toLowerCase() == 'input' ? field.type : field.tagName.toLowerCase(),
			min = field.dataset ? parseFloat(field.dataset.min) : null,
			max = field.dataset ? parseFloat(field.dataset.max) : null,
			minMaxFormat = (min || max) ? field.dataset.format : null,
			customRegex = field.dataset && field.dataset.validator ? new RegExp(field.dataset.validator) : null,
			value = getFieldValue(field),
			passesRegex = (customRegex || regexValidator[fieldType]) ? validateType(value, (customRegex || fieldType)) : null;
			
		// If the field was required but has no value, or is not checked
		if ( required && !value ) return requiredStr;
		// If a custom or builtin regex was applied then check whether it passed or not
		if ( value && typeof passesRegex == 'boolean' && passesRegex === false ) return invalidStr;
		// If a min/max value was supplied and the value does not fulfil the range
		if ( (min !== null || max !== null) && !checkLength(value, min, max, minMaxFormat) ) return invalidStr;
		
		// All known tests passed!
		return true;
	}
	
	/**
	 * Validate a common field type (such as email) against a builtin regex
	 * @param {mixed} fieldValue The current value of the field
	 * @param {mixed} regexType The name of the builtin regular expression, or a custom regular expression on which to validate the value
	 */
	function validateType(fieldValue, regexType) {
		if ( typeof regexType == 'string' ) regexType = regexValidator[regexType];
		var test = (regexType.test(fieldValue));
		return test;
	}
	
	/**
	 * Checks the length of the field based on word or character length
	 * @param {mixed} value The current value of the field
	 * @param {integer} min The minimum value of the field, or null
	 * @param {integer} max The maximum length of the field, or null if it doesn't matter
	 * @param {String} formatType Either 'words' for word length or 'characters' for character length
	 */
	function checkLength(value, min, max, formatType) {
		if ( typeof value == 'undefined' ) value = '';
		var length = formatType == 'words' ? value.split(' ').length : formatType == 'characters' ? value.length : 0;
		if ( (typeof min == 'number' && length < min) || (typeof max == 'number' && length > max) ) return false;
		return true;
	}
	
	/**
	 * Attempts to calculate a label for an invalid field based on:
	 *   If a label exists for this field (based on <label for="this fields id"> existing somewhere on the page)
	 *   If the field has a placeholder text
	 *   If the field's direct parent is a label
	 *   If the field has an ancestor of class="form-group", which also contains a label
	 * 
	 * In the event that none of these cases match, then the field's current value is returned
	 */
	function getFieldLabel(field) {
		var id = field.id,
			label = document.querySelector('label[for="'+id+'"]'),
			placeholder = field.attributes.getNamedItem('placeholder'),
			parentGroup = closestParent(field, '.form-group'),
			parentLabel = parentGroup ? parentGroup.querySelector('label') : null;
			
		if ( label ) return label.innerText;
		if ( placeholder ) return placeholder.value;
		if ( field.parentElement.tagName.toLowerCase() == 'label' ) return field.parentElement.innerText;
		if ( parentLabel ) return parentLabel.innerText;
		
		return field.value;
	}
	
	/**
	 * Useful for .map or .filter to retrieve field names
	 */
	function getNames(field) { return field.name; }
	/**
	 * Useful in .filter or .every to filter out non-unique results 
	 */
	function uniq(element, index, array) {
		var firstIndex = array.indexOf(element);
		return firstIndex == index;
	}
	
	defineModule({
		domLink: {class: 'form'},
		events: {
			'change input,textarea,select': 'fieldChange',
			'submit form': 'submit',
			'click [type="submit"]': 'submit'
		},
		
		initialize: function() {
			this._invalidMessages = {};
			this._requiredMessages = {};
			
			this.shouldValidate = this.calculateValidationHash();
		},
		
		/**
		 * First validates the form, and if it passes validation, posts it to the server using an emit event named 'submit'
		 */
		submit: function(event) {
			event.preventDefault();
			
			// Use the checkValid function to ensure the form is valid, and tell it to show errors if any exist
			if ( !this.checkValid(undefined, true) ) return;
			
			var values = this.serializeForm(),
				submitBtn = this.querySelector('[type="submit"]');
				
			submitBtn.classList.add('loading');
			submitBtn.disabled = true;
			this.emit('submit', values).then(function() {
				submitBtn.classList.remove('loading');
				submitBtn.disabled = false;
			});
		},
		
		fieldChange: function(event) {
			var errorBlock = this.querySelector('.error-block'),
				field = event.target,
				isGroup = field.name.substr(-2) == '[]',
				fieldName = !isGroup ? field.name : field.name.substr(0, field.name.length-2),
				isValid = this.checkValid(fieldName, false),
				labelSelector = '[for="'+field.id+'"]';
				
			// No errors? No care.
			if ( !errorBlock || !field.id || !isValid ) return;
			
			if ( isGroup ) labelSelector = '[group="'+fieldName+'[]"]';
			
			var errorLabel = errorBlock.querySelector(labelSelector);
			if ( errorLabel ) errorLabel.parentElement.removeChild(errorLabel);
		},
		
		/**
		 * Gets the form element for this module
		 */
		getForm: function(ignoreCache) {
			if ( this._form && !ignoreCache ) return this._form;
			return (this._form = this.querySelector('form'));
		},
		
		/**
		 * Lifts the message off the field, or the form if it's more appropriate, and replaces the '%s' partial with a field label
		 */
		_getMessage: function(field, dataValue) {
			var form = this.getForm(),
				msg;
			if ( field.dataset && field.dataset[dataValue] ) {
				msg = field.dataset[dataValue];
			} else if ( form.dataset && form.dataset[dataValue]  ) {
				msg = form.dataset[dataValue];
			}
			if ( !msg ) return '';
			return msg.replace('\%s', getFieldLabel(field));
		},
		
		/**
		 * Finds the most relevant 'this field is not valid' message, starting at the field and then defaulting back to the form
		 */
		getInvalidMessage: function(field) {
			if ( this._invalidMessages[field.name] ) return this._invalidMessages[field.id];
			return (this._invalidMessages[field.name] = this._getMessage(field, 'validationInvalid'));
		},
		
		/**
		 * Finds the most relevant 'this field is required' message, starting at the field and then defaulting back to the form
		 */
		getRequiredMessage: function(field) {
			if ( this._requiredMessages[field.name] ) return this._requiredMessages[field.id];
			return (this._requiredMessages[field.name] = this._getMessage(field, 'validationRequired'));
		},
		
		/**
		 * Gather all of the names of the fields on the form
		 * Field groups (eg someFieldName[]) are included only once, and DO include their trailing [] characters
		 */
		fieldNames: function(withoutFiles, ignoreCache) {
			if ( typeof withoutFiles == 'undefined' ) withoutFiles = true; // Default to not including file fields
			if ( typeof ignoreCache == 'undefined' ) ignoreCache = false;
			
			// Use the cached results if they exist
			if ( this._cachedFieldNames && !ignoreCache ) return this._cachedFieldNames;
			
			// Build a selector string, excluding files if we don't want them
			var selector = 'input' + (withoutFiles?':not([type="file"])':'') + ',textarea,select';
			
			return (this._cachedFieldNames = this.querySelectorAll(selector).map(getNames).filter(uniq));
		},
		
		/**
		 * Find all of the non-file fields and determine whether they are required or should be validated
		 * This hash is then used by the checkValid method to determine whether the form is ready for submitting or not
		 * 
		 * A validation has looks like this:
		 * {
		 * 	name: 'some_field',
		 *  required: true|false,		 true if this field (or group of fields) is required
		 *  validate: true|false, 		 true if this field needs to be validated in some way
		 *  group: true|false, 			 true if this is a group of fields
		 *  requiredMessage: 'some string telling the user to fill this field out',
		 *  invalidMessage: 'some string telling the user they filled this field out wrong'
		 * }
		 */
		calculateValidationHash: function() {
			var hash = this.fieldNames(true, false)
				.map(function(fieldName) {
					var isGroup = fieldName.substr(-2) == '[]', // Fields with a trailing [] are considered field groups and will be validated differently
						field = this.querySelector('[name="'+fieldName+'"]'), // Get the field element in question
						name = !isGroup ? fieldName : fieldName.substr(0, fieldName.length-2), 
						isRequired, hasValidation;
					
					// If this is a group of fields, find the closest ancestor that's likely to group all of the fields in this group
					if ( isGroup ) {
						var fieldGroup = closestParent(field, '.'+field.type.toLowerCase()+'-css-class');
						
						/**
						 *  Sometimes the above selector is unable to match the group (because the wrapping classname is different)
						 * so search instead using a subset of the field id
						 * For example if THIS fields id is form-aad8f4fc-06a9-5a34-658f-e009c7918aee_c17_0 then the trailing _0 indicates it is field 1
						 * Everything before that is the id for this fieldgroup, so search for an element with that id
						 * **/
						if ( !fieldGroup ) {
							var groupId = field.id.match(/(.*)_[\d]+$/); // Use a lazy regex to match <anything>_[digit] to try and find the group's id
							if ( !groupId && groupId.length < 2 ) throw Error('Unable to find field\'s group parent element');
							fieldGroup = closestParent(field, '#' + groupId[1]);
						}
						field = fieldGroup;
					}
					
					// Use the [required] attribute, as well as field-type validation to determine if this field should be validated
					isRequired = (field.attributes.getNamedItem('required') !== null);
					if ( field.tagName.toLowerCase() == 'input' && regexValidator[field.type] ) hasValidation = true;
					if ( typeof field.dataset.min !== 'undefined' || typeof field.dataset.max !== 'undefined' ) hasValidation = true;
					
					return {name: name, required: isRequired, validate: hasValidation, group: isGroup, requiredMessage: this.getRequiredMessage(field), invalidMessage: this.getInvalidMessage(field)};
				}.bind(this));
			return hash;
		},
		
		/**
		 * Turn the form and all of it's values into a JSON structure to be submitted to the server
		 * Unlike jQuery's .serialize() method, this function will turn field groups (where a field's name ends in []) into a proper array
		 */
		serializeForm: function() {
			var fieldNames = this.fieldNames(),
				data = {};
			fieldNames.forEach(function(name) {
				var shouldBeArray = name.substr(-2) == '[]',
					fields = this.querySelectorAll('[name="'+name+'"]'),
					value = fields.map(getFieldValue).filter(function(val) { return typeof val !== 'undefined'; });
				
				if ( value.length == 0 && !shouldBeArray )
					value = null;
				else if ( value.length == 1 && !shouldBeArray )
					value = value[0];
				
				// If this field should be an array then strip the trailing [] from the end of the field name when saving the hash
				data[!shouldBeArray ? name : name.substr(0,name.length-2)] = value;
			}.bind(this));
			return data;
		},
		
		/**
		 * Handle validation of the form or fields
		 * @param {Element} field (Optional) A single field to validate - if none is provided the whole form is validated
		 */
		checkValid: function(elementName, showErrors) {
			var messages = [],
				hash = this.shouldValidate;
			if ( elementName ) hash = hash.filter(function(toFilter) { return toFilter.name === elementName; });
			if ( hash.length == 0 ) return true;
			
			// Use the validation hash to validate
			hash.forEach(function(fieldDef) {
				// If this field has no validation and isn't required, just skip it
				if ( !fieldDef.required && !fieldDef.validate ) return;
				
				// If this is a group then validation is treated differently, validating against all of the fields
				if ( fieldDef.group ) {
					var checkedFields = this.querySelectorAll('[name="'+fieldDef.name+'[]"]:checked');
					// Groups only support the 'required' param, so check if the group has at least 1 value, and if not add it to the invalid array
					if ( fieldDef.required && !checkedFields.length ) return messages.push([fieldDef.name+'[]', fieldDef.requiredMessage]);
				} else {
					// Hand off the validation to the validate method, and if the field is invalid, add it's name plus the invalid message to the array of invalids
					var field = this.querySelector('[name="'+fieldDef.name+'"]'),
						valid = validate(field, fieldDef.requiredMessage, fieldDef.invalidMessage);
					if ( valid !== true ) return messages.push([fieldDef.name, valid]);
				}
			}.bind(this));
			
			if ( showErrors && messages.length ) 
				this.showErrors(messages);
				
			return messages.length == 0;
		},
		
		createErrorBlock: function() {
			var block = document.createElement('div'),
				submit = this.querySelector('[type="submit"]');
			if ( !submit ) return this._app.warn('Form does not contain a submit button, could not insert an error block');
			
			block.className = 'error-block';
			submit.parentElement.insertBefore(block, submit);
			return block;
		},
		
		showErrors: function(errorHash) {
			var errorBlock = this.querySelector('.error-block');
			if ( !errorBlock ) errorBlock = this.createErrorBlock();
			if ( errorBlock.childNodes.length )
				errorBlock.innerHTML = '';
			
			errorHash.forEach(function(error) {
				var label = document.createElement('label'),
					wrap = document.createElement('div'),
					targetField = this.querySelector('[name="'+error[0]+'"]');
				
				if ( targetField && error[0].substr(-2) !== '[]' ) {
					if ( !targetField.id ) targetField.id = this.getForm().id + Date.now().toString();
					var forAttr = document.createAttribute('for');
					forAttr.value = targetField.id;
					label.attributes.setNamedItem(forAttr);
				} else if ( error[0].substr(-2) == '[]' ) {
					var groupAttr = document.createAttribute('group');
					groupAttr.value = error[0];
					label.attributes.setNamedItem(groupAttr);
				}
				
				label.innerText = error[1];
				wrap.appendChild(label);
				errorBlock.appendChild(wrap);
			}.bind(this));
		}
	});
})();
defineModule({
    twitterListener: false,
    domLink: {
        class: 'identity',
    },
    events: {
        'click [data-doshare]': 'doShare',
        'click [data-doconnect]': 'doConnect',
    },
    doShare: function(event) {
        event.preventDefault();

        var el  = $(event.target),
            url = el.attr('href');

        if (window.isWechat) {
            document.location = url;
        } else {
            this.windowOpen(url);
        }

        if(!this.twitterListener  && $(event.target).hasClass('twitter')) {
            window.addEventListener ? window.addEventListener("message", this.twitterCallback.bind(this), !1) : window.attachEvent("onmessage", this.twitterCallback.bind(this));

            this.twitterListener = true;
        }
    },
    twitterCallback: function (e) {
        if (e && e.data) {
            var data;

            try {
                data = JSON.parse(e.data);
            } catch(err) {
                // Don't care.
            }

            if (data && data.params && data.params.indexOf('tweet') > -1) {
                // hack to track correct identifier
                var identifier = document.querySelector("link[rel='canonical']").getAttribute("href") + window.puuid;
                this.app.dispatchActivity('social', 'share', 'twitter', identifier);
            }
        }
    },
    doConnect: function(event) {
        event.preventDefault();

        var el  = $(event.target),
            url = el.attr('href');

        if (window.isWechat) {
            document.location = url;
        } else {
            this.windowOpen(url);
        }
    },
    windowOpen: function(url) {
        var module = this;
        window.shareCompleted = function(details) { module.emit('share-complete', details); };
        window.connectCompleted = function(details) { module.emit('connect-complete', details); };

        shareWindow = window.open(url, 'scrmloginWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=1024,height=600');
    }
});
defineModule({
    name: 'identity-wechat',

    domLink: {
        class: 'identity'
    },

    initialize: function() {
        if (typeof wx == 'undefined') {
            return;
        }

        wx.config(wechatShareConfig);

        var module = this;

        wx.ready(function () {
            wx.showOptionMenu();

            var activityType = 'social';
            var identifier = wechatShareData.hash;

            //Share to timeline
            wx.onMenuShareTimeline({
                title: wechatShareData.title,
                link: wechatShareData.link,
                imgUrl: wechatShareData.imgUrl,
                trigger: function (res) {
                    module.app.dispatchActivity(activityType, 'share-start', 'wechat', identifier);
                },
                success: function (res) {
                    module.app.dispatchActivity(activityType, 'share', 'wechat', identifier);
                },
                cancel: function (res) {
                    module.app.dispatchActivity(activityType, 'share-cancelled', 'wechat', identifier);
                },
                fail: function (res) {
                    // alert(JSON.stringify(res));
                }
            });

            //Share an app message
            wx.onMenuShareAppMessage({
                title: wechatShareData.title,
                desc: wechatShareData.desc,
                link: wechatShareData.link,
                imgUrl: wechatShareData.imgUrl,
                trigger: function (res) {
                    module.app.dispatchActivity(activityType, 'share-start', 'wechat', identifier);
                },
                success: function (res) {
                    module.app.dispatchActivity(activityType, 'share', 'wechat', identifier);
                },
                cancel: function (res) {
                    module.app.dispatchActivity(activityType, 'share-cancelled', 'wechat', identifier);
                },
                fail: function (res) {
                    // alert(JSON.stringify(res));
                }
            });

            //Share an app message
            wx.onMenuShareQQ({
                title: wechatShareData.title,
                desc: wechatShareData.desc,
                link: wechatShareData.link,
                imgUrl: wechatShareData.imgUrl,
                trigger: function (res) {
                    module.app.dispatchActivity(activityType, 'share-start', 'qq', identifier);
                },
                success: function (res) {
                    module.app.dispatchActivity(activityType, 'share', 'qq', identifier);
                },
                cancel: function (res) {
                    module.app.dispatchActivity(activityType, 'share-cancelled', 'qq', identifier);
                },
                fail: function (res) {
                    // alert(JSON.stringify(res));
                }
            });

            //Share an app message
            wx.onMenuShareWeibo({
                title: wechatShareData.title,
                desc: wechatShareData.desc,
                link: wechatShareData.link,
                imgUrl: wechatShareData.imgUrl,
                trigger: function (res) {
                    module.app.dispatchActivity(activityType, 'share-start', 'weibo', identifier);
                },
                success: function (res) {
                    module.app.dispatchActivity(activityType, 'share', 'weibo', identifier);
                },
                cancel: function (res) {
                    module.app.dispatchActivity(activityType, 'share-cancelled', 'weibo', identifier);
                },
                fail: function (res) {
                    // alert(JSON.stringify(res));
                }
            });

            //Share an app message
            wx.onMenuShareQZone({
                title: wechatShareData.title,
                desc: wechatShareData.desc,
                link: wechatShareData.link,
                imgUrl: wechatShareData.imgUrl,
                trigger: function (res) {
                    module.app.dispatchActivity(activityType, 'share-start', 'qzone', identifier);
                },
                success: function (res) {
                    module.app.dispatchActivity(activityType, 'share', 'qzone', identifier);
                },
                cancel: function (res) {
                    module.app.dispatchActivity(activityType, 'share-cancelled', 'qzone', identifier);
                },
                fail: function (res) {
                    // alert(JSON.stringify(res));
                }
            });
        });

        wx.error(function (res) {
            console.log(res.errMsg);
        });
    }
});
defineModule({
    domLink: {
		class: 'memoryCard'
	},

	events: {
		'click .card': 'selectCard',
	},

	_isAnimating: false,

	/**
	 * Cards cache
	 */
	_cards: {},
	_ids: {},

	initialize: function() {
		var self = this;
		// Extract the configurations from the DOM when available
		this.container = this.querySelector('.game-container');
		this.maxWidth = parseInt($(this.container).css('width'));
		this.minWidth = parseInt($(this.container).css('min-width'));

		var data = this.container.dataset;

		// How many cards of the same type are required to be considered a match
		if ( data.matchCount ) this._matchCount = parseInt(data.matchCount);

		// Should the board rotate when a match is made
		if ( data.rotateOnMatch ) this._rotateOnMatch = Boolean(parseInt(data.rotateOnMatch));
		// The chances, from 0 to 1, of the board rotating on a match
		if ( data.rotateChance ) this._rotateChance = parseFloat(data.rotateChance);

		if ( data.validationType ) this._validationType = data.validationType;
		if(this._validationType == 'client') {
			this._cards = memoryCardsData[this.moduleId];
			this._ids = memoryCardsIds[this.moduleId];
		}

		this.TO = false;

		$(window).bind('load', this.resizeBoard.bind(this));

		$(window).bind('resize', function() {
			if (self.TO !== false)
				clearTimeout(self.TO);

			self.TO = setTimeout(self.resizeBoard.bind(self), 200);
		});

		$(window).bind('orientationchange', this.resizeBoard.bind(this));
	},

	resizeBoard: function() {
		var windowWidth = $(window).width();

		if (typeof this.lastWindowWidth != 'undefined' && this.lastWindowWidth == windowWidth) {
			return;
		}

		this.lastWindowWidth = windowWidth;

		if (windowWidth > this.maxWidth) {
			windowWidth = this.maxWidth;
		}

		if (windowWidth < this.minWidth) {
			windowWidth = this.minWidth;
		}

		var ratio = (windowWidth / this.maxWidth).toFixed(2);

		$(this.container).hide();
		$(this.container).css('transform-origin', '0px 0px');
		$(this.container).css('transform', 'scale('+ratio+','+ratio+')');
		$(this.container).show(0);

		this.TO = false;
	},

	camelCase: function(input) {
		return input.toLowerCase().replace(/-(.)/g, function(match, group) {
			return group.toUpperCase();
		});
	},

	callMethod: function() {
		if (arguments.length === 0) return;
		var args = [];
		Array.prototype.push.apply( args, arguments );

		var method = args.shift();

		if (this._validationType == 'server') {
			this.emit(method, args.pop());
		} else {
			method = this.camelCase(method);
			method = this[method];
			method.apply(this, args);
		}
	},

	selectCard: function(event) {
		if ( this._isAnimating ) return;

		this._isAnimating = true;

		var target = event.target;
		var id = target.dataset.value;

		target.classList.add('card-loading');

		if (this._cards[id]) {
			this.display(id);
		} else {
			this.callMethod('card-selected', {value: id});
		}
	},

	// called when selectCard is handled server side and caches the image
	displayCallback: function(id, img) {
		this._cards[id] = img;
		this.display(id);
	},

	display: function(id) {
		var item = this.querySelector('#card-' + id);
		item.classList.remove('card-loading');
		item.classList.add('card-selected');
		$(item).children('.back').css('background-image', 'url(' + this._cards[id] + ')');

		if ( this.querySelectorAll('.card-selected').length >= this._matchCount )
			setTimeout(function() {
				this.callCheckCards();
			}.bind(this), 750);
		else
			this._isAnimating = false;
	},

	callCheckCards: function() {
		var allSelected = this.querySelectorAll('.card-selected');
		if ( allSelected.length >= this._matchCount ) {
			var selectedValues = allSelected
				.map(function(item) {
					return item.dataset.value;
				});

			this.callMethod('check-cards', {values: selectedValues});
		}
	},

	checkCards: function(args) {
		var moduleObj = this,
			values = args.values,
			matched = true,
			lastId;

		values.forEach(function loop(id) {
			if (!isNaN(lastId)) {
				matched = matched && (moduleObj._ids[lastId] == moduleObj._ids[id]);
				if (!matched) {
					loop.stop = true;
				}
			}

			lastId = id;
		});

		if (matched) {
			this.emit('matched', {values: values});
			this.matchCards(values);
		} else
			this.turnCards(values);
	},

	matchCards: function(values) {
		var moduleObj = this;

		var total = values.length;
		var animated = 0;
		values.forEach(function(id) {
			var item = moduleObj.querySelector('#card-' + id);
			$(item).append($('<div class="claw-card"><img class="img-responsive" src="assets/img/claw.gif" /></div>'))

			setTimeout(function() {
				$(item).find('.claw-card').hide();
				item.classList.add('card-found');
				item.classList.remove('card-selected');

				animated++;

				if (animated == total) {
					moduleObj._isAnimating = false;

					var isFinished;
					if (moduleObj._validationType == 'client')
						isFinished = moduleObj.isFinished();

					if ( !isFinished && moduleObj._rotateOnMatch )
						setTimeout(moduleObj.rotateBoard.bind(moduleObj), 250);
				}
			}, 500);
		});
	},

	turnCards: function(values) {
		this.querySelectorAll('.card-selected').forEach(function(cardEl) {
			cardEl.classList.remove('card-selected');
			$(cardEl).children('span.back').css('background-image', '');
		});

		this._isAnimating = false;
	},

	rotateBoard: function() {
		var randomness = Math.random(),
			shouldRotate = randomness < this._rotateChance,
			rotateTo = Math.ceil(Math.random() * 2);

		if ( !shouldRotate ) return;

		var previousRotateTo = this.querySelector('.gameboard').dataset.rotateTo ? this.querySelector('.gameboard').dataset.rotateTo : 0;
		rotateTo = (rotateTo + previousRotateTo) % 3;
		console.log('rotate somewhere', rotateTo);
		this.querySelector('.gameboard').className = 'gameboard gameboard-alt'+rotateTo;
		this.querySelector('.gameboard').dataset.rotateTo = rotateTo;

		var width = $(this.querySelector('.gameboard')).width(),
			height = $(this.querySelector('.gameboard')).height();

		var sign = rotateTo == "1" ? "+" : "-";
		$(this.querySelector('.gameboard')).css('transform', 'translateY(' + sign + ((width - height) / 2) + 'px');

		$(window).bind('resize', this.resizeBoard.bind(this));
	},

	isFinished: function() {
		var cardsNo = this.querySelectorAll('.card').length,
			foundCardsNo = this.querySelectorAll('.card-found').length;

		if(foundCardsNo == cardsNo) {
			this.finish();
			return true;
		}

		return false;
	},

	finish: function() {
		this.emit('finish');
	}
});
defineModule({
    domLink: {
        class: 'question',
    },
    events: {
        'click [data-event="next"]': 'doSubmit',
        'click [data-event="finish"]': 'doSubmit',
        'click [data-event="prev"]': 'doPrevious',
        'click .answer *': 'hideNoAnswers'
    },

    initialize: function () {
        this.startTimer();
    },

    startTimer: function() {
        if ( !this.querySelector('.question-container') )
            return;

        var time = this.querySelector('.question-container').dataset.time,
            self = this;

        if(this.timer)
            clearTimeout(this.timer);

        if(time > 0) {
            $(this.querySelector('.controls')).hide();

            $(this.querySelector('.question img')).load(function() {
                this.timer = setTimeout(function() {
                    $(self.querySelector('.question-container h2')).slideUp("normal");
                    $(self.querySelector('.question-container img')).slideUp("normal");
                    self.emit('show-details').then(function() {
                        $(self.querySelector('.controls')).show();
                    });
                }, time * 1000);
            });
        }
    },

    doSubmit: function(event, validate) {
        if ( typeof validate == 'undefined' ) validate = true;

        var eventType = event.target.dataset.event;

        event.preventDefault();
        if ( validate ) {
            var selectedInputs = Array.prototype.slice.call(this.querySelectorAll('input:checked')),
                values = selectedInputs.map(function(element) { return element.value; });

            if ( !values.length ) {
                this.showNoAnswers();
                return;
            }
        }

        this.hideNoAnswers();
        this.emit(eventType, {answer_keys: values});

        if (questionData[this.moduleId]['submitByClick']) {
            $(selectedInputs).prop('disabled', true);
        }
    },

    doPrevious: function(event) {
        this.doSubmit(event, false);
    },

    showNoAnswers: function() {
        var div = this.querySelector('#no-answer-selected');
        if ( div.classList )
            return div.classList.remove('hide');
        div.className = div.className.replace(/(^hide$)|(^hide\s)|(\shide\s)|(\shide$)/g, ' ');
    },

    hideNoAnswers: function() {
        var div = this.querySelector('#no-answer-selected');
        if ( div.classList )
            return div.classList.add('hide');

        if ( !div.className.match(/(^hide$)|(^hide\s)|(\shide\s)|(\shide$)/) )
            div.className += ' hide';
    }
});
function Counter(duration, direction, interval, renderHolder) {
    this.duration       = duration;
    this.direction      = direction;
    this.interval       = interval;
    this.renderHolder   = renderHolder;
    this.currentCounter = 0;
    this.intervalTimer  = null;
    this.intervalSync   = null;
    this.isCounting     = false;

    this.pad = function(val) {
        return val > 9 ? val : "0" + val;
    }

    this.timer = function() {
        var val,
            minutes,
            seconds;

        if (this.direction === 'down')
            val = this.duration - this.currentCounter;
        else if (this.direction === 'up')
            val = this.currentCounter;

        this.showTime(val);


        if (this.duration != 0 && this.currentCounter >= this.duration) {
            this.stop();
            this.triggerStop();
            return;
        }

        this.currentCounter++;
    }

    this.showTime = function(val) {
        seconds = (val % 60) | 0;
        minutes = (val / 60) | 0;

        minutes = this.pad(minutes);
        seconds = this.pad(seconds);

        // if(this.render)
            this.renderHolder.textContent = minutes + ":" + seconds;
    }

    this.count = function() {
        if ((this.duration != 0 && this.currentCounter > this.duration) || this.isCounting
        ) {
            return;
        }

        this.isCounting = true;

        this.timer();
        this.intervalTimer = setInterval(this.timer.bind(this), 1000);
        this.intervalSync = setInterval(this.sync.bind(this), this.interval * 1000);
    }

    this.stop = function() {
        this.isCounting = false;

        if (this.intervalTimer)
            clearInterval(this.intervalTimer);

        if (this.intervalSync)
            clearInterval(this.intervalSync);
    }

    this.triggerStop = function() {
        this.emit('finish', {
                        duration: this.duration,
                        counter: this.currentCounter
                    });
    }

    this.clear = function() {
        this.emit('clear', {
            counter: this.currentCounter
        });
    }

    this.sync = function() {
        this.emit('sync', {
                        duration: this.duration,
                        counter: this.currentCounter
                    });
    }
}

defineModule({
	name: 'timer',

    domLink: {
        class: 'timer'
    },

	initialize: function() {
		var el = this.querySelector('.timer'),
            data = el.dataset,
            name = el.id,
            start;

        if(data.direction === 'up')
            start = (parseInt(data.currentCounter) > parseInt(data.duration)) ? data.duration : data.currentCounter;
        else
            start = (parseInt(data.currentCounter) > parseInt(data.duration)) ? 0 : data.duration - data.currentCounter;

        this.timer = new Counter(data.duration, data.direction, data.interval, el);
        this.timer.emit = this.emit.bind(this);
        this.timer.showTime(start);

        if (data.autostart) {
            this.timer.emit('start');
        }
	},

	start: function(currentValue) {
		var counter = this.timer;
        if ( currentValue )
            counter.currentCounter = currentValue;
		counter.count();
	},

	finish: function() {
		var counter = this.timer;
		counter.stop();
	},

    clear: function() {
        var counter = this.timer;
        counter.clear();
    },

	sync: function(currentValue, duration) {
		var counter = this.timer;

		if ( duration !== 0 && currentValue >= duration ) {
			counter.currentCounter = duration;
			return;
		}

		counter.currentCounter = currentValue;
		counter.duration = duration;
	}
});

defineModule({
    domLink: {
        class: 'todo',
    },
    events: {
        'click [data-event="viewList"]': 'viewList',
        'click [data-event="viewItem"]': 'viewItem',
        'click [data-event="toggleItem"]': 'toggleItem',
        'click [data-event="viewItemLink"]': 'viewItemLink'
    },

    initialize: function() {
        var todo = this;
        $(this.querySelector('.modal')).find('iframe').load(function(e) {
            $(e.target).height($(e.target).contents().find('body')[0].scrollHeight);
        });

        $(this.querySelector('.modal')).on('hide.bs.modal', function () {
            $(todo.querySelector('.modal-body')).find('iframe').attr('src', 'about:blank');

            var listId = $(todo.querySelector('.todo-lists')).find('.active a').data('id');
            todo.fetchLists(listId);
        });

        var listId = (this.fetchRegexFromHash(/^#list=(.*)&item=.*$/) || this.fetchRegexFromHash(/^#list=(.*)$/));

        if (listId) {
            this.showList(listId);

            var itemId = this.fetchRegexFromHash(/&item=(.*)$/);
            if (itemId) {
                this.showItem(listId, itemId);
            }
        }
    },

    fetchRegexFromHash: function(regex) {
        var hash = window.location.hash;

        if (hash.length > 0) {
            var matches = regex.exec(hash);

            if (matches) {
                return matches[1];
            }
        }

        return null;
    },

    fetchLists: function(listId) {
        this.emit('fetchLists', {listId: listId});
    },

    replaceLists: function(innerHtml) {
        var selector = $(this.querySelector('.todo-lists-container'));

        selector.html(innerHtml);
    },

    showList: function(listId) {
        var target = $(this.querySelector('a[data-id="'+listId+'"]'));

        target.closest('li').siblings('li').removeClass('active');
        target.closest('li').addClass('active');

        $(this.querySelectorAll('.todo-list')).addClass('hidden');
        $(this.querySelector('.todo-list#' + listId)).removeClass('hidden');

        $(this.querySelectorAll('.todo-item')).addClass('hidden');
    },

    viewList: function(event) {
        var listId = event.target.dataset.id;

        this.showList(listId);

        this.emit('viewList', {listId: listId});
    },

    showItem: function(listId, itemId) {
        $(this.querySelectorAll('.todo-item')).addClass('hidden');

        $(this.querySelector('.todo-item[data-list-id="' + listId + '"][data-id="' + itemId + '"]')).removeClass('hidden');
    },

    viewItem: function(event) {
        var listId = $(event.target).closest('li').data('listId'),
            itemId = $(event.target).closest('li').data('id'),
            eventType = event.target.dataset.event;

        this.showItem(listId, itemId);

        this.emit(eventType, {listId: listId, itemId: itemId});
    },

    toggleItem: function(event) {
        var target = event.target,
            listId = $(event.target).closest('li').data('listId'),
            itemId = $(event.target).closest('li').data('id');

        if ($(target).is(':checked')) {
            this.emit('completeItem', {itemId: itemId, listId: listId});
        } else {
            this.emit('undoCompleteItem', {itemId: itemId, listId: listId});
        }
    },

    viewItemLink: function(event) {
        if ($(event.target).attr('target') != '_blank') {

            event.preventDefault();
            var modalEl = this.querySelector('.modal');

            $(modalEl).find('.modal-title').html($(event.target).data('title'));
            $(modalEl).find('.modal-body iframe').contents().find('body').html('');
            $(modalEl).find('.modal-body iframe').attr('src', $(event.target).attr('href'));
            $(modalEl).modal('show');
        }

        var listId = $(event.target).parent().data('listId'),
            itemId = $(event.target).parent().data('id'),
            eventType = event.target.dataset.event;

        this.emit(eventType, {itemId: itemId, listId: listId});
    }
});
$(document).on('ready', function() {
    var registerPlayer = function(el, module) {
        var data = el.dataset,
            id = el.id,
            playerid = 'player-' + id;
            type = data.type;
            videoId = data.id;
            width = data.width;
            height = data.height;
            autoplay = data.autoplay;
            preload = data.preload;

        var options = {};
        var video = $(el).find('video');
        var player;

        if(isMobile)
            options.width  = "100%";
        else
            options.width  = width;

        options.height = height;
        options.preload = preload;
        options.controls = true;
        options.autoplay = autoplay == "1" ? true : false;

        $.get('assets/vendors/videos/' + type + '.php?id=' + videoId,
            function(response) {
                var sources = [];
                $.each(response.videos, function(quality, videos) {
                    $.each(videos, function(index, video) {
                        sources.push({
                            type: 'video/' + (video.type == 'flv' ? 'x-' : '') + video.type,
                            src: video.url
                        });
                    });
                });

                player = videojs(playerid, options);
                player.src(sources);

                var activityType = 'video';
                var target = data.type, identifier = data.id;
                player.on('play', function(event) {
                    module.app.dispatchActivity(activityType, 'play', target, identifier);
                    module.emit('play', {currentTime: event.currentTarget.currentTime});
                });

                player.on('ended', function(event) {
                    module.app.dispatchActivity(activityType, 'finished', target, identifier);
                    module.emit('finish');
                });

                player.on('seeking', function(event) {
                    module.emit('seek', {currentTime: event.currentTarget.currentTime});
                });

                player.on('seeked', function() {});

                player.on('pause', function(event) {
                    module.app.dispatchActivity(activityType, 'paused', target, identifier);
                    module.emit('pause', {currentTime: event.currentTarget.currentTime});
                });
            },
            "json"
        );
    };

    defineModule({
        name: 'video',

        domLink: {
            class: 'video'
        },

        initialize: function() {
            var el = this.querySelector('.player');

            registerPlayer(el, this);
        },
    });
});
