document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.col-2').forEach(col2 => {
    const col5Heading = col2.parentElement.querySelector('.col-5 h2');
    if (col5Heading) {
      col5Heading.insertAdjacentElement('afterend', col2);
    }
  });

document.querySelector('.widget h4').innerHTML = 'Popular topics';

const trigger = document.querySelector('.widget h4');
    const list = document.getElementById('list_tags');

    trigger.addEventListener('click', function () {
      trigger.classList.toggle('active');
      list.classList.toggle('expanded');
    });
});




///// EVENTS JS TO MOVE THE NAV

document.addEventListener('DOMContentLoaded', function () {
  const tabsNav = document.querySelector('.tabs-nav');
  const dateSlider = document.querySelector('.date-slider');

  if (tabsNav && dateSlider) {
    dateSlider.insertAdjacentElement('afterend', tabsNav);
  }
});




