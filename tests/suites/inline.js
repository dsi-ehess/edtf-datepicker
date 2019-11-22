module('Inline', {
    setup: function(){
        this.component = $('<div data-date="2012-02-12"></div>')
                        .appendTo('#qunit-fixture')
                        .datepicker();
        this.dp = this.component.data('datepicker');
        this.picker = this.dp.picker;
    },
    teardown: function(){
        this.picker.remove();
    }
});


test('Picker gets date/viewDate from data-date attr', function(){
    datesEqual(this.dp.dates[0], edtf("2012-02-12"));
    datesEqual(this.dp.viewDate, edtf("2012-02-12"));
});


test('Visible after init', function(){
    ok(this.picker.is(':visible'));
});

test('update', function(){
    this.dp.update('2012-03-13');
    datesEqual(this.dp.dates[0], edtf("2012-03-13"));
});
