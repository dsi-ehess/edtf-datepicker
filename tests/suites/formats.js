module('Formats', {
    setup: function(){
        this.input = $('<input type="text">').appendTo('#qunit-fixture');
        this.date = UTCDate(2012, 2, 15, 0, 0, 0, 0); // March 15, 2012
    },
    teardown: function(){
        this.input.data('datepicker').picker.remove();
    }
});

test('d: Day of month, no leading zero.', function(){
    this.input
        .val('2012-03-05')
        .datepicker()
        .datepicker('setValue');
    equal(this.input.val().split('-')[2], '05');
});

test('yyyy: Year, four-digit.', function(){
    this.input
        .val('2012-03-05')
        .datepicker()
        .datepicker('setValue');
    equal(this.input.val().split('-')[0], '2012');
});

test('dd-mm-yyyy: Leap day', function(){
    this.input
        .val('2012-02-29')
        .datepicker()
        .datepicker('setValue');
    equal(this.input.val(), '2012-02-29');
});

test('yyyy-mm-dd: Alternative format', function(){
    this.input
        .val('2012-02-12')
        .datepicker()
        .datepicker('setValue');
    equal(this.input.val(), '2012-02-12');
});

test('Regression: End-of-month bug', patch_date(function(Date){
    Date.now = function(){
        return UTCDate(2012, 4, 31).getTime();
    };
    this.input
        .val('2012-02-29')
        .datepicker()
        .datepicker('setValue');
    equal(this.input.val(), '2012-02-29');
}));
