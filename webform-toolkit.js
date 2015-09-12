/**
 *  Webform-Toolkit
 *  Dynamically generate an HTML form with field validation and custom errors
 *  from JSON
 *
 *  Copyright 2012-2015, Marc S. Brooks (https://mbrooks.info)
 *  Licensed under the MIT license:
 *  http://www.opensource.org/licenses/mit-license.php
 *
 *  Dependencies:
 *    jquery.js
 */

if (!window.jQuery || (window.jQuery && parseInt(window.jQuery.fn.jquery.replace('.', '')) < parseInt('1.8.3'.replace('.', '')))) {
  throw new Error('Webform-Toolkit requires jQuery 1.8.3 or greater.');
}

(function($) {

  /**
   * @namespace WebformToolkit
   */
  var methods = {

    /**
     * Create new instance of Webform-Toolkit
     *
     * @memberof WebformToolkit
     * @method init
     *
     * @example
     * $('#container').WebformToolkit(config, callback);
     *
     * @param {Object} config
     * @param {Function} callback
     *
     * @returns {Object} jQuery object
     */
    "init": function(config, callback) {
      return this.each(function() {
        var $this = $(this),
            data  = $this.data();

        if ( $.isEmptyObject(data) ) {
          $this.data({
            config: config
          });
        }

        var webform = $this.WebformToolkit('_createForm', callback);

        $this.append(webform);
        $this.WebformToolkit('_setButtonState', webform);

        return webform;
      });
    },

    /**
     * Create new instance of Webform-Toolkit
     *
     * @memberof WebformToolkit
     * @method create
     *
     * @example
     * $('#container').WebformToolkit('create', config, callback);
     *
     * @param {Object} config
     * @param {Function} callback
     *
     * @returns {Object} jQuery object
     */
    "create": function(config, callback) {
      return this.each(function() {
        var $this = $(this),
            field = this.WebformToolkit('_createField', $this.find('form'), config);

        // Return callback with form and field objects.
        if ( $.isFunction(callback) ) {
          callback($this, field);
        }
      });
    },

    /**
     * Perform cleanup
     *
     * @memberof WebformToolkit
     * @method destroy
     *
     * @example
     * $('#container').WebformToolkit('destroy');
     */
    "destroy": function() {
      return this.each(function() {
        $(this).removeData();
      });
    },

    /**
     * Create form field elements.
     *
     * @memberof WebformToolkit
     * @method _createForm
     * @private
     *
     * @param {Function} callback
     * @returns {Object} jQuery object
     */
    "_createForm": function(callback) {
      var $this = $(this),
          data  = $this.data();

      var form = $('<form></form>')
        .attr('id', data.config.id)
        .addClass('webform');

      // Set POST action URI/URL
      if (data.config.action) {
        form.attr({
          method:  'POST',
          enctype: 'multipart/form-data',
          action:  data.config.action
        });
      }

      // Create hidden elements, if POST parameters exist.
      if (data.config.params) {
        var pairs = data.config.params.split('&');

        for (var i = 0; i < pairs.length; i++) {
          var name = pairs[i].split('=');

          var hidden = $('<input></input>')
            .attr({
              type:  'hidden',
              name:  name[0],
              value: name[1]
            });

          form.append(hidden);
        }
      }

      // Create form field elements.
      if (data.config.fields) {
        var fields = (data.config.fields[0][0]) ? data.config.fields : new Array(data.config.fields);

        for (var j = 0; j < fields.length; j++) {
          var group = $('<fieldset></fieldset>')
            .addClass('field_group' + j);

          for (var k = 0; k < fields[j].length; k++) {
            group.append(this.WebformToolkit('_createField', form, fields[j][k]));
          }

          form.append(group);
        }
      }

      // Create the submit button.
      var div = $('<div></div>')
        .addClass('form_submit');

      var button = $('<input></input>')
        .attr({
          type:  'submit',
          value: 'Submit'
        });

      // Bind form submit event
      form.on('submit', function(event) {
        event.preventDefault();

        var $this = $(this);

        if (!$this.WebformToolkit('_errorsExist', $this)) {

          // Return callback with form object response.
          if ( $.isFunction(callback) ) {
            callback($this);
          }

          // POST form values.
          else {
            $this.get(0).submit();
          }
        }
      });

      div.append(button);

      form.append(div);

      return form;
    },

    /**
     * Create field elements.
     *
     * @memberof WebformToolkit
     * @method _createField
     * @private
     *
     * @param {Object} form
     * @param {Object} config
     *
     * @returns {Object} jQuery object
     */
    "_createField": function(form, config) {
      var div = $('<div></div>')
        .addClass('field_' + config.name);

      // .. Label, if exists
      if (config.label && config.type != 'checkbox') {
        var label = $('<label></label>')
          .attr('for', config.name);

        if (config.required == 1) {
          var span = $('<span>*</span>')
            .addClass('required');

          label.append(span);
        }

        label.append(config.label);

        div.append(label);
      }

      var elm = jQuery.obj;

      // Supported elements
      switch (config.type) {
        case 'text':
          elm = this.WebformToolkit('_createInputElm', config);
        break;

        case 'password':
          elm = this.WebformToolkit('_createInputElm', config);
        break;

        case 'hidden':
          elm = this.WebformToolkit('_createInputElm', config);
        break;

        case 'file':
          elm = this.WebformToolkit('_createFileElm', config);
        break;

        case 'textarea':
          elm = this.WebformToolkit('_createTextAreaElm', config);
        break;

        case 'select':
          elm = this.WebformToolkit('_createMenuElm', config);
        break;

        case 'radio':
          elm = this.WebformToolkit('_createRadioElm', config);
        break;

        case 'checkbox':
          elm = this.WebformToolkit('_createCheckBoxElm', config);
        break;

        default:
          $.error('Invalid or missing field type');
        break;
      }

      // Assign element ID, if exists.
      if (config.id) {
        elm.attr('id', config.id);
      }

      // Filter with REGEX
      if (config.filter && config.type != 'hidden') {
        elm.data({
          regex: config.filter,
          mesg:  config.error,
          error: false
        });

        // Attach form events
        form.on('mouseover mousemove', function() {
          var $this = $(this);

          $this.WebformToolkit('_validateField', elm);
          $this.WebformToolkit('_setButtonState', $this);
        });

        // Attach field events
        elm.on('mousedown mouseout focusout', function() {
          var $this = $(this);

          $this.WebformToolkit('_validateField', this);
          $this.WebformToolkit('_setButtonState', form);
        });

        elm.on('keypress', function(event) {
          var $this = $(this);

          if (event.keyCode == 9) {
            $this.WebformToolkit('_validateField', $this);
          }

          $this.WebformToolkit('_setButtonState', form);
        });

        // Attach select menu events
        if ($('select', elm)[0]) {
          $('select', elm).on('change', function() {
            var $this = $(this);

            $this.WebformToolkit('_validateField', this);
            $this.WebformToolkit('_setButtonState', form);
          });
        }
      }

      div.append(elm);

      // .. Description, if exists
      if (config.description) {
        var block = $('<p>' + config.description + '</p>')
          .addClass('field_desc');

        div.append(block);
      }

      return div;
    },

    /**
     * Create input elements.
     *
     * @memberof WebformToolkit
     * @method _createInputElm
     * @private
     *
     * @param {Object} config
     * @returns {Object} jQuery object
     */
    "_createInputElm": function(config) {
      var input = $('<input></input>');

      // .. Field attributes
      if (config.type) {
        input.attr('type', config.type);
      }

      if (config.name) {
        input.attr('name', config.name);
      }

      if (config.value) {
        input.attr('value', config.value);
      }

      if (config.maxlength) {
        input.attr('maxlength', config.maxlength);
      }

      if (config.required == 1) {
        input.prop('required', true);
      }

      return input;
    },

    /**
     * Create FILE element.
     *
     * @memberof WebformToolkit
     * @method _createFileElm
     * @private
     *
     * @param {Object} config
     * @returns {Object} jQuery object
     */
    "_createFileElm": function(config) {
      var input = $('<input></input>')
        .attr('type', 'file');

      // .. Field attributes
      if (config.name) {
        input.attr('name', config.name);
      }

      if (config.maxlength) {
        input.attr('size', config.maxlength);
      }

      return input;
    },

    /**
     * Create select menu elements.
     *
     * @memberof WebformToolkit
     * @method _createMenuElm
     * @private
     *
     * @param {Object} config
     *
     * @returns {Object} jQuery object
     */
    "_createMenuElm": function(config) {
      var div = $('<div></div>')
        .addClass('menu');

      var select = $('<select></select>')
        .attr('name', config.name);

      var opts  = config.filter.split('|'),
          first = null;

      // .. First option (custom)
      if (config.value) {
        opts.unshift(config.value);

        first = true;
      }

      // .. Select options
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
    },

    /**
     * Create RADIO button elements.
     *
     * @memberof WebformToolkit
     * @method _createRadioElm
     * @private
     *
     * @param {Object} config
     *
     * @returns {Object} jQuery object
     */
    "_createRadioElm": function(config) {
      var div = $('<div></div>')
        .addClass('radios');

      var opts = config.filter.split('|');

      for (var i = 0; i < opts.length; i++) {
        var value = opts[i];

        var input = $('<input></input>')
          .attr({
            type:  'radio',
            name:  config.name,
            value: value
          });

        if (value == config.value) {
          input.prop('checked', true);
        }

        var span = $('<span>' + value + '</span>');

        div.append(input);
        div.append(span);
      }

      return div;
    },

    /**
     * Create CHECKBOX elements.
     *
     * @memberof WebformToolkit
     * @method _createCheckBoxElm
     * @private
     *
     * @param {Object} config
     *
     * @returns {Object} jQuery object
     */
    "_createCheckBoxElm": function(config) {
      var div = $('<div></div>')
        .addClass('checkbox');

      var label = $('<span>' + config.label + '</span>'),
          input = $('<input></input>')
        .attr({
          type:  'checkbox',
          name:  config.name,
          value: config.value
        });

      if (config.value) {
        input.prop('checked', true);
      }

      if (config.required == 1) {
        input.prop('required', true);
      }

      div.append(input, label);

      return div;
    },

    /**
     * Create textarea elements.
     *
     * @memberof WebformToolkit
     * @method _createTextAreaElm
     * @private
     *
     * @param {Object} config
     *
     * @returns {Object} jQuery object
     */
    "_createTextAreaElm": function(config) {
      var textarea = $('<textarea></textarea>')
        .attr({
          'id':   config.name,
          'name': config.name
        });

      if (config.required == 1) {
        textarea.prop('required', true);
      }

      return textarea;
    },

    /**
     * Validate the form element value.
     *
     * @memberof WebformToolkit
     * @method _validateField
     * @private
     *
     * @param {Object} elm
     *
     * @returns {Boolean}
     */
    "_validateField": function(elm) {
      var $this = $(elm),
          data  = $this.data();

      var value = elm.value;
      if (!value) return;

      var regex = data.regex,
          error = data.error,
          mesg  = data.mesg;

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

        // Toggle the error message visibility.
        if (match === false && error === false) {
        block = $('<p>' + mesg + '</p>')
          .addClass('error_mesg');

        // .. Arrow elements
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

          $(this).remove();
        });
      }

      return true;
    },

    /**
     * Enable/Disable submit button.
     *
     * @memberof WebformToolkit
     * @method _setButtonState
     * @private
     *
     * @param {Object} form
     */
    "_setButtonState": function(form) {
      var button = form.find('input:submit');
      if (!button) return;

      if (this.WebformToolkit('_errorsExist', form)) {
        button.prop('disabled', true);
      }
      else {
        button.prop('disabled', false);
      }
    },

    /**
     * Return true if form errors exist.
     *
     * @memberof WebformToolkit
     * @method _errorsExist
     * @private
     *
     * @param {Object} form
     *
     * @returns {Boolean}
     */
    "_errorsExist": function(form) {
      var fields = form[0].elements;

      for (var i = 0; i < fields.length; i++) {
        var elm = fields[i];

        // Supported elements
        if (!/INPUT|SELECT|TEXTAREA/.test(elm.nodeName)) {
          continue;
        }

        if (elm.nodeName == 'INPUT' &&
          !/text|password|radio/.test(elm.type)) {
          continue;
        }

        // Do errors exist?
        if ((elm.required && (!elm.value || elm.selectedIndex <= 0)) || $(elm).data('error')) {
          return true;
        }
      }
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
})(jQuery);