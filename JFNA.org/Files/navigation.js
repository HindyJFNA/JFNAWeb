// wait for page to load before executing
window.addEventListener('load', function () {

  const toggleButton = document.querySelector('.navbar__toggle .hamburger');
  const toggleBar = document.querySelector('.navbar__toggle');
  const toggleBack = document.querySelector('.navbar__toggle .back-button');
  const navMenu = document.querySelector('.nav-menu');

  toggleButton.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    toggleBar.classList.toggle('open-menu');
    toggleBack.classList.remove('visible');
    document.querySelectorAll('.has-dropdown').forEach(dropdown => {
        dropdown.classList.remove('open');
      });

    // Body scroll lock toggle
    if (navMenu.classList.contains('open')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  // Optional: toggle dropdowns individually on mobile
  document.querySelectorAll('.has-dropdown > a').forEach(link => {
    link.addEventListener('click', e => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        link.parentElement.classList.toggle('open');
        toggleBack.classList.add('visible');
      }
    });
  });

  if (toggleBack) {
    toggleBack.addEventListener('click', e => {
      document.querySelectorAll('.has-dropdown').forEach(dropdown => {
        dropdown.classList.remove('open');
      });

      toggleBack.classList.remove('visible');
    });
  }

  // Set active nav link
  if (window.location.href.includes("work")) {
    document.getElementById("work-link").classList.add("active");
  }
  if (window.location.href.includes("about")) {
    document.getElementById("about-link").classList.add("active");
  }
  if (window.location.href.includes("contact")) {
    document.getElementById("contact-link").classList.add("active");
  }
  if (window.location.href.includes("involved")) {
    document.getElementById("involved-link").classList.add("active");
  }



  document.querySelector('.search-toggle').addEventListener('click', () => {
    document.querySelector('.search-container').classList.toggle('active');
  });

});