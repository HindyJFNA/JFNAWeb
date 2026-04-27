// move the filter form to the sidebar
$(function()
{
/*
$('form.career-center')
  .wrap('<section class="row"></section>')
  .appendTo('.page-main > .shell > .row .section-template-items');
*/
$('form.career-center')
  .appendTo('.page-main > .shell > .row .section-template-items')
.wrap('<div class="shell"><section class="row"></section></div>');

let $categorySelect = $('select.chzn-done');

$categorySelect.removeClass('chzn-done');

$categorySelect.chosen({
                disable_search: ($categorySelect.data('enable-search') != 'yes'),
                width: "100%"
            });
});




setTimeout(function() {
  $('form.career-center').on('submit', function(e) {
    e.preventDefault();

    const url = $(this).attr('action') + '?' + $(this).serialize();

    $('.positions').load(url + ' .positions');
  });
}, 500);