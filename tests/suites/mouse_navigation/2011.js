module('Mouse Navigation 2011', {
    setup: function(){
        /*
            Tests start with picker on March 31, 2011.
        */
        this.input = $('<input type="text" value="2011-03-31">')
                        .appendTo('#qunit-fixture')
                        .datepicker()
                        .focus(); // Activate for visibility checks
        this.dp = this.input.data('datepicker');
        this.picker = this.dp.picker;
    },
    teardown: function(){
        this.picker.remove();
    }
});

test('Selecting date from previous month while in January changes month and year displayed', function(){
    var target;

    this.input.val('2011-01-01');
    this.dp.update();
    datesEqual(this.dp.viewDate, edtf('2011-01-01'));
    datesEqual(this.dp.dates.get(-1), edtf('2011-01-01'));

    // Rendered correctly
    equal(this.dp.viewMode, 0);
    target = this.picker.find('.datepicker-days tbody td:first');
    equal(target.text(), '26'); // Should be Dec 26
    equal(this.picker.find('.datepicker-days thead th.datepicker-switch').text(), '2011-01');

    // Updated internally on click
    target.click();
    equal(this.picker.find('.datepicker-days thead th.datepicker-switch').text(), '2010-12');
    datesEqual(this.dp.viewDate, edtf('2010-12-26'));
    datesEqual(this.dp.dates.get(-1), edtf('2010-12-26'));

    // Re-rendered on click
    target = this.picker.find('.datepicker-days tbody td:first');
    equal(target.text(), '28'); // Should be Nov 28
});

test('Selecting date from next month while in December changes month and year displayed', function(){
    var target;

    this.input.val('2010-12-01');
    this.dp.update();
    datesEqual(this.dp.viewDate, edtf('2010-12-01'));
    datesEqual(this.dp.dates.get(-1), edtf('2010-12-01'));

    // Rendered correctly
    equal(this.dp.viewMode, 0);
    target = this.picker.find('.datepicker-days tbody:first td:last');
    equal(target.text(), '8'); // Should be Jan 8
    equal(this.picker.find('.datepicker-days thead th.datepicker-switch').text(), '2010-12');

    // Updated internally on click
    target.click();
    equal(this.picker.find('.datepicker-days thead th.datepicker-switch').text(), '2011-01');
    datesEqual(this.dp.viewDate, edtf('2011-01-08'));
    datesEqual(this.dp.dates.get(-1), edtf('2011-01-08'));

    // Re-rendered on click
    target = this.picker.find('.datepicker-days tbody td:first');
    equal(target.text(), '26'); // Should be Dec 26
});
