document.addEventListener("DOMContentLoaded", function() {
      const closeBtn = document.getElementById('close-btn');
      const bar = document.getElementById('emergency-bar');
      if (closeBtn && bar) {
        closeBtn.addEventListener('click', function() {
          bar.style.display = 'none';
        });
      }
    });