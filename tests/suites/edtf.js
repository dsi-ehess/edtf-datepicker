module('EDTF format', {
    setup: function(){
        this.fieldset = $('<fieldset>' +
                                '<div class="input-append date" id="datepicker">'+
                                    '<input size="16" type="text" value="2012-02-12" readonly>'+
                                    '<span class="add-on"><i class="icon-th"></i></span>'+
                                '</div>' +
                            '<fieldset>')
                        .appendTo('#qunit-fixture');

        this.component = this.fieldset.find('.input-append')
                            .datepicker();
        this.input = this.component.find('input');
        this.addon = this.component.find('.add-on');
        this.dp = this.component.data('datepicker');
        this.picker = this.dp.picker;
    },
    teardown: function(){
        this.picker.remove();
    }
});

test('Input qualifiers', function(){
    this.input.val('2012-?03-~13');
    this.dp.update();
    equal(this.dp.dates.length, 1);
    datesEqual(this.dp.dates[0], edtf('2012-?03-~13'));

    var date = this.dp.picker.find('.datepicker-days td:contains(13)');
    ok(date.hasClass('active'), 'Date is selected');

    var checkbox = this.picker.find('.datepicker-days input[name=approximate][value=day]');
    ok(checkbox.is(':checked'), 'Day is approximate')

    checkbox = this.picker.find('.datepicker-days input[name=uncertain][value=month]');
    ok(checkbox.is(':checked'), 'Month is uncertain')
});

