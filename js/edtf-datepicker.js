/* =========================================================
 * edtf-datepicker.js
 * Repo: https://github.com/dsi-ehess/edtf-datepicker
 * =========================================================
 * Licensed under the GNU General Public License, Version 3.0;
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.gnu.org/licenses/gpl-3.0.en.html
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */

(function (factory) {
	if (typeof define === 'function' && define.amd) {
		define(['jquery', 'edtf'], factory);
	} else if (typeof exports === 'object') {
		factory(require('jquery'), require('edtf'));
	} else {
		factory(jQuery, edtf);
	}
}(function ($, edtf, undefined) {
	function UTCDate() {
		var date = edtf(new Date(Date.UTC.apply(Date, arguments)));
		date.precision = 3;
		return date;
	}
	function UTCToday() {
		var today = new Date();
		return UTCDate(today.getFullYear(), today.getMonth(), today.getDate());
	}
	function isUTCEquals(date1, date2) {
		return (
			date1.getUTCFullYear() === date2.getUTCFullYear() &&
			date1.getUTCMonth() === date2.getUTCMonth() &&
			date1.getUTCDate() === date2.getUTCDate()
		);
	}
	function alias(method, deprecationMsg) {
		return function () {
			if (deprecationMsg !== undefined) {
				$.fn.datepicker.deprecated(deprecationMsg);
			}

			return this[method].apply(this, arguments);
		};
	}
	function isValidDate(d) {
		return d && !isNaN(d.getTime());
	}

	var DateArray = (function () {
		var extras = {
			get: function (i) {
				return this.slice(i)[0];
			},
			contains: function (d) {
				// Array.indexOf is not cross-browser;
				// $.inArray doesn't work with Dates
				for (var i = 0, l = this.length; i < l; i++) {
					// Use date arithmetic to allow dates with different times to match
					var curDate = edtf(this[i]);
					if (!curDate.precision)
						curDate.precision = 3;
					if (curDate.edtf === d.edtf)
						return i;
				}
				return -1;
			},
			remove: function (i) {
				this.splice(i, 1);
			},
			replace: function (new_array) {
				if (!new_array)
					return;
				if (!$.isArray(new_array))
					new_array = [new_array];
				this.clear();
				this.push.apply(this, new_array);
			},
			clear: function () {
				this.length = 0;
			},
			copy: function () {
				var a = new DateArray();
				a.replace(this);
				return a;
			}
		};

		return function () {
			var a = [];
			a.push.apply(a, arguments);
			$.extend(a, extras);
			return a;
		};
	})();


	// Picker object

	var Datepicker = function (element, options) {
		$.data(element, 'datepicker', this);
		this._events = [];
		this._secondaryEvents = [];

		this._process_options(options);

		this.dates = new DateArray();
		this.viewDate = this.o.defaultViewDate;
		this.focusDate = null;

		this.element = $(element);
		this.isInput = this.element.is('input');
		this.inputField = this.isInput ? this.element : this.element.find('input');
		this.component = this.element.hasClass('date') ? this.element.find('.add-on, .input-group-addon, .input-group-append, .input-group-prepend, .btn') : false;
		if (this.component && this.component.length === 0) {
			this.component = false;
		}

		if (this.o.isInline === null) {
			this.isInline = !this.component && !this.isInput;
		} else {
			this.isInline = this.o.isInline;
		}

		this.picker = $(DPGlobal.template);

		// Checking templates and inserting
		if (this._check_template(this.o.templates.leftArrow)) {
			this.picker.find('.prev').html(this.o.templates.leftArrow);
		}

		if (this._check_template(this.o.templates.rightArrow)) {
			this.picker.find('.next').html(this.o.templates.rightArrow);
		}

		this._buildEvents();
		this._attachEvents();

		if (this.isInline) {
			this.picker.addClass('datepicker-inline').appendTo(this.element);
		}
		else {
			this.picker.addClass('datepicker-dropdown dropdown-menu');
		}

		if (this.o.rtl) {
			this.picker.addClass('datepicker-rtl');
		}

		if (this.o.calendarWeeks) {
			this.picker.find('.datepicker-days .datepicker-switch, thead .datepicker-title, tfoot .today, tfoot .clear')
				.attr('colspan', function (i, val) {
					return Number(val) + 1;
				});
		}

		this._process_options({
			startDate: this._o.startDate,
			endDate: this._o.endDate,
			daysOfWeekDisabled: this.o.daysOfWeekDisabled,
			daysOfWeekHighlighted: this.o.daysOfWeekHighlighted,
			datesDisabled: this.o.datesDisabled
		});

		this._allow_update = false;
		this.setViewMode(this.o.startView);
		this._allow_update = true;

		this.fillDow();
		this.fillMonths();

		this.update();

		if (this.isInline) {
			this.show();
		}
	};

	Datepicker.prototype = {
		constructor: Datepicker,

		_resolveViewName: function (view) {
			$.each(DPGlobal.viewModes, function (i, viewMode) {
				if (view === i || $.inArray(view, viewMode.names) !== -1) {
					view = i;
					return false;
				}
			});

			return view;
		},

		_resolveDaysOfWeek: function (daysOfWeek) {
			if (!$.isArray(daysOfWeek))
				daysOfWeek = daysOfWeek.split(/[,\s]*/);
			return $.map(daysOfWeek, Number);
		},

		_check_template: function (tmp) {
			try {
				// If empty
				if (tmp === undefined || tmp === "") {
					return false;
				}
				// If no html, everything ok
				if ((tmp.match(/[<>]/g) || []).length <= 0) {
					return true;
				}
				// Checking if html is fine
				var jDom = $(tmp);
				return jDom.length > 0;
			}
			catch (ex) {
				return false;
			}
		},

		_process_options: function (opts) {
			// Store raw options for reference
			this._o = $.extend({}, this._o, opts);
			// Processed options
			var o = this.o = $.extend({}, this._o);

			// Check if "de-DE" style date is available, if not language should
			// fallback to 2 letter code eg "de"
			var lang = o.language;
			if (!dates[lang]) {
				lang = lang.split('-')[0];
				if (!dates[lang])
					lang = defaults.language;
			}
			o.language = lang;

			// Retrieve view index from any aliases
			o.startView = this._resolveViewName(o.startView);
			o.minViewMode = this._resolveViewName(o.minViewMode);
			o.maxViewMode = this._resolveViewName(o.maxViewMode);

			// Check view is between min and max
			o.startView = Math.max(this.o.minViewMode, Math.min(this.o.maxViewMode, o.startView));

			// true, false, or Number > 0
			if (o.multidate !== true) {
				o.multidate = Number(o.multidate) || false;
				if (o.multidate !== false)
					o.multidate = Math.max(0, o.multidate);
			}
			o.multidateSeparator = String(o.multidateSeparator);

			o.weekStart %= 7;
			o.weekEnd = (o.weekStart + 6) % 7;

			if (o.startDate !== -Infinity) {
				if (!!o.startDate) {
					if (o.startDate instanceof Date)
						o.startDate = this._local_to_utc(this._zero_time(o.startDate));
					else
						o.startDate = DPGlobal.parseDate(o.startDate);
				}
				else {
					o.startDate = -Infinity;
				}
			}
			if (o.endDate !== Infinity) {
				if (!!o.endDate) {
					if (o.endDate instanceof Date)
						o.endDate = this._local_to_utc(this._zero_time(o.endDate));
					else
						o.endDate = DPGlobal.parseDate(o.endDate);
				}
				else {
					o.endDate = Infinity;
				}
			}

			o.daysOfWeekDisabled = this._resolveDaysOfWeek(o.daysOfWeekDisabled || []);
			o.daysOfWeekHighlighted = this._resolveDaysOfWeek(o.daysOfWeekHighlighted || []);

			o.datesDisabled = o.datesDisabled || [];
			if (!$.isArray(o.datesDisabled)) {
				o.datesDisabled = o.datesDisabled.split(',');
			}
			o.datesDisabled = $.map(o.datesDisabled, function (d) {
				return DPGlobal.parseDate(d);
			});

			var plc = String(o.orientation).toLowerCase().split(/\s+/g),
				_plc = o.orientation.toLowerCase();
			plc = $.grep(plc, function (word) {
				return /^auto|left|right|top|bottom$/.test(word);
			});
			o.orientation = { x: 'auto', y: 'auto' };
			if (!_plc || _plc === 'auto')
				; // no action
			else if (plc.length === 1) {
				switch (plc[0]) {
					case 'top':
					case 'bottom':
						o.orientation.y = plc[0];
						break;
					case 'left':
					case 'right':
						o.orientation.x = plc[0];
						break;
				}
			}
			else {
				_plc = $.grep(plc, function (word) {
					return /^left|right$/.test(word);
				});
				o.orientation.x = _plc[0] || 'auto';

				_plc = $.grep(plc, function (word) {
					return /^top|bottom$/.test(word);
				});
				o.orientation.y = _plc[0] || 'auto';
			}
			if (o.defaultViewDate instanceof Date || typeof o.defaultViewDate === 'string') {
				o.defaultViewDate = DPGlobal.parseDate(o.defaultViewDate);
			} else if (o.defaultViewDate) {
				var year = o.defaultViewDate.year || new Date().getFullYear();
				var month = o.defaultViewDate.month || 0;
				var day = o.defaultViewDate.day || 1;
				o.defaultViewDate = UTCDate(year, month, day);
			} else {
				o.defaultViewDate = UTCToday();
			}
		},
		_applyEvents: function (evs) {
			for (var i = 0, el, ch, ev; i < evs.length; i++) {
				el = evs[i][0];
				if (evs[i].length === 2) {
					ch = undefined;
					ev = evs[i][1];
				} else if (evs[i].length === 3) {
					ch = evs[i][1];
					ev = evs[i][2];
				}
				el.on(ev, ch);
			}
		},
		_unapplyEvents: function (evs) {
			for (var i = 0, el, ev, ch; i < evs.length; i++) {
				el = evs[i][0];
				if (evs[i].length === 2) {
					ch = undefined;
					ev = evs[i][1];
				} else if (evs[i].length === 3) {
					ch = evs[i][1];
					ev = evs[i][2];
				}
				el.off(ev, ch);
			}
		},
		_buildEvents: function () {
			var events = {
				keyup: $.proxy(function (e) {
					if ($.inArray(e.keyCode, [27, 37, 39, 38, 40, 32, 13, 9]) === -1)
						this.update();
				}, this),
				keydown: $.proxy(this.keydown, this),
				paste: $.proxy(this.paste, this)
			};

			if (this.o.showOnFocus === true) {
				events.focus = $.proxy(this.show, this);
			}

			if (this.isInput) { // single input
				this._events = [
					[this.element, events]
				];
			}
			// component: input + button
			else if (this.component && this.inputField.length) {
				this._events = [
					// For components that are not readonly, allow keyboard nav
					[this.inputField, events],
					[this.component, {
						click: $.proxy(this.show, this)
					}]
				];
			}
			else {
				this._events = [
					[this.element, {
						click: $.proxy(this.show, this),
						keydown: $.proxy(this.keydown, this)
					}]
				];
			}
			this._events.push(
				// Component: listen for blur on element descendants
				[this.element, '*', {
					blur: $.proxy(function (e) {
						this._focused_from = e.target;
					}, this)
				}],
				// Input: listen for blur on element
				[this.element, {
					blur: $.proxy(function (e) {
						this._focused_from = e.target;
					}, this)
				}]
			);

			if (this.o.immediateUpdates) {
				// Trigger input updates immediately on changed millennium/century/decade/year/month
				this._events.push([this.element, {
					'changeMillennium changeCentury changeDecade changeYear changeMonth': $.proxy(function (e) {
						e.date.precision = e.type === 'changeMonth' ? 2 : 1;
						e.date = edtf(e.date.edtf);
						this.update(e.date);
					}, this)
				}]);
			}

			this._secondaryEvents = [
				[this.picker, {
					click: $.proxy(this.click, this)
				}],
				[this.picker, '.prev, .next', {
					click: $.proxy(this.navArrowsClick, this)
				}],
				[this.picker, '.day:not(.disabled)', {
					click: $.proxy(this.dayCellClick, this)
				}],
				[$(window), {
					resize: $.proxy(this.place, this)
				}],
				[$(document), {
					'mousedown touchstart': $.proxy(function (e) {
						// Clicked outside the datepicker, hide it
						if (!(
							this.element.is(e.target) ||
							this.element.find(e.target).length ||
							this.picker.is(e.target) ||
							this.picker.find(e.target).length ||
							this.isInline
						)) {
							this.hide();
						}
					}, this)
				}]
			];
		},
		_attachEvents: function () {
			this._detachEvents();
			this._applyEvents(this._events);
		},
		_detachEvents: function () {
			this._unapplyEvents(this._events);
		},
		_attachSecondaryEvents: function () {
			this._detachSecondaryEvents();
			this._applyEvents(this._secondaryEvents);
		},
		_detachSecondaryEvents: function () {
			this._unapplyEvents(this._secondaryEvents);
		},
		_trigger: function (event, altdate) {
			var date = altdate || this.dates.get(-1),
				local_date = this._utc_to_local(date);

			this.element.trigger({
				type: event,
				date: local_date,
				viewMode: this.viewMode,
				dates: $.map(this.dates, this._utc_to_local),
				format: $.proxy(function (ix, format) {
					if (arguments.length === 0) {
						ix = this.dates.length - 1;
					} else if (typeof ix === 'string') {
						format = ix;
						ix = this.dates.length - 1;
					}
					var date = this.dates.get(ix);
					return DPGlobal.formatDate(date, format, this.o.language);
				}, this)
			});
		},

		show: function () {
			if (this.inputField.is(':disabled') || (this.inputField.prop('readonly') && this.o.enableOnReadonly === false))
				return;
			if (!this.isInline)
				this.picker.appendTo(this.o.container);
			this.place();
			this.picker.show();
			this._attachSecondaryEvents();
			this._trigger('show');
			if ((window.navigator.msMaxTouchPoints || 'ontouchstart' in document) && this.o.disableTouchKeyboard) {
				$(this.element).blur();
			}
			return this;
		},

		hide: function () {
			if (this.isInline || !this.picker.is(':visible'))
				return this;
			this.focusDate = null;
			this.picker.hide().detach();
			this._detachSecondaryEvents();
			this.setViewMode(this.o.startView);

			if (this.o.forceParse && this.inputField.val())
				this.setValue();
			this._trigger('hide');
			return this;
		},

		destroy: function () {
			this.hide();
			this._detachEvents();
			this._detachSecondaryEvents();
			this.picker.remove();
			delete this.element.data().datepicker;
			if (!this.isInput) {
				delete this.element.data().date;
			}
			return this;
		},

		paste: function (e) {
			var dateString;
			if (e.originalEvent.clipboardData && e.originalEvent.clipboardData.types
				&& $.inArray('text/plain', e.originalEvent.clipboardData.types) !== -1) {
				dateString = e.originalEvent.clipboardData.getData('text/plain');
			} else if (window.clipboardData) {
				dateString = window.clipboardData.getData('Text');
			} else {
				return;
			}
			this.setDate(dateString);
			this.update();
			e.preventDefault();
		},

		_utc_to_local: function (utc) {
			if (!utc || !(utc instanceof edtf.Date || utc instanceof Date) || utc.precision < 3) {
				return utc;
			}

			var local = new Date(utc.getTime() + (utc.getTimezoneOffset() * 60000));

			if (local.getTimezoneOffset() !== utc.getTimezoneOffset()) {
				local = new Date(utc.getTime() + (local.getTimezoneOffset() * 60000));
			}

			local = edtf(local);
			local.precision = 3;

			return local;
		},
		_local_to_utc: function (local) {
			if (!local || !(local instanceof Date || local instanceof edtf.Date) || (local.precision && local.precision < 3)) {
				return local;
			}
			return edtf(new Date(local.getTime() - (local.getTimezoneOffset() * 60000)));
		},
		_zero_time: function (local) {
			return local && edtf(new Date(local.getFullYear(), local.getMonth(), local.getDate()));
		},
		_zero_utc_time: function (utc) {
			return utc && UTCDate(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
		},

		getDates: function () {
			return $.map(this.dates, this._utc_to_local);
		},

		getUTCDates: function () {
			return $.map(this.dates, function (d) {
				return new Date(d);
			});
		},

		getDate: function () {
			return this._utc_to_local(this.getUTCDate());
		},

		getUTCDate: function () {
			var selected_date = this.dates.get(-1);
			if (selected_date !== undefined) {
				return new Date(selected_date);
			} else {
				return null;
			}
		},

		clearDates: function () {
			this.inputField.val('');
			this._trigger('changeDate');
			this.update();
			if (this.o.autoclose) {
				this.hide();
			}
		},

		setDates: function () {
			var args = $.isArray(arguments[0]) ? arguments[0] : arguments;
			this.update.apply(this, args);
			this._trigger('changeDate');
			this.setValue();
			return this;
		},

		setUTCDates: function () {
			var args = $.isArray(arguments[0]) ? arguments[0] : arguments;
			this.setDates.apply(this, $.map(args, this._utc_to_local));
			return this;
		},

		setDate: alias('setDates'),
		setUTCDate: alias('setUTCDates'),
		remove: alias('destroy', 'Method `remove` is deprecated and will be removed in version 2.0. Use `destroy` instead'),

		setValue: function () {
			var formatted = this.getFormattedDate();
			this.inputField.val(formatted);
			return this;
		},

		getFormattedDate: function () {
			return $.map(this.dates, function (d) {
				var date = edtf(d);
				if (!date.precision)
					date.precision = 3;
				return date.edtf;
			}).join(this.o.multidateSeparator);
		},

		getStartDate: function () {
			return this.o.startDate;
		},

		setStartDate: function (startDate) {
			this._process_options({ startDate: startDate });
			this.update();
			this.updateNavArrows();
			return this;
		},

		getEndDate: function () {
			return this.o.endDate;
		},

		setEndDate: function (endDate) {
			this._process_options({ endDate: endDate });
			this.update();
			this.updateNavArrows();
			return this;
		},

		setDaysOfWeekDisabled: function (daysOfWeekDisabled) {
			this._process_options({ daysOfWeekDisabled: daysOfWeekDisabled });
			this.update();
			return this;
		},

		setDaysOfWeekHighlighted: function (daysOfWeekHighlighted) {
			this._process_options({ daysOfWeekHighlighted: daysOfWeekHighlighted });
			this.update();
			return this;
		},

		setDatesDisabled: function (datesDisabled) {
			this._process_options({ datesDisabled: datesDisabled });
			this.update();
			return this;
		},

		place: function () {
			if (this.isInline)
				return this;
			var calendarWidth = this.picker.outerWidth(),
				calendarHeight = this.picker.outerHeight(),
				visualPadding = 10,
				container = $(this.o.container),
				windowWidth = container.width(),
				scrollTop = this.o.container === 'body' ? $(document).scrollTop() : container.scrollTop(),
				appendOffset = container.offset();

			var parentsZindex = [0];
			this.element.parents().each(function () {
				var itemZIndex = $(this).css('z-index');
				if (itemZIndex !== 'auto' && Number(itemZIndex) !== 0) parentsZindex.push(Number(itemZIndex));
			});
			var zIndex = Math.max.apply(Math, parentsZindex) + this.o.zIndexOffset;
			var offset = this.component ? this.component.parent().offset() : this.element.offset();
			var height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(false);
			var width = this.component ? this.component.outerWidth(true) : this.element.outerWidth(false);
			var left = offset.left - appendOffset.left;
			var top = offset.top - appendOffset.top;

			if (this.o.container !== 'body') {
				top += scrollTop;
			}

			this.picker.removeClass(
				'datepicker-orient-top datepicker-orient-bottom ' +
				'datepicker-orient-right datepicker-orient-left'
			);

			if (this.o.orientation.x !== 'auto') {
				this.picker.addClass('datepicker-orient-' + this.o.orientation.x);
				if (this.o.orientation.x === 'right')
					left -= calendarWidth - width;
			}
			// auto x orientation is best-placement: if it crosses a window
			// edge, fudge it sideways
			else {
				if (offset.left < 0) {
					// component is outside the window on the left side. Move it into visible range
					this.picker.addClass('datepicker-orient-left');
					left -= offset.left - visualPadding;
				} else if (left + calendarWidth > windowWidth) {
					// the calendar passes the widow right edge. Align it to component right side
					this.picker.addClass('datepicker-orient-right');
					left += width - calendarWidth;
				} else {
					if (this.o.rtl) {
						// Default to right
						this.picker.addClass('datepicker-orient-right');
					} else {
						// Default to left
						this.picker.addClass('datepicker-orient-left');
					}
				}
			}

			// auto y orientation is best-situation: top or bottom, no fudging,
			// decision based on which shows more of the calendar
			var yorient = this.o.orientation.y,
				top_overflow;
			if (yorient === 'auto') {
				top_overflow = -scrollTop + top - calendarHeight;
				yorient = top_overflow < 0 ? 'bottom' : 'top';
			}

			this.picker.addClass('datepicker-orient-' + yorient);
			if (yorient === 'top')
				top -= calendarHeight + parseInt(this.picker.css('padding-top'));
			else
				top += height;

			if (this.o.rtl) {
				var right = windowWidth - (left + width);
				this.picker.css({
					top: top,
					right: right,
					zIndex: zIndex
				});
			} else {
				this.picker.css({
					top: top,
					left: left,
					zIndex: zIndex
				});
			}
			return this;
		},

		_allow_update: true,
		update: function () {
			if (!this._allow_update)
				return this;

			var oldDates = this.dates.copy(),
				dates = [],
				fromArgs = false;
			if (arguments.length) {
				$.each(arguments, $.proxy(function (i, date) {
					if (date instanceof Date || date instanceof edtf.Date) {
						var precision = date.precision;
						date = this._local_to_utc(date);
						date.precision = precision;
					}
					dates.push(date);
				}, this));
				fromArgs = true;
			} else {
				dates = this.isInput
					? this.element.val()
					: this.element.data('date') || this.inputField.val();
				if (dates && this.o.multidate)
					dates = dates.split(this.o.multidateSeparator);
				else
					dates = [dates];
				delete this.element.data().date;
			}

			dates = $.map(dates, $.proxy(function (date) {
				return DPGlobal.parseDate(date);
			}, this));
			dates = $.grep(dates, $.proxy(function (date) {
				return (
					!this.dateWithinRange(date) ||
					!date
				);
			}, this), true);
			this.dates.replace(dates);

			if (this.o.updateViewDate) {
				if (this.dates.length)
					this.viewDate = edtf(this.dates.get(-1));
				else if (this.viewDate < this.o.startDate)
					this.viewDate = edtf(this.o.startDate);
				else if (this.viewDate > this.o.endDate)
					this.viewDate = edtf(this.o.endDate);
				else
					this.viewDate = this.o.defaultViewDate;
			}

			if (fromArgs) {
				// setting date by clicking
				this.setValue();
				this.element.change();
			}
			else if (this.dates.length) {
				// setting date by typing
				if (String(oldDates) !== String(this.dates) && fromArgs) {
					this._trigger('changeDate');
					this.element.change();
				}
			}
			if (!this.dates.length && oldDates.length) {
				this._trigger('clearDate');
				this.element.change();
			}

			this.fill();
			return this;
		},

		fillDow: function () {
			if (this.o.showWeekDays) {
				var dowCnt = this.o.weekStart,
					html = '<tr class="dow-header">';
				if (this.o.calendarWeeks) {
					html += '<th class="cw">&#160;</th>';
				}
				while (dowCnt < this.o.weekStart + 7) {
					html += '<th class="dow';
					if ($.inArray(dowCnt, this.o.daysOfWeekDisabled) !== -1)
						html += ' disabled';
					html += '">' + dates[this.o.language].daysMin[(dowCnt++) % 7] + '</th>';
				}
				html += '</tr>';
				this.picker.find('.datepicker-days thead').append(html);
			}
		},

		fillMonths: function () {
			var localDate = this.viewDate;
			var html = '';
			var focused;
			for (var i = 0; i < 12; i++) {
				focused = localDate && !this.viewDate.unspecified.is('month') && localDate.precision > 1 && localDate.month === i ? ' focused' : '';
				html += '<span class="month' + focused + '">' + dates[this.o.language].monthsShort[i] + '</span>';
			}
			this.picker.find('.datepicker-months td').html(html);
		},

		setRange: function (range) {
			if (!range || !range.length)
				delete this.range;
			else
				this.range = $.map(range, function (d) {
					return d.valueOf();
				});
			this.fill();
		},

		getClassNames: function (date) {
			var cls = [],
				year = this.viewDate.year,
				month = this.viewDate.month,
				today = UTCToday(),
				focusDate = edtf(this.focusDate || new Date());
			focusDate.approximate.value = 0;
			focusDate.uncertain.value = 0;
			if (date.year < year || (date.year === year && date.month < month)) {
				cls.push('old');
			} else if (date.year > year || (date.year === year && date.month > month)) {
				cls.push('new');
			}
			if (this.focusDate && date.edtf === focusDate.edtf)
				cls.push('focused');
			// Compare internal UTC date with UTC today, not local today
			if (this.o.todayHighlight && isUTCEquals(date, today)) {
				cls.push('today');
			}
			if (this.dates.contains(date) !== -1)
				cls.push('active');
			if (!this.dateWithinRange(date) || date.year > 9999 || date.year < -9999) {
				cls.push('disabled');
			}
			if (this.dateIsDisabled(date)) {
				cls.push('disabled', 'disabled-date');
			}
			if ($.inArray(date.getUTCDay(), this.o.daysOfWeekHighlighted) !== -1) {
				cls.push('highlighted');
			}
			if (this.range) {
				if (date > this.range[0] && date < this.range[this.range.length - 1]) {
					cls.push('range');
				}
				if ($.inArray(date.valueOf(), this.range) !== -1) {
					cls.push('selected');
				}
				if (date.valueOf() === this.range[0]) {
					cls.push('range-start');
				}
				if (date.valueOf() === this.range[this.range.length - 1]) {
					cls.push('range-end');
				}
			}
			return cls;
		},

		_fill_status_table: function (selector, d) {
			var html = '';
			if (!(d instanceof edtf.Year)) {
				html = '<table>' +
					'<thead>' +
					'<tr>' +
					'<th></th>' +
					'<th>' + (dates[this.o.language].approximate || 'Approximate') + '</th>' +
					'<th>' + (dates[this.o.language].uncertain || 'Uncertain') + '</th>' +
					'</tr>' +
					'</thead>' +
					'<tbody>';
				switch (d.precision) {
					case 3:
						html += '<tr>' +
							'<td>' + (dates[this.o.language].day || 'Day') + '</td>' +
							'<td><input type="checkbox" class="dateStatus" name="approximate" value="day" ' + (d.approximate.is('day') ? 'checked' : '') + '/></td>' +
							'<td><input type="checkbox" class="dateStatus" name="uncertain" value="day" ' + (d.uncertain.is('day') ? 'checked' : '') + '/></td>' +
							'</tr>';
					/* falls through */
					case 2:
						html += '<tr>' +
							'<td>' + (dates[this.o.language].month || 'Month') + '</td>' +
							'<td><input type="checkbox" class="dateStatus" name="approximate" value="month" ' + (d.approximate.is('month') ? 'checked' : '') + '/></td>' +
							'<td><input type="checkbox" class="dateStatus" name="uncertain" value="month" ' + (d.uncertain.is('month') ? 'checked' : '') + '/></td>' +
							'</tr>';
					/* falls through */
					default:
						html += '<tr>' +
							'<td>' + (dates[this.o.language].year || 'Year') + '</td>' +
							'<td><input type="checkbox" class="dateStatus" name="approximate" value="year" ' + (d.approximate.is('year') ? 'checked' : '') + '/></td>' +
							'<td><input type="checkbox" class="dateStatus" name="uncertain" value="year" ' + (d.uncertain.is('year') ? 'checked' : '') + '/></td>' +
							'</tr>';
						break;
				}
				html += '</tbody></table>';
			}
			this.picker.find(selector + ' tfoot .statuses').html(html);
		},

		_fill_unspecified_cells: function (selector, d) {
			var html = '',
				dCopy = edtf(d.edtf);

			if (!(d instanceof edtf.Year)) {
				switch (selector) {
					case '.datepicker-centuries':
						dCopy.precision = 1;
						dCopy.unspecified.value = edtf.Bitmask.Y - 1;
						html = '<th colspan="7"><span class="year unspecified ' + (this.dates.contains(dCopy) !== -1 ? 'active' : '') + '">' + dCopy.edtf + '</span></th>';
						break;
					case '.datepicker-decades':
						dCopy.precision = 1;
						dCopy.unspecified.value = edtf.Bitmask.YYXX;
						html = '<th colspan="7"><span class="year unspecified ' + (this.dates.contains(dCopy) !== -1 ? 'active' : '') + '">' + dCopy.edtf + '</span></th>';
						break;
					case '.datepicker-years':
						dCopy.precision = 1;
						dCopy.unspecified.value = edtf.Bitmask.YYYX;
						html = '<th colspan="7"><span class="year unspecified ' + (this.dates.contains(dCopy) !== -1 ? 'active' : '') + '">' + dCopy.edtf + '</span></th>';
						break;
					case '.datepicker-months':
						html = '<th colspan="7">' +
							'<span class="month unspecified">XX</span>' +
							'<span class="month unspecified">0X</span>' +
							'<span class="month unspecified">1X</span>' +
							'</th>';
						break;
					default:
						dCopy.approximate.value = 0;
						dCopy.uncertain.value = 0;
						dCopy.precision = 2;
						html = '<th colspan="7">' +
							'<span class="day unspecified" data-date="' + dCopy.edtf + '-XX">XX</span>' +
							'<span class="day unspecified" data-date="' + dCopy.edtf + '-0X">0X</span>' +
							'<span class="day unspecified" data-date="' + dCopy.edtf + '-1X">1X</span>' +
							'<span class="day unspecified" data-date="' + dCopy.edtf + '-2X">2X</span>' +
							(dCopy.month !== 1 ? '<span class="day unspecified" data-date="' + dCopy.edtf + '-3X">3X</span>' : '') +
							'</th>';
						break;
				}
			}
			this.picker.find(selector + ' tfoot .unspecified-cells').html(html);
		},

		_fill_yearsView: function (selector, cssClass, factor, year, startYear, endYear, beforeFn) {
			var html = '';
			var step = factor / 10;
			var view = this.picker.find(selector);
			var startVal = Math.floor(year / factor) * factor;
			var endVal = startVal + step * 9;
			var focusedVal = Math.floor(this.viewDate.year / step) * step;
			var selected = $.map(this.dates, function (d) {
				if (d.significant || (d instanceof edtf.Date && d.unspecified.is('year')))
					return null;
				return Math.floor(d.year / step) * step;
			});

			var classes, tooltip, before;
			for (var currVal = startVal - step; currVal <= endVal + step; currVal += step) {
				classes = [cssClass];
				tooltip = null;

				if (currVal === startVal - step) {
					classes.push('old');
				} else if (currVal === endVal + step) {
					classes.push('new');
				}
				if ($.inArray(currVal, selected) !== -1) {
					classes.push('active');
				}
				if (currVal < startYear || currVal > endYear) {
					classes.push('disabled');
				}
				if (currVal === focusedVal) {
					classes.push('focused');
				}

				if (beforeFn !== $.noop) {
					before = beforeFn(new Date(currVal, 0, 1));
					if (before === undefined) {
						before = {};
					} else if (typeof before === 'boolean') {
						before = { enabled: before };
					} else if (typeof before === 'string') {
						before = { classes: before };
					}
					if (before.enabled === false) {
						classes.push('disabled');
					}
					if (before.classes) {
						classes = classes.concat(before.classes.split(/\s+/));
					}
					if (before.tooltip) {
						tooltip = before.tooltip;
					}
				}

				var valLabel = currVal;
				switch (factor) {
					case 1000:
						valLabel = currVal.toString().slice(0, -2) + 'XX';
						break;
					case 100:
						valLabel = currVal.toString().slice(0, -1) + 'X';
						break;
					default:
						break;
				}
				html += '<span class="' + classes.join(' ') + '"' + (tooltip ? ' title="' + tooltip + '"' : '') + '>' + valLabel + '</span>';
			}

			view.find('td').html(html);
		},

		// fills up the datepicker
		fill: function () {
			var d = edtf(this.viewDate),
				titleDate = edtf(this.viewDate),
				year = d.year,
				month = d instanceof edtf.Year ? 0 : d.month,
				startYear = this.o.startDate !== -Infinity ? this.o.startDate.getUTCFullYear() : -Infinity,
				startMonth = this.o.startDate !== -Infinity ? this.o.startDate.getUTCMonth() : -Infinity,
				endYear = this.o.endDate !== Infinity ? this.o.endDate.getUTCFullYear() : Infinity,
				endMonth = this.o.endDate !== Infinity ? this.o.endDate.getUTCMonth() : Infinity,
				todaytxt = dates[this.o.language].today || dates['en'].today || '',
				cleartxt = dates[this.o.language].clear || dates['en'].clear || '',
				titleFormat = dates[this.o.language].titleFormat || dates['en'].titleFormat,
				todayDate = UTCToday(),
				titleBtnVisible = (this.o.todayBtn === true || this.o.todayBtn === 'linked') && todayDate >= this.o.startDate && todayDate <= this.o.endDate && !this.weekOfDateIsDisabled(todayDate),
				tooltip,
				specifiedMonth = false,
				before;
			if (isNaN(year) || isNaN(month))
				return;
			if (d instanceof edtf.Date) {
				specifiedMonth = !d.unspecified.month && !d.unspecified.year;
				titleDate.precision = titleDate.precision === 1 ? 1 : 2;
			}
			this.picker.find('.datepicker-switch')
			.text(titleDate.edtf);
			this.picker.find('tfoot .today')
				.text(todaytxt)
				.css('display', titleBtnVisible ? 'table-cell' : 'none');
			this.picker.find('tfoot .clear')
				.text(cleartxt)
				.css('display', this.o.clearBtn === true ? 'table-cell' : 'none');
			this.picker.find('thead .datepicker-title')
				.text(this.o.title)
				.css('display', typeof this.o.title === 'string' && this.o.title !== '' ? 'table-cell' : 'none');
			this.updateNavArrows();

			if (!(d instanceof edtf.Year)) {
				this.fillMonths();
				this.toggleDowHeader(specifiedMonth);
				var prevMonth = UTCDate(year, month, 0),
					day = prevMonth.getUTCDate();
				prevMonth.approximate.value = d.approximate.value;
				prevMonth.uncertain.value = d.uncertain.value;
				prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.o.weekStart + 7) % 7);
				var nextMonth = new edtf.Date(prevMonth);
				if (prevMonth.getUTCFullYear() < 100) {
					nextMonth.setUTCFullYear(prevMonth.getUTCFullYear());
				}
				nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
				nextMonth = nextMonth.valueOf();
				var html = [];
				var weekDay, clsName;
				if (specifiedMonth) {
					while (prevMonth.valueOf() < nextMonth) {
						weekDay = prevMonth.getUTCDay();
						if (weekDay === this.o.weekStart) {
							html.push('<tr>');
							if (this.o.calendarWeeks) {
								// ISO 8601: First week contains first thursday.
								// ISO also states week starts on Monday, but we can be more abstract here.
								var
									// Start of current week: based on weekstart/current date
									ws = new Date(+prevMonth + (this.o.weekStart - weekDay - 7) % 7 * 864e5),
									// Thursday of this week
									th = new Date(Number(ws) + (7 + 4 - ws.getUTCDay()) % 7 * 864e5),
									// First Thursday of year, year from thursday
									yth = new Date(Number(yth = UTCDate(th.getUTCFullYear(), 0, 1)) + (7 + 4 - yth.getUTCDay()) % 7 * 864e5),
									// Calendar week: ms between thursdays, div ms per day, div 7 days
									calWeek = (th - yth) / 864e5 / 7 + 1;
								html.push('<td class="cw">' + calWeek + '</td>');
							}
						}
						prevMonth.precision = 3;
						clsName = this.getClassNames(prevMonth);
						clsName.push('day');

						var content = prevMonth.getUTCDate();

						if (this.o.beforeShowDay !== $.noop) {
							before = this.o.beforeShowDay(this._utc_to_local(prevMonth));
							if (before === undefined)
								before = {};
							else if (typeof before === 'boolean')
								before = { enabled: before };
							else if (typeof before === 'string')
								before = { classes: before };
							if (before.enabled === false)
								clsName.push('disabled');
							if (before.classes)
								clsName = clsName.concat(before.classes.split(/\s+/));
							if (before.tooltip)
								tooltip = before.tooltip;
							if (before.content)
								content = before.content;
						}

						//Check if uniqueSort exists (supported by jquery >=1.12 and >=2.2)
						//Fallback to unique function for older jquery versions
						if ($.isFunction($.uniqueSort)) {
							clsName = $.uniqueSort(clsName);
						} else {
							clsName = $.unique(clsName);
						}

						html.push('<td class="' + clsName.join(' ') + '"' + (tooltip ? ' title="' + tooltip + '"' : '') + ' data-date="' + edtf(prevMonth).edtf + '">' + content + '</td>');
						tooltip = null;
						if (weekDay === this.o.weekEnd) {
							html.push('</tr>');
						}
						prevMonth.setUTCDate(prevMonth.getUTCDate() + 1);
					}
				} else {
					var dateCpy = edtf(d);
					dateCpy.precision = 2;
					for (var dayIndex = 0; dayIndex < (month === 1 ? 29 : 31); dayIndex++) {
						if (dayIndex % 7 === 0) {
							html.push('<tr>');
						}

						html.push('<td class="day"' + (tooltip ? ' title="' + tooltip + '"' : '') + ' data-date="' + dateCpy.edtf + '-' + ('00' + (dayIndex + 1)).slice(-2) + '">' + (dayIndex + 1) + '</td>');
						tooltip = null;
						if (dayIndex % 7 === 6) {
							html.push('</tr>');
						}
					}
				}

				this.picker.find('.datepicker-days tbody:first').html(html.join(''));

				var months = this.picker.find('.datepicker-months')
					.find('tbody span').removeClass('active');

				$.each(this.dates, function (i, d) {
					if (d.year === year && d.precision > 1 && !d.unspecified.is('month'))
						months.eq(d.month).addClass('active');
				});

				if (year < startYear || year > endYear) {
					months.addClass('disabled');
				}
				if (year === startYear) {
					months.slice(0, startMonth).addClass('disabled');
				}
				if (year === endYear) {
					months.slice(endMonth + 1).addClass('disabled');
				}

				if (this.o.beforeShowMonth !== $.noop) {
					var that = this;
					$.each(months, function (i, month) {
						var moDate = new Date(year, i, 1);
						var before = that.o.beforeShowMonth(moDate);
						if (before === undefined)
							before = {};
						else if (typeof before === 'boolean')
							before = { enabled: before };
						else if (typeof before === 'string')
							before = { classes: before };
						if (before.enabled === false && !$(month).hasClass('disabled'))
							$(month).addClass('disabled');
						if (before.classes)
							$(month).addClass(before.classes);
						if (before.tooltip)
							$(month).prop('title', before.tooltip);
					});
				}

			}

			// Generating decade/years picker
			this._fill_yearsView(
				'.datepicker-years',
				'year',
				10,
				year,
				startYear,
				endYear,
				this.o.beforeShowYear
			);
			
			if (d instanceof edtf.Date && !d.unspecified.value) {
				this._fill_status_table('.datepicker-days', d);
				this._fill_status_table('.datepicker-months', d);
				this._fill_status_table('.datepicker-years', d);	
			} else {
				this.picker.find('tfoot .statuses').html('');
			}

			// Generating century/decades picker
			this._fill_yearsView(
				'.datepicker-decades',
				'decade',
				100,
				year,
				startYear,
				endYear,
				this.o.beforeShowDecade
			);
			// Generating millennium/centuries picker
			this._fill_yearsView(
				'.datepicker-centuries',
				'century',
				1000,
				year,
				startYear,
				endYear,
				this.o.beforeShowCentury
			);

			this._fill_unspecified_cells('.datepicker-days', d);
			this._fill_unspecified_cells('.datepicker-months', d);
			this._fill_unspecified_cells('.datepicker-years', d);
			this._fill_unspecified_cells('.datepicker-decades', d);
			this._fill_unspecified_cells('.datepicker-centuries', d);

		},

		updateNavArrows: function () {
			if (!this._allow_update)
				return;

			var d = this.viewDate,
				year = d.year,
				month = d.month,
				startYear = this.o.startDate !== -Infinity ? this.o.startDate.getUTCFullYear() : -Infinity,
				startMonth = this.o.startDate !== -Infinity ? this.o.startDate.getUTCMonth() : -Infinity,
				endYear = this.o.endDate !== Infinity ? this.o.endDate.getUTCFullYear() : Infinity,
				endMonth = this.o.endDate !== Infinity ? this.o.endDate.getUTCMonth() : Infinity,
				prevIsDisabled,
				nextIsDisabled,
				unspecifiedMonth = d instanceof edtf.Date && (d.unspecified.is('year') || d.unspecified.is('month')),
				factor = 1;
			switch (this.viewMode) {
				case 4:
					factor *= 10;
				/* falls through */
				case 3:
					factor *= 10;
				/* falls through */
				case 2:
					factor *= 10;
				/* falls through */
				case 1:
					prevIsDisabled = Math.floor(year / factor) * factor <= startYear;
					nextIsDisabled = Math.floor(year / factor) * factor + factor > endYear;
					break;
				case 0:
					prevIsDisabled = (year <= startYear && month <= startMonth) || unspecifiedMonth;
					nextIsDisabled = (year >= endYear && month >= endMonth) || unspecifiedMonth;
					break;
			}

			this.picker.find('.prev').toggleClass('disabled', prevIsDisabled);
			this.picker.find('.next').toggleClass('disabled', nextIsDisabled);
		},

		click: function (e) {
			e.preventDefault();
			e.stopPropagation();

			var target, dir, day, year, month;
			target = $(e.target);

			// Clicked on the switch
			if (target.hasClass('datepicker-switch') && this.viewMode !== this.o.maxViewMode) {
				if (this.viewDate instanceof edtf.Year)
					this.viewDate.significant = (this.viewDate.significant || 0) + 1;
				else {
					switch (this.viewMode) {
						case 3:
							this.viewDate.unspecified.value -= this.viewDate.unspecified.is('year');
							this.viewDate.unspecified.add(edtf.Bitmask.Y - 1);
							break;
						case 2:
							this.viewDate.unspecified.value -= this.viewDate.unspecified.is('year');
							this.viewDate.unspecified.add(edtf.Bitmask.YYXX);						
							break;
						case 1:
							this.viewDate.unspecified.value -= this.viewDate.unspecified.is('year');
							this.viewDate.unspecified.add(edtf.Bitmask.YYYX);
							break;
						default:
							this.viewDate.precision = 1;
							break;
					}	
				}
				this._setDate(this.viewDate);
				if (this.viewDate.significant !== 1)
					this.setViewMode(this.viewMode + 1);
			}

			// Clicked on today button
			if (target.hasClass('today') && !target.hasClass('day')) {
				this.setViewMode(0);
				this._setDate(UTCToday(), this.o.todayBtn === 'linked' ? null : 'view');
			}

			// Clicked on clear button
			if (target.hasClass('clear')) {
				this.clearDates();
			}

			if (target.hasClass('dateStatus')) {
				var currentDate = this.dates.get(-1) || this.viewDate,
					type = target.attr('name'),
					name = target.attr('value');
				if (currentDate[type].is(name))
					currentDate[type] = currentDate[type].value - currentDate[type][name];
				else
					currentDate[type].add(name);
				this._setDate(currentDate);
				this.fill();
			}

			if (!target.hasClass('disabled')) {
				// Clicked on a month, year, decade, century
				if (target.hasClass('month')
					|| target.hasClass('year')
					|| target.hasClass('decade')
					|| target.hasClass('century')) {

					if (!(this.viewDate instanceof edtf.Year))
						this.viewDate.setUTCDate(1);

					day = 1;
					if (!target.hasClass('active')
						|| target.hasClass('century')
						|| target.hasClass('decade')
						// allow opening unspecified dates to select a specific one
						|| this.viewDate.significant
						|| (this.viewDate.unspecified && this.viewDate.unspecified.value)) {
						if (this.viewMode === 1) {
							this.viewDate.unspecified.value -= this.viewDate.unspecified.month;
							if (target.hasClass('unspecified')) {
								month = target.text() === '1X' ? 9 : 0;
								this.viewDate.unspecified.add(target.text() === 'XX' ? edtf.Bitmask.M : edtf.Bitmask.MX);
							} else {
								month = target.parent().find('span').index(target);
							}
							year = this.viewDate.getUTCFullYear();
							this.viewDate.setUTCMonth(month);
							this.viewDate.precision = 2;
						} else {
							month = 0;
							var yearText = target.text();
							var sign = '';
							if (yearText.indexOf('-') === 0) {
								sign = '-';
								yearText = yearText.substr('1');
							}
							if (yearText.length > 4) {
								var significance = (yearText.match(/X/g) || []).length;
								this.viewDate = edtf('Y' + sign + yearText.replace(/X/g, '0') + (significance ? 'S' + significance : ''));
							} else {
								this.viewDate = edtf(sign + ('0000' + yearText).slice(-4));
							}
						}
						if (target.hasClass('year'))
							this.viewMode = 2;
						this._trigger(DPGlobal.viewModes[this.viewMode - 1].e, this.viewDate);
					}

					if (this.viewMode === this.o.minViewMode) {
						this._setDate(UTCDate(year, month, day));
					} else {
						if (!(this.viewDate instanceof edtf.Year) || this.viewMode > 2)
							this.setViewMode(this.viewMode - 1);
						this.fill();
					}
				}
			}

			if (this.picker.is(':visible') && this._focused_from) {
				this._focused_from.focus();
			}
			delete this._focused_from;
		},

		dayCellClick: function (e) {
			var $target = $(e.currentTarget);
			var edtfString = $target.data('date');
			var date = edtf(edtfString);

			if (this.o.updateViewDate) {
				var viewDate = edtf(this.viewDate);
				if (date.year !== viewDate.year) {
					this._trigger('changeYear', viewDate);
				}

				if (date.month !== viewDate.month) {
					this._trigger('changeMonth', viewDate);
				}
			}
			this._setDate(date);
		},

		// Clicked on prev or next
		navArrowsClick: function (e) {
			var $target = $(e.currentTarget);
			var dir = $target.hasClass('prev') ? -1 : 1;
			if (this.viewMode !== 0) {
				var factor = 1;
				if (this.viewMode === 1) {
					switch (this.viewDate.unspecified.year) {
						case edtf.Bitmask.YYYX:
							factor = 10;
							break;
						case edtf.Bitmask.YYYX:
							factor = 100;
							break;
						case edtf.Bitmask.Y - 1:
							factor = 1000;
							break;
						default:
							break;
					}
				}
				dir *= DPGlobal.viewModes[this.viewMode].navStep * 12 * factor;
			}
			var newDate = this.moveMonth(this.viewDate, dir);
			switch (this.viewMode) {
				case 2:
					newDate.unspecified.value = edtf.Bitmask.YYYX;
					break;
				case 3:
					newDate.unspecified.value = edtf.Bitmask.YYXX;
					break;
				case 4:
					newDate.unspecified.value = edtf.Bitmask.Y - 1;
					break;
				default:
					newDate.unspecified.value = this.viewDate.unspecified.value;
					break;			
			}
			if (newDate.year > 9999 || newDate.year < -9999)
				newDate = edtf('Y' + newDate.year + (this.viewMode - 1 ? 'S' + (this.viewMode - 1) : ''));
			this.viewDate = newDate;
			this._trigger(DPGlobal.viewModes[this.viewMode].e, this.viewDate);
			this.fill();
		},

		_toggle_multidate: function (date) {
			var ix = this.dates.contains(date);
			if (!date) {
				this.dates.clear();
			}

			if (ix !== -1) {
				if (this.o.multidate === true || this.o.multidate > 1 || this.o.toggleActive) {
					this.dates.remove(ix);
				}
			} else if (this.o.multidate === false) {
				this.dates.clear();
				this.dates.push(date);
			}
			else {
				this.dates.push(date);
			}

			if (typeof this.o.multidate === 'number')
				while (this.dates.length > this.o.multidate)
					this.dates.remove(0);
		},

		_setDate: function (date, which) {
			if (!which || which === 'date')
				this._toggle_multidate(date && edtf(date));
			if ((!which && this.o.updateViewDate) || which === 'view')
				this.viewDate = date && edtf(date);

			this.fill();
			this.setValue();
			if (!which || which !== 'view') {
				this._trigger('changeDate');
			}
			this.inputField.trigger('change');
			if (this.o.autoclose && (!which || which === 'date')) {
				this.hide();
			}
		},

		moveDay: function (date, dir) {
			return date.next(dir);
		},

		moveWeek: function (date, dir) {
			return this.moveDay(date, dir * 7);
		},

		moveMonth: function (date, dir) {
			if (!(date instanceof edtf.Year) && !isValidDate(date))
				return this.o.defaultViewDate;
			if (!dir)
				return date;
			var new_date = new Date(date.valueOf()),
				day = new_date.getUTCDate(),
				month = new_date.getUTCMonth(),
				mag = Math.abs(dir),
				new_month, test;
			dir = dir > 0 ? 1 : -1;
			if (mag === 1) {
				test = dir === -1
					// If going back one month, make sure month is not current month
					// (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
					? function () {
						return new_date.getUTCMonth() === month;
					}
					// If going forward one month, make sure month is as expected
					// (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
					: function () {
						return new_date.getUTCMonth() !== new_month;
					};
				new_month = month + dir;
				new_date.setUTCMonth(new_month);
				// Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
				new_month = (new_month + 12) % 12;
			}
			else {
				// For magnitudes >1, move one month at a time...
				for (var i = 0; i < mag; i++)
					// ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
					new_date = this.moveMonth(new_date, dir);
				// ...then reset the day, keeping it in the new month
				new_month = new_date.getUTCMonth();
				new_date.setUTCDate(day);
				test = function () {
					return new_month !== new_date.getUTCMonth();
				};
			}
			// Common date-resetting loop -- if date is beyond end of month, make it
			// end of month
			while (test()) {
				new_date.setUTCDate(--day);
				new_date.setUTCMonth(new_month);
			}
			return edtf(new_date);
		},

		moveYear: function (date, dir) {
			return this.moveMonth(date, dir * 12);
		},

		moveAvailableDate: function (date, dir, fn) {
			do {
				date = this[fn](date, dir);

				if (!this.dateWithinRange(date))
					return false;

				fn = 'moveDay';
			}
			while (this.dateIsDisabled(date));

			return date;
		},

		weekOfDateIsDisabled: function (date) {
			return $.inArray(date.getUTCDay(), this.o.daysOfWeekDisabled) !== -1;
		},

		dateIsDisabled: function (date) {
			return (
				this.weekOfDateIsDisabled(date) ||
				$.grep(this.o.datesDisabled, function (d) {
					return isUTCEquals(date, d);
				}).length > 0
			);
		},

		dateWithinRange: function (date) {
			return date >= this.o.startDate && date <= this.o.endDate;
		},

		keydown: function (e) {
			if (!this.picker.is(':visible')) {
				if (e.keyCode === 40 || e.keyCode === 27) { // allow down to re-show picker
					this.show();
					e.stopPropagation();
				}
				return;
			}
			var dateChanged = false,
				dir, newViewDate,
				focusDate = this.focusDate || this.viewDate;
			switch (e.keyCode) {
				case 27: // escape
					if (this.focusDate) {
						this.focusDate = null;
						this.viewDate = this.dates.get(-1) || this.viewDate;
						this.fill();
					}
					else
						this.hide();
					e.preventDefault();
					e.stopPropagation();
					break;
				case 13: // enter
					if (!this.o.forceParse)
						break;
					focusDate = this.focusDate || this.dates.get(-1) || this.viewDate;
					if (this.o.keyboardNavigation) {
						this._toggle_multidate(focusDate);
						dateChanged = true;
					}
					this.focusDate = null;
					this.viewDate = this.dates.get(-1) || this.viewDate;
					this.setValue();
					this.fill();
					if (this.picker.is(':visible')) {
						e.preventDefault();
						e.stopPropagation();
						if (this.o.autoclose)
							this.hide();
					}
					break;
				case 9: // tab
					this.focusDate = null;
					this.viewDate = this.dates.get(-1) || this.viewDate;
					this.fill();
					this.hide();
					break;
			}
			if (dateChanged) {
				if (this.dates.length)
					this._trigger('changeDate');
				else
					this._trigger('clearDate');
				this.inputField.trigger('change');
			}
		},

		setViewMode: function (viewMode) {
			this.viewMode = viewMode;
			this.picker
				.children('div')
				.hide()
				.filter('.datepicker-' + DPGlobal.viewModes[this.viewMode].clsName)
				.show();
			this.updateNavArrows();
			this._trigger('changeViewMode', new Date(this.viewDate));
		},

		toggleDowHeader: function (mode) {
			var header = this.picker.find('.dow-header');
			if (mode)
				return header.show();
			return header.hide();
		}
	};

	var DateRangePicker = function (element, options) {
		$.data(element, 'datepicker', this);
		this.element = $(element);
		this.inputs = $.map(options.inputs, function (i) {
			return i.jquery ? i[0] : i;
		});
		delete options.inputs;

		this.keepEmptyValues = options.keepEmptyValues;
		delete options.keepEmptyValues;

		datepickerPlugin.call($(this.inputs), options)
			.on('changeDate', $.proxy(this.dateUpdated, this));

		this.pickers = $.map(this.inputs, function (i) {
			return $.data(i, 'datepicker');
		});
		this.updateDates();
	};
	DateRangePicker.prototype = {
		updateDates: function () {
			this.dates = $.map(this.pickers, function (i) {
				return i.getUTCDate();
			});
			this.updateRanges();
		},
		updateRanges: function () {
			var range = $.map(this.dates, function (d) {
				return d.valueOf();
			});
			$.each(this.pickers, function (i, p) {
				p.setRange(range);
			});
		},
		clearDates: function () {
			$.each(this.pickers, function (i, p) {
				p.clearDates();
			});
		},
		dateUpdated: function (e) {
			// `this.updating` is a workaround for preventing infinite recursion
			// between `changeDate` triggering and `setUTCDate` calling.  Until
			// there is a better mechanism.
			if (this.updating)
				return;
			this.updating = true;

			var dp = $.data(e.target, 'datepicker');

			if (dp === undefined) {
				return;
			}

			var new_date = dp.getUTCDate(),
				keep_empty_values = this.keepEmptyValues,
				i = $.inArray(e.target, this.inputs),
				j = i - 1,
				k = i + 1,
				l = this.inputs.length;
			if (i === -1)
				return;

			$.each(this.pickers, function (i, p) {
				if (!p.getUTCDate() && (p === dp || !keep_empty_values))
					p.setUTCDate(new_date);
			});

			if (new_date < this.dates[j]) {
				// Date being moved earlier/left
				while (j >= 0 && new_date < this.dates[j] && (this.pickers[j].element.val() || "").length > 0) {
					this.pickers[j--].setUTCDate(new_date);
				}
			} else if (new_date > this.dates[k]) {
				// Date being moved later/right
				while (k < l && new_date > this.dates[k] && (this.pickers[k].element.val() || "").length > 0) {
					this.pickers[k++].setUTCDate(new_date);
				}
			}
			this.updateDates();

			delete this.updating;
		},
		destroy: function () {
			$.map(this.pickers, function (p) { p.destroy(); });
			$(this.inputs).off('changeDate', this.dateUpdated);
			delete this.element.data().datepicker;
		},
		remove: alias('destroy', 'Method `remove` is deprecated and will be removed in version 2.0. Use `destroy` instead')
	};

	function opts_from_el(el, prefix) {
		// Derive options from element data-attrs
		var data = $(el).data(),
			out = {}, inkey,
			replace = new RegExp('^' + prefix.toLowerCase() + '([A-Z])');
		prefix = new RegExp('^' + prefix.toLowerCase());
		function re_lower(_, a) {
			return a.toLowerCase();
		}
		for (var key in data)
			if (prefix.test(key)) {
				inkey = key.replace(replace, re_lower);
				out[inkey] = data[key];
			}
		return out;
	}

	function opts_from_locale(lang) {
		// Derive options from locale plugins
		var out = {};
		// Check if "de-DE" style date is available, if not language should
		// fallback to 2 letter code eg "de"
		if (!dates[lang]) {
			lang = lang.split('-')[0];
			if (!dates[lang])
				return;
		}
		var d = dates[lang];
		$.each(locale_opts, function (i, k) {
			if (k in d)
				out[k] = d[k];
		});
		return out;
	}

	var old = $.fn.datepicker;
	var datepickerPlugin = function (option) {
		var args = Array.apply(null, arguments);
		args.shift();
		var internal_return;
		this.each(function () {
			var $this = $(this),
				data = $this.data('datepicker'),
				options = typeof option === 'object' && option;
			if (!data) {
				var elopts = opts_from_el(this, 'date'),
					// Preliminary otions
					xopts = $.extend({}, defaults, elopts, options),
					locopts = opts_from_locale(xopts.language),
					// Options priority: js args, data-attrs, locales, defaults
					opts = $.extend({}, defaults, locopts, elopts, options);
				if ($this.hasClass('input-daterange') || opts.inputs) {
					$.extend(opts, {
						inputs: opts.inputs || $this.find('input').toArray()
					});
					data = new DateRangePicker(this, opts);
				}
				else {
					data = new Datepicker(this, opts);
				}
				$this.data('datepicker', data);
			}
			if (typeof option === 'string' && typeof data[option] === 'function') {
				internal_return = data[option].apply(data, args);
			}
		});

		if (
			internal_return === undefined ||
			internal_return instanceof Datepicker ||
			internal_return instanceof DateRangePicker
		)
			return this;

		if (this.length > 1)
			throw new Error('Using only allowed for the collection of a single element (' + option + ' function)');
		else
			return internal_return;
	};
	$.fn.datepicker = datepickerPlugin;

	var defaults = $.fn.datepicker.defaults = {
		assumeNearbyYear: false,
		autoclose: false,
		beforeShowDay: $.noop,
		beforeShowMonth: $.noop,
		beforeShowYear: $.noop,
		beforeShowDecade: $.noop,
		beforeShowCentury: $.noop,
		calendarWeeks: false,
		clearBtn: false,
		toggleActive: false,
		daysOfWeekDisabled: [],
		daysOfWeekHighlighted: [],
		datesDisabled: [],
		endDate: Infinity,
		forceParse: true,
		isInline: null,
		keepEmptyValues: false,
		keyboardNavigation: true,
		language: 'en',
		minViewMode: 0,
		maxViewMode: 4,
		multidate: false,
		multidateSeparator: ',',
		orientation: "auto",
		rtl: false,
		startDate: -Infinity,
		startView: 0,
		todayBtn: false,
		todayHighlight: false,
		updateViewDate: true,
		weekStart: 0,
		disableTouchKeyboard: false,
		enableOnReadonly: true,
		showOnFocus: true,
		zIndexOffset: 10,
		container: 'body',
		immediateUpdates: true,
		title: '',
		templates: {
			leftArrow: '&#x00AB;',
			rightArrow: '&#x00BB;'
		},
		showWeekDays: true
	};
	var locale_opts = $.fn.datepicker.locale_opts = [
		'format',
		'rtl',
		'weekStart'
	];
	$.fn.datepicker.Constructor = Datepicker;
	var dates = $.fn.datepicker.dates = {
		en: {
			days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
			daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
			daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
			months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
			monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
			today: "Today",
			clear: "Clear",
			titleFormat: "MM yyyy",
			approximate: "Approximate",
			uncertain: "Uncertain",
			day: "Day",
			month: "Month",
			year: "Year"
		}
	};

	var DPGlobal = {
		viewModes: [
			{
				names: ['days', 'month'],
				clsName: 'days',
				e: 'changeMonth'
			},
			{
				names: ['months', 'year'],
				clsName: 'months',
				e: 'changeYear',
				navStep: 1
			},
			{
				names: ['years', 'decade'],
				clsName: 'years',
				e: 'changeDecade',
				navStep: 10
			},
			{
				names: ['decades', 'century'],
				clsName: 'decades',
				e: 'changeCentury',
				navStep: 100
			},
			{
				names: ['centuries', 'millennium'],
				clsName: 'centuries',
				e: 'changeMillennium',
				navStep: 1000
			}
		],
		validParts: /dd?|DD?|mm?|MM?|yy(?:yy)?/g,
		nonpunctuation: /[^ -\/:-@\u5e74\u6708\u65e5\[-`{-~\t\n\r]+/g,
		parseFormat: function (format) {
			if (typeof format.toValue === 'function' && typeof format.toDisplay === 'function')
				return format;
			// IE treats \0 as a string end in inputs (truncating the value),
			// so it's a bad format delimiter, anyway
			var separators = format.replace(this.validParts, '\0').split('\0'),
				parts = format.match(this.validParts);
			if (!separators || !separators.length || !parts || parts.length === 0) {
				throw new Error("Invalid date format.");
			}
			return { separators: separators, parts: parts };
		},
		parseDate: function (date) {
			if (!date)
				return undefined;
			if (date instanceof edtf.Date)
				return date;
			try {
				return edtf(date);
			} catch (error) {
				if (error.message.startsWith('edtf: No possible parsings (@EOS)'))
					return undefined;
				throw error;
			}
		},
		formatDate: function (date, format, language) {
			if (!date)
				return '';
			if (typeof format === 'string')
				format = DPGlobal.parseFormat(format);
			if (!format)
				return date.edtf;
			if (format.toDisplay)
				return format.toDisplay(date, format, language);
			var val = {
				d: date.getUTCDate(),
				D: dates[language].daysShort[date.getUTCDay()],
				DD: dates[language].days[date.getUTCDay()],
				m: date.getUTCMonth() + 1,
				M: dates[language].monthsShort[date.getUTCMonth()],
				MM: dates[language].months[date.getUTCMonth()],
				yy: date.getUTCFullYear().toString().substring(2),
				yyyy: date.getUTCFullYear()
			};
			val.dd = (val.d < 10 ? '0' : '') + val.d;
			val.mm = (val.m < 10 ? '0' : '') + val.m;
			date = [];
			var seps = $.extend([], format.separators);
			for (var i = 0, cnt = format.parts.length; i <= cnt; i++) {
				if (seps.length)
					date.push(seps.shift());
				date.push(val[format.parts[i]]);
			}
			return date.join('');
		},
		headTemplate: '<thead>' +
			'<tr>' +
			'<th colspan="7" class="datepicker-title"></th>' +
			'</tr>' +
			'<tr>' +
			'<th class="prev">' + defaults.templates.leftArrow + '</th>' +
			'<th colspan="5" class="datepicker-switch"></th>' +
			'<th class="next">' + defaults.templates.rightArrow + '</th>' +
			'</tr>' +
			'</thead>',
		contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
		footTemplate: '<tfoot>' +
			'<tr class="unspecified-cells">' +
			'</tr>' +
			'<tr>' +
			'<th colspan="7" class="statuses"></th>' +
			'</tr>' +
			'<tr>' +
			'<th colspan="7" class="today"></th>' +
			'</tr>' +
			'<tr>' +
			'<th colspan="7" class="clear"></th>' +
			'</tr>' +
			'</tfoot>'
	};
	DPGlobal.template = '<div class="datepicker">' +
		'<div class="datepicker-days">' +
		'<table class="table-condensed">' +
		DPGlobal.headTemplate +
		'<tbody></tbody>' +
		DPGlobal.footTemplate +
		'</table>' +
		'</div>' +
		'<div class="datepicker-months">' +
		'<table class="table-condensed">' +
		DPGlobal.headTemplate +
		DPGlobal.contTemplate +
		DPGlobal.footTemplate +
		'</table>' +
		'</div>' +
		'<div class="datepicker-years">' +
		'<table class="table-condensed">' +
		DPGlobal.headTemplate +
		DPGlobal.contTemplate +
		DPGlobal.footTemplate +
		'</table>' +
		'</div>' +
		'<div class="datepicker-decades">' +
		'<table class="table-condensed">' +
		DPGlobal.headTemplate +
		DPGlobal.contTemplate +
		DPGlobal.footTemplate +
		'</table>' +
		'</div>' +
		'<div class="datepicker-centuries">' +
		'<table class="table-condensed">' +
		DPGlobal.headTemplate +
		DPGlobal.contTemplate +
		DPGlobal.footTemplate +
		'</table>' +
		'</div>' +
		'</div>';

	$.fn.datepicker.DPGlobal = DPGlobal;


	/* DATEPICKER NO CONFLICT
	* =================== */

	$.fn.datepicker.noConflict = function () {
		$.fn.datepicker = old;
		return this;
	};

	/* DATEPICKER VERSION
	 * =================== */
	$.fn.datepicker.version = '1.0.0';

	$.fn.datepicker.deprecated = function (msg) {
		var console = window.console;
		if (console && console.warn) {
			console.warn('DEPRECATED: ' + msg);
		}
	};


	/* DATEPICKER DATA-API
	* ================== */

	$(document).on(
		'focus.datepicker.data-api click.datepicker.data-api',
		'[data-provide="datepicker"]',
		function (e) {
			var $this = $(this);
			if ($this.data('datepicker'))
				return;
			e.preventDefault();
			// component click requires us to explicitly show it
			datepickerPlugin.call($this, 'show');
		}
	);
	$(function () {
		datepickerPlugin.call($('[data-provide="datepicker-inline"]'));
	});

}));
