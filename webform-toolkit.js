/**
 *  Webform-Toolkit
 *  Generate an interactive HTML FORM from JSON
 *
 *  Copyright 2012-2014, Marc S. Brooks (http://mbrooks.info)
 *  Licensed under the MIT license:
 *  http://www.opensource.org/licenses/mit-license.php
 *
 *  Dependencies:
 *    jquery.js
 */

if (!window.jQuery || (window.jQuery && window.jQuery.fn.jquery < '1.8.3')) {
	throw new Error('Webform-Toolkit requires jQuery 1.8.3 or greater.');
}

(function($) {
	var methods = {
		"init" : function(config, callback) {
			return this.each(function() {
				var $this = $(this),
					data  = $this.data();

				var webform = createForm(config, callback);
				$this.append(webform);

				if ( $.isEmptyObject(data) ) {
					$this.data({
						container : webform
					});
				}

				setButtonState(webform);

				return webform;
			});
		},
		"create" : function(config, callback) {
			return this.each(function() {
				var webform = $(this).data().container;

				var field = createField(webform, config);

				// return callback with form and field objects
				if ( $.isFunction(callback) ) {
					callback(webform, field);
				}
			});
		},
		"destroy" : function() {
			return this.each(function() {
				$(this).removeData();
			});
		}
	};

	$.fn.WebformToolkit = function(method) {
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		}
		else
		if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		}
		else {
			$.error('Method ' +  method + ' does not exist in jQuery.WebformToolkit');
		}
	};

	/**
	 * Create form field elements
	 * @param {Object} config
	 * @param {Function} callback
	 * @returns {Object}
	 */
	function createForm(config, callback) {
		var form = $('<form></form>')
			.attr('id', config.id)
			.addClass('webform');

		// set POST action URI/URL
		if (config.action) {
			form.attr({
				method  : 'POST',
				enctype : 'multipart/form-data',
				action  : config.action
			});
		}

		// create hidden elements, if POST parameters exist
		if (config.params) {
			var pairs = config.params.split('&');

			for (var i = 0; i < pairs.length; i++) {
				var name = pairs[i].split('=');

				var hidden = $('<input></input>')
					.attr({
						type  : 'hidden',
						name  : name[0],
						value : name[1]
					});

				form.append(hidden);
			}
		}

		// create form field elements
		if (config.fields) {
			var data = (config.fields[0][0]) ? config.fields : new Array(config.fields);

			for (var j = 0; j < data.length; j++) {
				var fields = $('<fieldset></fieldset>')
					.addClass('field_group' + j);

				for (var k = 0; k < data[j].length; k++) {
					fields.append( createField(form, data[j][k]) );
				}

				form.append(fields);
			}
		}

		// create the submit button
		var div = $('<div></div>')
			.addClass('form_submit');

		var button = $('<input></input>')
			.attr({
				type  : 'submit',
				value : 'Submit'
			});

		// bind form submit event
		form.submit(function(event) {
			event.preventDefault();

			var $this = $(this);

			if (!errorsExist($this)) {

				// return callback with form object response
				if ( $.isFunction(callback) ) {
					callback($this);
				}

				// POST form values
				else {
					$this.get(0).submit();
				}
			}
		});

		div.append(button);

		form.append(div);

		return form;
	}

	/**
	 * Create field elements
	 * @param {Object} form
	 * @param {Object} config
	 * @returns {Object}
	 */
	function createField(form, config) {
		var div = $('<div></div>')
			.addClass('field_' + config.name);

		// .. label, if exists
		if (config.label && config.type != 'checkbox') {
			var label = $('<label></label>');

			if (config.required == 1) {
				var span = $('<span>*</span>')
					.addClass('required');

				label.append(span);
			}

			label.append(config.label);

			div.append(label);
		}

		var elm = jQuery.obj;

		// supported elements
		switch (config.type) {
			case 'text':
				elm = createInputElm(config);
			break;

			case 'password':
				elm = createInputElm(config);
			break;

			case 'hidden':
				elm = createInputElm(config);
			break;

			case 'file':
				elm = createFileElm(config);
			break;

			case 'textarea':
				elm = createTextAreaElm(config);
			break;

			case 'select':
				elm = createMenuElm(config);
			break;

			case 'radio':
				elm = createRadioElm(config);
			break;

			case 'checkbox':
				elm = createCheckBoxElm(config);
			break;

			default:
				$.error('Invalid or missing field type');
			break;
		}

		// filter with REGEX
		if (config.filter && config.type != 'hidden') {
			elm.data({
				regex : config.filter,
				mesg  : config.error,
				error : false
			});

			// attach form events
			form.on('mouseover mousemove', function() {
				validateField(elm);
				setButtonState( $(this) );
			});

			// attach field events
			elm.on('mousedown mouseout focusout', function() {
				validateField(this);
				setButtonState(form);
			});

			elm.on('keypress', function(event) {
				if (event.keyCode == 9) {
					validateField(this);
				}

				setButtonState(form);
			});
		}

		div.append(elm);

		// .. description, if exists
		if (config.description) {
			var block = $('<p>' + config.description + '</p>')
				.addClass('field_desc');

			div.append(block);
		}

		return div;
	}

	/**
	 * Create input elements
	 * @param {Object} config
	 * @returns {Object}
	 */
	function createInputElm(config) {
		var input = $('<input></input>');

		// .. field attributes
		if (config.type) {
			input.attr('type', config.type);
		}

		if (config.name) {
			input.attr('name', config.name);
		}

		if (config.value) {
			input.attr('value', config.value);
		}

		// config.size to be removed in future release
		if (config.maxlength || config.size) {
			input.attr('maxlength', (config.maxlength) ? config.maxlength : config.size);
		}

		if (config.required == 1) {
			input.prop('required', true);
		}

		return input;
	}

	/**
	 * Create FILE element
	 * @param {Object} config
	 * returns {Object}
	 */
	function createFileElm(config) {
		var input = $('<input></input>')
			.attr('type','file');

		// .. field attributes
		if (config.name) {
			input.attr('name', config.name);
		}

		if (config.maxlength) {
			input.attr('size', config.maxlength);
		}

		return input;
	}

	/**
	 * Create select menu elements
	 * @param {Object} config
	 * @returns {Object}
	 */
	function createMenuElm(config) {
		var div = $('<div></div>')
			.addClass('menu');

		var select = $('<select></select>')
			.attr('name', config.name);

		var opts  = config.filter.split('|'),
			first = null;

		// .. first option (custom)
		if (config.value) {
			opts.unshift(config.value);

			first = true;
		}

		// .. select options
		for (var i = 0; i < opts.length; i++) {
			var value = opts[i];

			var option = $('<option>' + value + '</option>');

			if (!first) {
				option.attr('value', value);
			}
			else {
				first = null;
			}

			if (value == config.value) {
				option.prop('selected', true);
			}

			select.append(option);
		}

		if (config.required == 1) {
			select.prop('required', true);
		}

		div.append(select);

		return div;
	}

	/**
	 * Create RADIO button elements
	 * @param {Object} config
	 * @returns {Object}
	 */
	function createRadioElm(config) {
		var div = $('<div></div>')
			.addClass('radios');

		var opts = config.filter.split('|');

		for (var i = 0; i < opts.length; i++) {
			var value = opts[i];

			var input = $('<input></input>')
				.attr({
					type  : 'radio',
					name  : config.name,
					value : value
				});

			if (value == config.value) {
				input.prop('checked', true);
			}

			var span = $('<span>' + value + '</span>');

			div.append(input);
			div.append(span);
		}

		return div;
	}

	/**
	 * Create CHECKBOX elements
	 * @param {Object} config
	 * @returns {Object}
	 */
	function createCheckBoxElm(config) {
		var div = $('<div></div>')
			.addClass('checkbox');

		var label = $('<span>' + config.label + '</span>'),
			input = $('<input></input>')
			.attr({
				type  : 'checkbox',
				name  : config.name,
				value : config.value
			});

		if (config.value) {
			input.prop('checked', true);
		}

		if (config.required == 1) {
			input.prop('required', true);
		}

		div.append(input, label);

		return div;
	}

	/**
	 * Create textarea elements
	 * @param {Object} config
	 * @returns {Object}
	 */
	function createTextAreaElm(config) {
		var textarea = $('<textarea></textarea>')
			.attr('name', config.name);

		if (config.required == 1) {
			textarea.prop('required', true);
		}

		return textarea;
	}

	/**
	 * Validate the form element value
	 * @param {Object} elm
	 * @returns {Boolean}
	 */
	function validateField(elm) {
		var $this = $(elm);

		var value = elm.value;
		if (!value) return;

		var regex = $this.data('regex'),
			error = $this.data('error'),
			mesg  = $this.data('mesg');

		var search = new RegExp(regex, 'g'),
			match  = null;

		// .. REGEX by type
		switch(elm.nodeName) {
			case 'INPUT' :
				match = search.test(value);
			break;

			case 'SELECT' :
				match = search.test(value);
			break;

			case 'TEXTAREA' :
				match = search.test(value);
			break;
		}

		var field = $this.parent(),
			block = null;

		// toggle the error message visibility
		if (match === false && error === false) {
			block = $('<p>' + mesg + '</p>')
				.addClass('error_mesg');

			// .. arrow elements
			var span1 = $('<span></span>'),
				span2 = $('<span></span>');

			span1.addClass('arrow_lft');
			span2.addClass('arrow_rgt');

			block.prepend(span1).append(span2);

			field.append(block);

			$this.addClass('error_on')
				.data('error', true);

			block.fadeIn('slow');
		}
		else
		if (match === true && error === true) {
			block = field.children('p');

			block.fadeOut('slow', function() {
				$this.removeClass('error_on')
					.data('error', false);

				block.remove();
			});
		}

		return true;
	}

	/**
	 * Enable/Disable submit button
	 * @param {Object} form
	 */
	function setButtonState(form) {
		var button = form.find('input:submit');
		if (!button) return;

		if (errorsExist(form)) {
			button.prop('disabled', true);
		}
		else {
			button.prop('disabled', false);
		}
	}

	/**
	 * Return true if form errors exist
	 * @param {Object} form
	 * @returns {Boolean}
	 */
	function errorsExist(form) {
		var fields = form[0].elements;

		for (var i = 0; i < fields.length; i++) {
			var elm = fields[i];

			// supported elements
			if (!/INPUT|SELECT|TEXTAREA/.test(elm.nodeName)) {
				continue;
			}

			if (elm.nodeName == 'INPUT' &&
				!/text|password|radio/.test(elm.type)) {
				continue;
			}

			// do errors exist?
			if ((elm.required && (!elm.value || elm.selectedIndex === '')) || $(elm).data('error')) {
				return true;
			}
		}
	}
})(jQuery);