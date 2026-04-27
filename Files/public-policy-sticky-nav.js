$(document).ready(function () {
  const stickyNav = document.querySelector('.sticky-nav');
  const stickySections = document.querySelectorAll('.sticky-section');
  const navLinks = document.querySelectorAll('ul.sticky-nav li.nav-link a');
  const navHeight = stickyNav?.offsetHeight || 0;
  const extraOffset = 50; // Adjust scroll offset
  const totalOffset = navHeight + extraOffset;

  // Smooth scroll on click
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetEl = document.querySelector(targetId);

      if (targetEl) {
        const targetY = targetEl.getBoundingClientRect().top + window.scrollY - totalOffset;

        window.scrollTo({
          top: targetY,
          behavior: 'smooth'
        });
      }
    });
  });

  // Scroll-based sticky nav and active section logic
  if (stickyNav && stickySections.length > 0) {
    const firstSection = stickySections[0];
    const lastSection = stickySections[stickySections.length - 1];

    const startY = firstSection.offsetTop;
    const endY = lastSection.offsetTop + lastSection.offsetHeight;

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const windowBottom = scrollY + window.innerHeight;
      const pageHeight = document.documentElement.scrollHeight;

      // Sticky class toggle
      if (scrollY >= startY && scrollY < endY) {
        stickyNav.classList.add('fixed');
      } else {
        stickyNav.classList.remove('fixed');
      }

      let currentSectionId = null;

      for (let i = 0; i < stickySections.length; i++) {
        const section = stickySections[i];
        const sectionTop = section.offsetTop - totalOffset;
        const nextSection = stickySections[i + 1];
        const nextSectionTop = nextSection
          ? nextSection.offsetTop - totalOffset
          : Infinity;

        // Normal active range
        if (scrollY >= sectionTop && scrollY < nextSectionTop) {
          currentSectionId = section.getAttribute('id');
          break;
        }

        // Special case: at bottom of page, mark last section active
        if (i === stickySections.length - 1 && windowBottom >= pageHeight - 2) {
          currentSectionId = section.getAttribute('id');
        }
      }

      if (currentSectionId) {
        $('.sticky-nav .nav-link').removeClass('active');
        $(`.sticky-nav .nav-link a[href="#${currentSectionId}"]`)
          .closest('.nav-link')
          .addClass('active');
      }
    });
  }

$(".acc").each(function () {
  var $acc = $(this);
  var $boxes = $acc.find(".accBox");
  var $contents = $acc.find(".accContent");
  var $imageWrap = $acc.find(".accWrapImage"); // assumes it's inside .acc too

  // Initially hide all content
  $contents.hide();

  //Activate first item on load
  var $firstBox = $boxes.first();
  var $firstContent = $firstBox.next(".accContent");
  var firstImg = $firstBox.data("img");

  //$firstBox.addClass("active");
  //$firstContent.slideDown(0); // no animation

  if (firstImg && $imageWrap.length) {
    $imageWrap.css("background-image", "url(" + firstImg + ")");
  }

  // Click handler
  $boxes.click(function () {
    var $this = $(this);
    var imgUrl = $this.data("img");

    // Collapse all in this group only
    $contents.slideUp("fast");
    $boxes.removeClass("active");

    // Toggle current item
    if ($this.next().is(":hidden")) {
      $this.next().slideDown("normal");
      $this.addClass("active");
    }

    // Update image if needed
    if (imgUrl && $imageWrap.length) {
      $imageWrap.css("background-image", "url(" + imgUrl + ")");
    }
  });
});

});