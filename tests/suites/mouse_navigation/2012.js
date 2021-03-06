module('Mouse Navigation 2012', {
    setup: function(){
        /*
            Tests start with picker on March 31, 2012.  Fun facts:

            * February 1, 2012 was on a Wednesday
            * February 29, 2012 was on a Wednesday
            * March 1, 2012 was on a Thursday
            * March 31, 2012 was on a Saturday
        */
        this.input = $('<input type="text" value="2012-03-31">')
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

test('Selecting date resets viewDate and date', function(){
    var target;

    // Rendered correctly
    equal(this.dp.viewMode, 0);
    target = this.picker.find('.datepicker-days tbody td:nth(7)');
    equal(target.text(), '4'); // Should be Mar 4

    // Updated internally on click
    target.click();
    datesEqual(this.dp.viewDate, edtf('2012-03-04'));
    datesEqual(this.dp.dates.get(-1), edtf('2012-03-04'));

    // Re-rendered on click
    target = this.picker.find('.datepicker-days tbody td:first');
    equal(target.text(), '26'); // Should be Feb 29
});

test('Navigating next/prev by month', function(){
    var target;

    equal(this.dp.viewMode, 0);
    target = this.picker.find('.datepicker-days thead th.prev');
    ok(target.is(':visible'), 'Month:prev nav is visible');

    // Updated internally on click
    target.click();
    // Should handle month-length changes gracefully
    datesEqual(this.dp.viewDate, edtf('2012-02'));
    datesEqual(this.dp.dates.get(-1), edtf('2012-02'));

    // Re-rendered on click
    target = this.picker.find('.datepicker-days tbody td:first');
    equal(target.text(), '29'); // Should be Jan 29

    target = this.picker.find('.datepicker-days thead th.next');
    ok(target.is(':visible'), 'Month:next nav is visible');

    // Updated internally on click
    target.click().click();
    // Graceful moonth-end handling carries over
    datesEqual(this.dp.viewDate, edtf('2012-04'));
    datesEqual(this.dp.dates.get(-1), edtf('2012-04'));

    // Re-rendered on click
    target = this.picker.find('.datepicker-days tbody td:first');
    equal(target.text(), '25'); // Should be Mar 25
    // (includes "old" days at start of month, even if that's all the first week-row consists of)
});

test('Navigating to/from year view', function(){
    var target;

    equal(this.dp.viewMode, 0);
    target = this.picker.find('.datepicker-days thead th.datepicker-switch');
    ok(target.is(':visible'), 'View switcher is visible');

    target.click();
    ok(this.picker.find('.datepicker-months').is(':visible'), 'Month picker is visible');
    equal(this.dp.viewMode, 1);
    // Not modified when switching modes
    datesEqual(this.dp.viewDate, edtf('2012'));
    datesEqual(this.dp.dates.get(-1), edtf('2012'));

    // Change months to test internal state
    target = this.picker.find('.datepicker-months tbody span:contains(Apr)');
    target.click();
    equal(this.dp.viewMode, 0);
    // Only viewDate modified
    datesEqual(this.dp.viewDate, edtf('2012-04')); // Apr
    datesEqual(this.dp.dates.get(-1), edtf('2012-04'));
});

test('Navigating to/from decade view', function(){
    var target;

    equal(this.dp.viewMode, 0);
    target = this.picker.find('.datepicker-days thead th.datepicker-switch');
    ok(target.is(':visible'), 'View switcher is visible');

    target.click();
    ok(this.picker.find('.datepicker-months').is(':visible'), 'Month picker is visible');
    equal(this.dp.viewMode, 1);
    // Not modified when switching modes
    datesEqual(this.dp.viewDate, edtf('2012'));
    datesEqual(this.dp.dates.get(-1), edtf('2012'));

    target = this.picker.find('.datepicker-months thead th.datepicker-switch');
    ok(target.is(':visible'), 'View switcher is visible');

    target.click();
    ok(this.picker.find('.datepicker-years').is(':visible'), 'Year picker is visible');
    equal(this.dp.viewMode, 2);
    // Not modified when switching modes
    equal(this.dp.viewDate.edtf, '201X');
    equal(this.dp.dates.get(-1).edtf, '201X');

    // Change years to test internal state changes
    target = this.picker.find('.datepicker-years tbody span:contains(2011)');
    target.click();
    equal(this.dp.viewMode, 1);
    // Only viewDate modified
    equal(this.dp.viewDate.edtf, '2011');
    equal(this.dp.dates.get(-1).edtf, '2011');

    target = this.picker.find('.datepicker-months tbody span:contains(Apr)');
    target.click();
    equal(this.dp.viewMode, 0);
    // Only viewDate modified
    equal(this.dp.viewDate.edtf, '2011-04');
    equal(this.dp.dates.get(-1).edtf, '2011-04');
});

test('Navigating prev/next in year view', function(){
    var target;

    equal(this.dp.viewMode, 0);
    target = this.picker.find('.datepicker-days thead th.datepicker-switch');
    ok(target.is(':visible'), 'View switcher is visible');

    target.click();
    ok(this.picker.find('.datepicker-months').is(':visible'), 'Month picker is visible');
    equal(this.dp.viewMode, 1);
    equal(this.picker.find('.datepicker-months thead th.datepicker-switch').text(), '2012');
    // Not modified when switching modes
    equal(this.dp.viewDate.edtf, '2012');
    equal(this.dp.dates.get(-1).edtf, '2012');

    // Go to next year (2013)
    target = this.picker.find('.datepicker-months thead th.next');
    target.click();
    equal(this.picker.find('.datepicker-months thead th.datepicker-switch').text(), '2013');
    // Only viewDate modified
    datesEqual(this.dp.viewDate, edtf('2013'));
    datesEqual(this.dp.dates.get(-1), edtf('2013'));

    // Go to prev year (x2 == 2011)
    target = this.picker.find('.datepicker-months thead th.prev');
    target.click().click();
    equal(this.picker.find('.datepicker-months thead th.datepicker-switch').text(), '2011');
    // Only viewDate modified
    datesEqual(this.dp.viewDate, edtf('2011'));
    datesEqual(this.dp.dates.get(-1), edtf('2011'));
});

test('Navigating prev/next in decade view', function(){
    var target;

    equal(this.dp.viewMode, 0);
    target = this.picker.find('.datepicker-days thead th.datepicker-switch');
    ok(target.is(':visible'), 'View switcher is visible');

    target.click();
    ok(this.picker.find('.datepicker-months').is(':visible'), 'Month picker is visible');
    equal(this.dp.viewMode, 1);
    // Not modified when switching modes
    equal(this.dp.viewDate.edtf, '2012');
    equal(this.dp.dates.get(-1).edtf, '2012');

    target = this.picker.find('.datepicker-months thead th.datepicker-switch');
    ok(target.is(':visible'), 'View switcher is visible');

    target.click();
    ok(this.picker.find('.datepicker-years').is(':visible'), 'Year picker is visible');
    equal(this.dp.viewMode, 2);
    equal(this.picker.find('.datepicker-years thead th.datepicker-switch').text(), '201X');
    // Not modified when switching modes
    equal(this.dp.viewDate.edtf, '201X');
    equal(this.dp.dates.get(-1).edtf, '201X');

    // Go to next decade (2020-29)
    target = this.picker.find('.datepicker-years thead th.next');
    target.click();
    equal(this.picker.find('.datepicker-years thead th.datepicker-switch').text(), '202X');
    // Only viewDate modified
    equal(this.dp.viewDate.edtf, '202X');
    equal(this.dp.dates.get(-1).edtf, '202X');

    // Go to prev year (x2 == 2000-09)
    target = this.picker.find('.datepicker-years thead th.prev');
    target.click().click();
    equal(this.picker.find('.datepicker-years thead th.datepicker-switch').text(), '200X');
    // Only viewDate modified
    equal(this.dp.viewDate.edtf, '200X');
    equal(this.dp.dates.get(-1).edtf, '200X');
});

test('Selecting date from previous month resets viewDate and date, changing month displayed', function(){
    var target;

    // Rendered correctly
    equal(this.dp.viewMode, 0);
    target = this.picker.find('.datepicker-days tbody td:first');
    equal(target.text(), '26'); // Should be Feb 26
    equal(this.picker.find('.datepicker-days thead th.datepicker-switch').text(), '2012-03');

    // Updated internally on click
    target.click();
    equal(this.picker.find('.datepicker-days thead th.datepicker-switch').text(), '2012-02');
    datesEqual(this.dp.viewDate, edtf('2012-02-26'));
    datesEqual(this.dp.dates.get(-1), edtf('2012-02-26'));

    // Re-rendered on click
    target = this.picker.find('.datepicker-days tbody td:first');
    equal(target.text(), '29'); // Should be Jan 29
});

test('Selecting date from next month resets viewDate and date, changing month displayed', function(){
    var target;

    this.input.val('2012-04-01');
    this.dp.update();

    // Rendered correctly
    equal(this.dp.viewMode, 0);
    target = this.picker.find('.datepicker-days tbody:first td:last');
    equal(target.text(), '5'); // Should be May 5
    equal(this.picker.find('.datepicker-days thead th.datepicker-switch').text(), '2012-04');

    // Updated internally on click
    target.click();
    equal(this.picker.find('.datepicker-days thead th.datepicker-switch').text(), '2012-05');
    datesEqual(this.dp.viewDate, edtf('2012-05-05'));
    datesEqual(this.dp.dates.get(-1), edtf('2012-05-05'));

    // Re-rendered on click
    target = this.picker.find('.datepicker-days tbody td:first');
    equal(target.text(), '29'); // Should be Apr 29
});

test('Selecting today from next month', patch_date(function(Date){
    Date.now = function(){
        return new Date(2012, 2, 3).getTime(); // Mar 3
    };
    var target;
    this.dp.o.todayHighlight = true;
    this.input.val('2012-02-01');    // Feb 1
    this.dp.update();

    // Click the today button
    target = this.picker.find('.datepicker-days tbody td.today');
    equal(target.text(), '3'); // Should be Mar 3
    target.click();

    datesEqual(this.dp.viewDate, edtf('2012-03-03'));
}));
