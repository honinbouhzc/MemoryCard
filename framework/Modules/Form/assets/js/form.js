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